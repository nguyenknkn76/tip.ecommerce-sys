# Cart Feature

---

## Overview

The cart feature manages a per-user shopping basket. A user has one active cart at a time. Products can be added, quantity-updated, and removed. The cart is consumed by `checkout.service` during order review. All routes are currently **public — no JWT required**.

---

## Architecture & Data Flow

### Request Flow

```
HTTP Request
  │
  ▼
routes/cart/index.js
  │  All routes are public (no authenticationV2 middleware)
  │  userId comes from req.body or req.query — not from token
  ▼
controllers/cart.controller.js
  │  Passes req.body / req.query directly to service
  ▼
services/cart.service.js  (CartService — all static methods)
  │  Three versions of add logic coexist (V1, V2, V3)
  │  V3 is active for add, V2 for update, V1 is dead code
  ▼
models/cart.model.js + models/repositories/cart.repo.js
  │  Atomic MongoDB operations ($inc, $push, $pull, $addToSet)
  ▼
MongoDB (Carts collection)
       +
models/repositories/product.repo.js  ← used by addToCartV2 for product validation
```

### Add to Cart Flow (V3 — active)

```
POST /v1/api/cart/
Body: { userId, product: { productId, shopId, quantity, name, price } }

1. cart.findOne({ cart_userId: userId })
2a. No cart exists:
      createUserCart → findOneAndUpdate({ cart_userId, cart_state:'active' },
                        $addToSet: { cart_products: product },
                        { upsert: true, new: true })
2b. Cart exists, product already in cart_products (matched by productId):
      findOneAndUpdate({ cart_userId, 'cart_products.productId': productId },
                        $inc: { 'cart_products.$.quantity': product.quantity },
                        { new: true })
2c. Cart exists, product not in cart:
      findOneAndUpdate({ cart_userId },
                        $push: { cart_products: product },
                        { new: true })
3. Return updated cart document
```

### Update Cart Quantity Flow (V2)

```
POST /v1/api/cart/update
Body: { userId, shop_order_ids: [{ shopId, item_products: [{ productId, quantity, old_quantity }] }] }

1. Extract productId, quantity, old_quantity from shop_order_ids[0].item_products[0]
2. getProductById(productId) → NotFoundError if missing
3. Validate product_shop === shop_order_ids[0].shopId → NotFoundError if mismatch
4. if quantity === 0 → [DELETE UNIMPLEMENTED — see Issues]
5. updateUserCartQuantity:
     findOneAndUpdate({ cart_userId, 'cart_products.productId': productId, cart_state:'active' },
                       $inc: { 'cart_products.$.quantity': quantity - old_quantity },
                       { upsert: true, new: true })
6. Return updated cart
```

### Delete Item Flow

```
DELETE /v1/api/cart/
Body: { userId, productId }

cart.updateOne(
  { cart_userId: userId, cart_state: 'active' },
  { $pull: { cart_products: { productId } } }
)
→ Returns raw write result { n, nModified } not the updated cart
```

### Get Cart Flow

```
GET /v1/api/cart/?userId=

cart.findOne({ cart_userId: +userId }).lean()
→ +userId coerces string to Number — if userId is an ObjectId string, returns NaN → no cart found
```

---

## Data Model

### Cart (`Carts` collection)

| Field | Type | Notes |
|-------|------|-------|
| `cart_state` | String | enum: `active`, `completed`, `failed`, `pending` — default `active` |
| `cart_products` | Array | untyped — shape: `{ productId, shopId, quantity, name, price }` |
| `cart_count_product` | Number | default `0` — **never updated by any code** |
| `cart_userId` | **Number** | stores the user's ID — **typed as Number, not ObjectId** |
| `createdOn` | Date | custom `timestamps.createdAt` alias |
| `modifiedOn` | Date | custom `timestamps.updatedAt` alias |

---

## Design Patterns Used

