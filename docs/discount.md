# Discount Feature

---

## Overview

The discount feature allows shop owners to create, manage, and apply promotional codes. Codes are scoped per-shop, support fixed-amount or percentage types, and can target all products or a specific subset. The `getDiscountAmount` endpoint is also called internally by `checkout.service` during order review.

---

## Architecture & Data Flow

### Request Flow

```
HTTP Request
  │
  ▼
routes/discount/index.js
  │  Public  (no JWT): POST /amount, GET /list_product_code
  │  Protected (authenticationV2): POST /, GET /
  ▼
controllers/discount.controller.js
  │  Extracts req.body / req.query
  │  Injects shopId = req.user.userId (protected routes only)
  ▼
services/discount.service.js  (DiscountService — all static methods)
  │  Business logic: validation, calculation, DB writes
  ▼
models/repositories/discount.repo.js
  │  Raw Mongoose queries (findAll, checkExists)
  ▼
MongoDB (discounts collection)
       +
models/repositories/product.repo.js   ← used by getAllDiscountCodesWithProduct
```

### Create Discount Code Flow

```
POST /v1/api/discount/
Body: { code, name, description, type, value, max_value, min_order_value,
        start_date, end_date, max_uses, max_uses_per_user, applies_to, product_ids, is_active }

1. Validate dates: now < start_date, start_date < end_date
2. findOne({ discount_code: code, discount_shopId: shopId })
   → if found AND active → BadRequestError('Discount exists')
3. discount.create({ all mapped fields })
4. Return new discount document
```

### Get Applicable Products Flow

```
GET /v1/api/discount/list_product_code?code=&shopId=&limit=&page=

1. findOne({ discount_code, discount_shopId }) → NotFoundError if not found or inactive
2. if applies_to === 'all':
     findAllProducts({ filter: { product_shop: shopId, isPublished: true }, select: ['product_name'] })
   if applies_to === 'specific':
     findAllProducts({ filter: { _id: { $in: discount_product_ids }, isPublished: true }, select: ['product_name'] })
3. Return product list
```

### Get Discount Amount Flow (also called by checkout.service)

```
POST /v1/api/discount/amount
Body: { codeId, userId, shopId, products: [{ quantity, price }] }

1. checkDiscountExists({ discount_code: codeId, discount_shopId: shopId })
   → NotFoundError if missing
2. Validate: discount_is_active, discount_max_uses > 0
3. [DATE CHECK COMMENTED OUT — see Issues]
4. If discount_min_order_value > 0:
     totalOrder = sum(product.quantity * product.price)
     if totalOrder < discount_min_order_value → NotFoundError
5. If discount_max_uses_per_user > 0:
     find userId in discount_users_used
     [ENFORCEMENT TODO — see Issues]
6. Calculate amount:
     fixed_amount → amount = discount_value
     percentage   → amount = totalOrder * (discount_value / 100)
7. Return { totalOrder, discount: amount, totalPrice: totalOrder - amount }
```

### Cancel Discount Code Flow

```
(Internal / not yet exposed as a route)

1. checkDiscountExists → NotFoundError if missing
2. findByIdAndUpdate:
     $pull: { discount_users_used: userId }
     $inc:  { discount_max_uses: +1, discount_uses_count: -1 }
```

---

## Data Model

### Discount (`discounts` collection)

| Field | Type | Notes |
|-------|------|-------|
| `discount_code` | String | code string, e.g. `SUMMER20` |
| `discount_name` | String | display name |
| `discount_description` | String | |
| `discount_type` | String | `'fixed_amount'` (default) or `'percentage'` |
| `discount_value` | Number | amount or percent |
| `discount_max_value` | Number | **not in schema** — saved in payload but silently dropped by Mongoose |
| `discount_start_date` | Date | |
| `discount_end_date` | Date | |
| `discount_max_uses` | Number | total uses remaining |
| `discount_uses_count` | Number | total uses so far |
| `discount_users_used` | Array | list of users who applied this code |
| `discount_max_uses_per_user` | Number | |
| `discount_min_order_value` | Number | minimum cart value to apply |
| `discount_shopId` | ObjectId | ref → Shop |
| `discount_is_active` | Boolean | default `true` |
| `discount_applies_to` | String | `'all'` or `'specific'` |
| `discount_product_ids` | Array | populated only when `applies_to === 'specific'` |