### 1. Upsert for Idempotent Cart Creation
`createUserCart` uses `findOneAndUpdate` with `{ upsert: true }`. If the cart doesn't exist it is created; if it exists it is updated. Single DB round-trip, no separate exists-check needed.

### 2. Positional Array Operator `$`
Both `updateUserCartQuantity` and `addToCartV3` use the `$` operator to update a matched array element in-place:
```js
{ 'cart_products.productId': productId }  // match filter
{ $inc: { 'cart_products.$.quantity': delta } }  // update matched element
```
This avoids reading the full array into application memory, updating it, and writing it back.

### 3. Atomic Write Operators
All mutations use MongoDB atomic operators — no read-modify-write pattern:
- `$addToSet` — add product without duplicates (createUserCart)
- `$push` — append a new product (addToCartV3 step 2c)
- `$inc` — increment quantity in-place
- `$pull` — remove matched element from array

### 4. Version Evolution Pattern
Three versions of `addToCart` coexist in the service: `addToCart` (V1), `addToCartV2` (update), `addToCartV3` (current add). This shows iterative development — V3 fixes the race condition present in V1 by reducing unnecessary findOne+save patterns.

### 5. Repository Pattern
`cart.repo.js` exposes `findCartById` used by `checkout.service` to validate a cart before order placement. Checkout never imports the model directly.

### 6. `lean()` on Read Path
`getListUserCart` uses `.lean()` — returns a plain JS object for the read-only cart display path.

---

## Tech Stack & Coding Techniques

| Technique | Where used |
|-----------|-----------|
| `findOneAndUpdate` + `upsert: true` | `createUserCart` — atomic create-or-update |
| MongoDB positional operator `$` | `updateUserCartQuantity`, `addToCartV3` — in-array field update |
| `$addToSet` | `createUserCart` — deduplication on insert |
| `$push` | `addToCartV3` step 2c — append new product |
| `$pull` | `deleteUserCart` — remove matched element |
| `$inc` | `updateUserCartQuantity` — atomic counter delta |
| `.lean()` | `getListUserCart`, `findCartById` — read-only paths |
| Cross-service call | `checkout.service` uses `cart.repo.findCartById` |
| Custom timestamp aliases | `createdOn` / `modifiedOn` instead of default `createdAt` / `updatedAt` |

---

## Issues Found

| # | Location | Problem |
|---|----------|---------|
| 1 | `routes/cart/index.js` | **No authentication on any route** — `userId` comes from `req.body`/`req.query`. Any client can read or modify another user's cart by passing their `userId`. |
| 2 | `cart.model.js:26` | `cart_userId` is typed as `Number` — if userId is a MongoDB ObjectId string, it either coerces incorrectly or stores `NaN`. Inconsistent with the rest of the codebase which uses ObjectId. |
| 3 | `cart.service.js:136` | `getListUserCart` coerces with `+userId` — if userId is an ObjectId string, `+userId` is `NaN` and `findOne({cart_userId: NaN})` returns `null` silently. |
| 4 | `cart.service.js:111` | `addToCartV2` when `quantity === 0` has a comment `// delete product` but **no implementation** — setting quantity to 0 is silently ignored, item stays in cart. |
| 5 | `cart.service.js:79` | `addToCart` (V1) is dead code — controller calls `addToCartV3`. V1 uses `findOne` + separate `save()` / `updateUserCartQuantity` — a non-atomic read-modify-write with a race condition. |
| 6 | `cart.service.js:35` | `addToCartV3` still has a race condition — `findOne` then a separate update is not atomic. Two concurrent requests for the same user can both see no cart and both call `createUserCart`, creating two active cart documents. |
| 7 | `cart.service.js:35` | **No product existence or published check in `addToCartV3`** — unlike `addToCartV2`, it never calls `getProductById`. Deleted or unpublished products can be added to a cart silently. |
| 8 | `cart.service.js:35` | **Client-supplied price is stored as-is** — `product.price` comes from the request body with no server-side validation. A caller can set `price: 0` and proceed to checkout with a free item. |
| 9 | `cart.service.js:123` | `deleteUserCart` uses `cart.updateOne` — returns raw `{ n, nModified }` write result, not the updated cart document. The response metadata exposes an internal write result object to the client. |
| 10 | `cart.model.js` | `cart_count_product` field exists but **is never incremented or decremented** by any service method. Always stays at `0`. |
| 11 | `cart.model.js` | `cart_products` is typed as bare `Array` — no schema for the product shape `{productId, shopId, quantity, name, price}`. No validation or type enforcement. |
| 12 | `cart.model.js` | **No index on `cart_userId`** — every cart operation does `findOne({cart_userId})` but there is no index. Full collection scan on every request. |
| 13 | `cart.repo.js` | `findCartById` is the only repo function — all other DB operations are done directly in the service, bypassing the repository layer inconsistently. |
| 14 | `cart.service.js:101` | `addToCartV2` accesses `shop_order_ids[0]?.item_products[0]` with no guard if the array is empty — throws a TypeError instead of a proper error. |