---

## Design Patterns Used

### 1. Static Service Class
`DiscountService` uses all-static methods — no instance needed. Consistent with `AccessService` and other services in the codebase. All business logic is grouped by domain.

### 2. Repository Pattern
All Mongoose calls go through `discount.repo.js`. The service never calls the model directly for reads — it always uses `checkDiscountExists` or `findAllDiscountCodesUnSelect`. This isolates query logic from business logic.

### 3. Shared Generic Repo Functions
`findAllDiscountCodesUnSelect` and `findAllDiscountCodesSelect` accept a `model` parameter — they are reusable across any collection. The same pattern is mirrored in `product.repo.js` (`findAllProducts`).

### 4. Atomic MongoDB Operations for State Changes
`cancelDiscountCode` uses `$pull` and `$inc` in a single `findByIdAndUpdate` — both the array removal and counter decrement happen atomically without a read-modify-write cycle.

### 5. `lean()` on All Read Queries
Both repo functions use `.lean()` — plain JS objects are returned, reducing memory and skipping Mongoose document overhead for read-only paths.

### 6. Selective Field Projection
`getAllDiscountCodesByShop` excludes `__v` and `discount_shopId` via `unGetSelectData`. `getAllDiscountCodesWithProduct` selects only `product_name` from the products repo — minimal data over the wire.

---

## Tech Stack & Coding Techniques

| Technique | Where used |
|-----------|-----------|
| Mongoose `findOne().lean()` | `checkDiscountExists`, `getAllDiscountCodesWithProduct` |
| Mongoose `$pull` + `$inc` atomic update | `cancelDiscountCode` |
| `convertToObjectIdMongodb` | All queries filtering by `shopId` |
| `unGetSelectData` / `getSelectData` | Field projection in repo functions |
| `Array.reduce` | Order total calculation in `getDiscountAmount` |
| `Array.find` | Per-user usage lookup in `getDiscountAmount` |
| Cross-service call | `checkout.service` calls `DiscountService.getDiscountAmount` directly |

---

## Issues Found

| # | Location | Problem |
|---|----------|---------|
| 1 | `discount.service.js:186` | `deleteDiscountCode` filters on `discount_applies_to: codeId` — should be `discount_code: codeId`. Delete never works. |
| 2 | `discount.service.js:154` | Date range check `(now < start_date \|\| now > end_date)` is **commented out** — expired codes can be applied. |
| 3 | `discount.service.js:167` | `max_uses_per_user` check finds the user but only does `console.log` — enforcement is unimplemented, users can use a code unlimited times. |
| 4 | `discount.service.js:126` | `getDiscountAmount` does **not update** `discount_uses_count`, `discount_max_uses`, or `discount_users_used` after applying. Codes have unlimited effective uses. |
| 5 | `discount.service.js:18` | `uses_count` and `users_used` accepted from client payload on create — a caller can forge usage history or reset counters. Should always be `0` / `[]` on creation. |
| 6 | `discount.service.js:20` | Date validation uses `\|\|` (OR): if only one date is in the past it still throws. Intent is unclear — scheduling a future discount (start_date > now) should be allowed. The OR logic incorrectly rejects valid future discounts. |
| 7 | `discount.model.js` | `discount_max_value` field is **not in schema** — saved in service payload but Mongoose strict mode silently drops it. Cap for percentage discounts is never stored. |
| 8 | `discount.service.js:158` | `totalOrder` is calculated only inside `if (discount_min_order_value > 0)`. When `min_order_value === 0` and type is `'percentage'`, `totalOrder` stays `0` — percentage discount always returns `0`. |
| 9 | `discount.service.js:168` | `discount_users_used` entries are treated as objects `{userId}` in the find check but `cancelDiscountCode` uses `$pull: { discount_users_used: userId }` (plain value). Inconsistent structure — cancel never removes the right entry. |
| 10 | `discount.service.js:89` | `applies_to === 'specific'` query has `product_shop` filter commented out — products from other shops can appear in the list. |
| 11 | `discount.model.js` | No index on `{discount_code, discount_shopId}` — `createDiscountCode`, `getAllDiscountCodesWithProduct`, and `getDiscountAmount` all query this pair on every call. Full collection scan each time. |
| 12 | `discount.controller.js` | `deleteDiscountCode` and `cancelDiscountCode` are implemented in the service but have **no routes or controller handlers** — the features are unreachable. |

---

## Performance & Security Improvements

### Security

- **Never accept `uses_count` / `users_used` from client (Issue #5)** — always initialize server-side:
  ```js
  discount_uses_count: 0,
  discount_users_used: [],
  ```
- **Restore and fix the date check (Issue #2 + #6)** — allow future start dates (scheduled discounts), reject already-expired end dates:
  ```js
  if (new Date(end_date) < new Date()) throw new BadRequestError('End date is in the past');
  if (new Date(start_date) >= new Date(end_date)) throw new BadRequestError('Start date must be before end date');
  ```
- **Enforce `max_uses_per_user` (Issue #3)** — complete the TODO:
  ```js
  const userUsage = discount_users_used.filter(id => id.toString() === userId).length;
  if (userUsage >= discount_max_uses_per_user)
    throw new BadRequestError('You have reached the usage limit for this code');
  ```
- **Record usage after applying discount (Issue #4)** — without this, every code is effectively unlimited:
  ```js
  await discount.findByIdAndUpdate(foundDiscount._id, {
    $inc: { discount_uses_count: 1, discount_max_uses: -1 },
    $addToSet: { discount_users_used: userId }
  });
  ```
- **Fix `applies_to === 'specific'` shop filter (Issue #10)** — re-enable `product_shop` in the query to prevent cross-shop product leakage:
  ```js
  filter: {
    _id: { $in: discount_product_ids },
    product_shop: convertToObjectIdMongodb(shopId),
    isPublished: true
  }
  ```
- **Validate `discount_type` and `discount_value` range** — `percentage` type should reject values outside 0–100; `fixed_amount` should reject negatives.

### Performance

- **Add compound index on `{discount_code, discount_shopId}` (Issue #11)** — this pair is queried in every operation. Without it, each is a full collection scan:
  ```js
  discountSchema.index({ discount_code: 1, discount_shopId: 1 });
  ```
- **Add index on `{discount_shopId, discount_is_active}`** — `getAllDiscountCodesByShop` filters on both fields:
  ```js
  discountSchema.index({ discount_shopId: 1, discount_is_active: 1 });
  ```
- **Cache `checkDiscountExists` in Redis** — this is called on every checkout order review. The result changes rarely (only on create/cancel). Cache with a short TTL, invalidate on write:
  ```js
  const cacheKey = `discount:${shopId}:${codeId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const result = await model.findOne(filter).lean();
  await redis.setEx(cacheKey, 60, JSON.stringify(result));
  // invalidate on create/delete/cancel
  ```
- **Fix `totalOrder` scope bug before optimizing (Issue #8)** — move the reduce outside the `if` block. Percentage discounts currently silently return 0 when `min_order_value === 0`.
- **Use `$addToSet` instead of `$push` for `discount_users_used`** — prevents duplicate userId entries if a race condition hits the same endpoint twice.
- **`discount_users_used` array grows unboundedly** — for high-volume codes this becomes a large document. Consider a separate `discount_usage` collection with `{discountId, userId, usedAt}` and an index on `{discountId, userId}` for per-user lookups.

---

## Optimization Plan

### Phase 1 — Fix Bugs (Critical)

**1. Fix `totalOrder` scope (Issue #8)**
```js
// Move reduce outside the min-value guard
const totalOrder = products.reduce((acc, p) => acc + p.quantity * p.price, 0);

if (discount_min_order_value > 0 && totalOrder < discount_min_order_value)
  throw new BadRequestError(`Minimum order value is ${discount_min_order_value}`);
```

**2. Fix `deleteDiscountCode` filter (Issue #1)**
```js
await discount.findOneAndDelete({
  discount_code: codeId,          // was: discount_applies_to
  discount_shopId: convertToObjectIdMongodb(shopId)
});
```

**3. Record usage after applying discount (Issue #4)**

After the amount calculation, update the discount document atomically:
```js
await discount.findByIdAndUpdate(foundDiscount._id, {
  $inc: { discount_uses_count: 1, discount_max_uses: -1 },
  $addToSet: { discount_users_used: userId }
});
```

**4. Restore date validation + fix `uses_count`/`users_used` from client (Issues #2, #5, #6)**

Fix date logic to allow scheduled discounts. Strip `uses_count` and `users_used` from the create payload.

**5. Fix `discount_users_used` structure inconsistency (Issue #9)**

Pick one format — plain userId strings — and use it everywhere: in `$addToSet`, `$pull`, and the per-user check.

---

### Phase 2 — Schema & Cleanup (Medium priority)

**6. Add `discount_max_value` to schema (Issue #7)**
```js
discount_max_value: { type: Number, default: 0 }
```
This caps the absolute value of a percentage discount (e.g. `20% off but max 50,000`).

**7. Add routes + controller handlers for delete and cancel (Issue #12)**

Both `deleteDiscountCode` and `cancelDiscountCode` exist in the service but are unreachable:
```
DELETE /v1/api/discount/:codeId     → deleteDiscountCode (shop auth required)
POST   /v1/api/discount/cancel      → cancelDiscountCode (user auth required)
```

**8. Add compound indexes**
```js
discountSchema.index({ discount_code: 1, discount_shopId: 1 });
discountSchema.index({ discount_shopId: 1, discount_is_active: 1 });
```

---

### Phase 3 — Enhancements (Lower priority)

**9. Cache `checkDiscountExists` in Redis**

Called on every checkout. Wrap with a 60s TTL cache, invalidated on create/update/delete. No new dependency needed.

**10. Extract `discount_users_used` to a separate collection**

For high-volume discount codes (thousands of users), storing all userIds in an array on the discount document causes document bloat and slow `$pull`/`$addToSet` operations. A separate `discount_usages` collection:
```
{ discountId, userId, usedAt }
index: { discountId: 1, userId: 1 }  (unique)
```
Per-user lookups become a fast indexed query instead of an in-memory array scan.

**11. Add `discount_end_date` TTL index**

Automatically mark or remove expired discounts:
```js
discountSchema.index({ discount_end_date: 1 }, { expireAfterSeconds: 0 });
// or: add a scheduled job that sets discount_is_active: false after end_date
```

**12. Validate `discount_value` by type**
```js
if (type === 'percentage' && (value <= 0 || value > 100))
  throw new BadRequestError('Percentage must be between 1 and 100');
if (type === 'fixed_amount' && value <= 0)
  throw new BadRequestError('Fixed amount must be positive');
```

---

## Files Reference

| File | Role |
|------|------|
| `routes/discount/index.js` | Route definitions, auth boundary |
| `controllers/discount.controller.js` | HTTP layer, delegates to service |
| `services/discount.service.js` | All discount business logic (static methods) |
| `models/discount.model.js` | Discount schema |
| `models/repositories/discount.repo.js` | Mongoose queries (generic, accepts model param) |
| `models/repositories/product.repo.js` | Used by `getAllDiscountCodesWithProduct` for product listing |