---

## Performance & Security Improvements

### Security

- **Add JWT authentication to cart routes** — `userId` must come from `req.user.userId` (set by `authenticationV2`), not from the request body. This is the single most impactful security fix:
  ```js
  // routes/cart/index.js
  router.use(authenticationV2);
  // controllers: use req.user.userId instead of req.body.userId
  ```
- **Validate product on `addToCartV3`** — call `getProductById` before adding to cart. Reject if not found or not published:
  ```js
  const foundProduct = await getProductById(product.productId);
  if (!foundProduct) throw new NotFoundError('Product not found');
  if (!foundProduct.isPublished) throw new BadRequestError('Product is not available');
  ```
- **Never trust client-supplied price** — always overwrite price from the DB, never from `req.body`:
  ```js
  product.price = foundProduct.product_price;
  product.name  = foundProduct.product_name;
  ```
- **Fix `quantity === 0` to trigger deletion (Issue #4)** — a cart item with 0 quantity should call `deleteUserCart`, not silently pass:
  ```js
  if (quantity === 0) return CartService.deleteUserCart({ userId, productId });
  ```
- **Define `cart_products` as a subdocument schema** — enforce the product shape at the DB level, preventing arbitrary data from being stored:
  ```js
  const cartProductSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    shopId:    { type: mongoose.Schema.Types.ObjectId, required: true },
    quantity:  { type: Number, required: true, min: 1 },
    name:      { type: String, required: true },
    price:     { type: Number, required: true, min: 0 },
  }, { _id: false });
  ```

### Performance

- **Add index on `cart_userId` (Issue #12)** — every cart operation does a `findOne` by this field. Without an index it is a full collection scan:
  ```js
  cartSchema.index({ cart_userId: 1 });
  // or unique: only one active cart per user
  cartSchema.index({ cart_userId: 1, cart_state: 1 });
  ```
- **Cache active cart in Redis** — the cart is read on every `addToCart`, `update`, and `checkout/review`. Cache the active cart document with a short TTL and invalidate on write:
  ```
  Key:  cart:<userId>   TTL: 300s
  Read: check cache → on miss: query MongoDB → set cache
  Write: update MongoDB → del cache key
  ```
  Redis is already in the stack (used by checkout locks) — no new dependency.
- **Fix the race condition with a single atomic upsert (Issue #6)** — replace the `findOne` + separate update pattern in `addToCartV3` with a single conditional update. Use `findOneAndUpdate` with `arrayFilters` to handle all three cases atomically:
  ```js
  // Try to increment existing product first
  const updated = await cart.findOneAndUpdate(
    { cart_userId: userId, cart_state: 'active', 'cart_products.productId': product.productId },
    { $inc: { 'cart_products.$.quantity': product.quantity } },
    { new: true }
  );
  if (updated) return updated;

  // Product not in cart — upsert cart and push product
  return await cart.findOneAndUpdate(
    { cart_userId: userId, cart_state: 'active' },
    { $push: { cart_products: product } },
    { upsert: true, new: true }
  );
  ```
  This reduces 2–3 DB round-trips to a maximum of 2, and eliminates the race window.
- **Maintain `cart_count_product` with `$inc` (Issue #10)** — update it alongside every `$push` / `$pull`:
  ```js
  // on add:    $inc: { cart_count_product: 1 }
  // on delete: $inc: { cart_count_product: -1 }
  ```
- **Fix `cart_userId` type to `ObjectId` (Issue #2, #3)** — change the schema field type, migrate existing documents, and remove the `+userId` coercion in `getListUserCart`. Consistent with every other userId reference in the codebase.

---

## Optimization Plan

### Phase 1 — Fix Bugs (Critical)

**1. Add `authenticationV2` to all cart routes (Issue #1)**

Move `userId` source from `req.body` to `req.user.userId` across all controller methods.

**2. Fix `cart_userId` type to `ObjectId` (Issues #2, #3)**
```js
cart_userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Shop' }
```
Remove `+userId` coercion in `getListUserCart`.

**3. Fix `quantity === 0` deletion in `addToCartV2` (Issue #4)**
```js
if (quantity === 0) return CartService.deleteUserCart({ userId, productId });
```

**4. Validate and overwrite product price/existence in `addToCartV3` (Issues #7, #8)**

Call `getProductById`, throw if missing/unpublished, overwrite price from DB.

**5. Fix `deleteUserCart` response (Issue #9)**

Use `findOneAndUpdate` with `{ new: true }` to return the updated cart, not a raw write result.

---

### Phase 2 — Cleanup (Medium priority)

**6. Remove `addToCart` V1 dead code (Issue #5)**

Delete the `addToCart` method entirely. Keep only `addToCartV2` (update) and `addToCartV3` (add), rename them to `addToCart` and `updateCartItem` for clarity.

**7. Add index on `cart_userId` + `cart_state` (Issue #12)**
```js
cartSchema.index({ cart_userId: 1, cart_state: 1 });
```

**8. Move service-level DB calls into `cart.repo.js` (Issue #13)**

`createUserCart` and `updateUserCartQuantity` currently live inside the service class. Move them to the repo to maintain consistent layering.

**9. Define `cart_products` as a typed subdocument schema (Issue #11)**

Enforces shape at schema level. Prevents arbitrary data from being stored. Enables Mongoose validators on `quantity` (min: 1) and `price` (min: 0).

---

### Phase 3 — Enhancements (Lower priority)

**10. Cache active cart in Redis**

Serve `getListUserCart` and the initial `findOne` in `addToCartV3` from Redis. Invalidate on every write. Significantly reduces MongoDB load on the hottest path.

**11. Maintain `cart_count_product` (Issue #10)**

Add `$inc: { cart_count_product: 1 }` to add operations and `$inc: { cart_count_product: -1 }` to delete. Enables the client to show item count without loading the full cart array.

**12. Fix the race condition in `addToCartV3` (Issue #6)**

Collapse the `findOne` + conditional update into a 2-step atomic upsert using `arrayFilters` or the try-increment-then-push pattern.

**13. Add input validation middleware**

Validate `product.quantity >= 1`, `product.productId` is a valid ObjectId, and `shop_order_ids` is non-empty before hitting the service layer.

---

## Files Reference

| File | Role |
|------|------|
| `routes/cart/index.js` | Route definitions — all public, no auth middleware |
| `controllers/cart.controller.js` | HTTP layer, delegates to service |
| `services/cart.service.js` | All cart logic — add (V3), update (V2), delete, get |
| `models/cart.model.js` | Cart schema |
| `models/repositories/cart.repo.js` | `findCartById` — used by checkout.service |
| `models/repositories/product.repo.js` | `getProductById` — used by addToCartV2 for validation |
