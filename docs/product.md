# Product Feature

---

## Overview

The product feature handles the full lifecycle of a shop's catalog: creation, type-specific attribute storage, publish/unpublish state management, and customer-facing queries (search, listing, detail).

---

## Architecture & Data Flow

### Request Flow

```
HTTP Request
  │
  ▼
routes/product/index.js
  │  Public routes (no JWT): GET /search/:key, GET /, GET /:id
  │  Protected routes (authenticationV2): POST, PATCH, POST /publish, POST /unpublish, GET /drafts/all, GET /published/all
  ▼
controllers/product.controller.js
  │  Extracts req.body / req.params / req.query
  │  Injects product_shop = req.user.userId
  ▼
services/xxx.advanced.product.service.js  (ProductFactory)
  │  Resolves the concrete class from productRegistry
  │  Delegates to Electronics / Clothing / Furnitures subclass
  ▼
models/repositories/product.repo.js
  │  All raw DB queries live here
  ▼
MongoDB (products + electronics / clothes / furnitures collections)
```

### Create Product Flow

```
POST /v1/api/product/
Body: { product_type, product_name, product_price, product_quantity, product_thumb, product_attributes }

1. ProductFactory.createProduct(type, payload)
2. Look up type in productRegistry → resolve subclass (Electronics / Clothing / Furnitures)
3. Subclass.createProduct():
   a. Insert into type-specific collection (electronics / clothes / furnitures)
      with product_attributes + product_shop
   b. Use returned _id as the shared _id for the base product
   c. super.createProduct(specificId):
      → product.create({ ...baseFields, _id: specificId })
      → insertInventory({ productId, shopId, stock: product_quantity })
4. Return new product document
```

> The type-specific document and the base product share the same `_id`. The type-specific collection acts as an extension table.

### Update Product Flow

```
PATCH /v1/api/product/:productId
Body: { product_type, ...fieldsToUpdate }

1. ProductFactory.updateProduct(type, productId, payload)
2. Subclass.updateProduct(productId):
   a. removeUndefinedObject(this) — strip null/undefined fields
   b. If product_attributes present:
      → updateNestedObjectParser(attributes) — flatten nested keys to dot-notation
      → updateProductById({ productId, bodyUpdate, model: electronicOrClothing })
   c. super.updateProduct(productId, updateNestedObjectParser(payload))
      → product.findByIdAndUpdate(productId, bodyUpdate, { new: true })
```

---

## Design Patterns Used

### 1. Factory Pattern (with Registry)

`ProductFactory` uses a static registry map instead of a hardcoded switch:

```js
// Register once at module load
ProductFactory.registerProductType('Electronics', Electronics);
ProductFactory.registerProductType('Clothing', Clothing);
ProductFactory.registerProductType('Furniture', Furnitures);

// Create dynamically at runtime
const productClass = ProductFactory.productRegistry[type];
return new productClass(payload).createProduct();
```

**Why it matters:** Adding a new product type requires only writing a new subclass and calling `registerProductType` — no changes to the factory itself. The old version (`product.service.js`) used a `switch` statement that required editing the factory for every new type.

### 2. Template Method Pattern

The base `Product` class defines `createProduct(product_id)` and `updateProduct(productId, bodyUpdate)` as shared steps. Subclasses call `super.createProduct()` after handling their own type-specific logic, keeping common behavior (inventory insertion, base document creation) in one place.

### 3. Repository Pattern

All MongoDB queries are isolated in `models/repositories/product.repo.js`. The service never calls Mongoose directly — it always goes through the repo. This makes the query layer swappable without touching business logic.

### 4. Selective Field Projection

Queries never return full documents unless needed:
- `findAllProducts` → selects only `product_name`, `product_price`, `product_thumb`, `product_shop`
- `findProduct` → excludes only `__v`
- `findAllDrafsForShop` / `findAllPublishForShop` → uses `.lean()` for plain JS objects

### 5. `isDraf` / `isPublished` Flags with Index

Both flags have `index: true` and `select: false` on the schema. They are indexed for fast filtering but never returned in query results unless explicitly selected — preventing accidental leakage of internal state to API consumers.

### 6. MongoDB Text Index for Search

```js
productSchema.index({ product_name: 'text', product_description: 'text' });
```

Enables full-text search via `$text: { $search: ... }` with relevance scoring (`$meta: 'textScore'`). Results are sorted by score automatically.

### 7. `pre('save')` Hook for Slug

```js
productSchema.pre('save', function(next) {
  this.product_slug = slugify(this.product_name, { lower: true });
  next();
});
```

Slug is auto-generated from the product name on every save, keeping it consistent without any service-layer logic.

### 8. `updateNestedObjectParser` for Safe Partial Updates

Flattens nested objects to MongoDB dot-notation before calling `findByIdAndUpdate`. This prevents accidentally overwriting an entire subdocument when only one field should change:

```
{ product_attributes: { color: 'red' } }
  →  { 'product_attributes.color': 'red' }
```

---

## Issues Found

| # | Location | Problem |
|---|----------|---------|
| 1 | `product.service.js` | Old factory still exists alongside the advanced version. `product.config.js` references undefined variables. Dead code. |
| 2 | `xxx.advanced.product.service.js` | File name is not production-grade. Controller already uses it as the real service. |
| 3 | `Clothing.updateProduct` | Does not call `removeUndefinedObject` or `updateNestedObjectParser` before updating the `clothes` collection — inconsistent with `Electronics.updateProduct`. |
| 4 | `Furnitures.updateProduct` | Not implemented — falls back to base which only updates `products`, silently ignoring `product_attributes`. |
| 5 | `searchProductsByUser` | `new RegExp(keySearch)` is redundant — `$text` ignores it and uses its own tokenizer. |
| 6 | `findAllProducts` | `sort` only handles `'ctime'` vs anything-else — invalid sort values silently fall back to ascending `_id`. |
| 7 | `product.repo.js` | `findAllDrafsForShop` and `findAllPublishForShop` are identical — both call `queryProduct`. One can be removed. |
| 8 | `publishProductByShop` / `unPublishProductByShop` | `findOne` + `updateOne(fullDoc)` — two DB calls, sends full document as update body instead of `$set`. |
| 9 | `createProduct` | `clothing.create(...)` not awaited at null check — `if(!newClothing)` always evaluates against a Promise, never `null`. |
| 10 | No input validation | `product_price` / `product_quantity` accept negatives. `product_type` validated only by Mongoose after a DB round-trip. |
| 11 | `updateProduct` | No `product_shop` ownership filter — any authenticated shop can update another shop's product by ID. |
| 12 | `checkProductByServer` | N+1 queries — one `findOne` per product in a loop. Returns `null` for missing products without throwing. |
| 13 | `findProduct` | Missing `.lean()` — returns a full Mongoose document for a read-only path. |

---

## Performance & Security Improvements

### Security

- **No ownership check on `updateProduct`** — `updateProductById` only filters by `_id`. Add `product_shop` to the filter so a shop can only modify its own products:
  ```js
  model.findOneAndUpdate(
    { _id: productId, product_shop: shopId },
    bodyUpdate,
    { new: true }
  )
  ```
- **Negative price/quantity accepted** — add `min: 0` on both `product_price` and `product_quantity` in the schema.
- **Early type validation** — validate `product_type` against `ProductFactory.productRegistry` before any DB call to fail fast:
  ```js
  if (!ProductFactory.productRegistry[type]) throw new BadRequestError(`Invalid type`);
  ```
- **`checkProductByServer` swallows missing products** — the `null` return propagates silently into checkout orders. Filter and throw if any product is not found:
  ```js
  const results = await checkProductByServer(products);
  if (results.includes(null)) throw new BadRequestError('Product not found');
  ```

### Performance

- **N+1 queries in `checkProductByServer`** — replace per-product `findOne` loop with a single `$in` query:
  ```js
  const ids = products.map(p => convertToObjectIdMongodb(p.product_id));
  const found = await product.find({ _id: { $in: ids } }).lean();
  // map found[] back to input products[]
  ```
- **Missing compound indexes** — queries filter on `product_shop + isDraf` and `product_shop + isPublished` but only single-field indexes exist:
  ```js
  productSchema.index({ product_shop: 1, isDraf: 1 });
  productSchema.index({ product_shop: 1, isPublished: 1 });
  ```
- **`publishProductByShop` does 2 DB round-trips** — collapse to a single atomic `updateOne` with `$set`:
  ```js
  await product.updateOne(
    { _id: new Types.ObjectId(product_id), product_shop: new Types.ObjectId(product_shop) },
    { $set: { isDraf: false, isPublished: true } }
  );
  ```
- **Cache public product reads with Redis** — `GET /product/` and `GET /product/:id` are the highest-traffic endpoints. Redis is already in the stack:
  ```
  GET /product/:id
    → check Redis key  product:<id>  (TTL 60s)
    → cache miss: query MongoDB, set cache
    → cache hit: return immediately
  Invalidate on: publish, unpublish, update
  ```
- **Offset pagination degrades at scale** — `skip(900)` forces MongoDB to scan 900 docs. Replace with cursor-based pagination:
  ```js
  const filter = { isPublished: true, _id: { $lt: lastSeenId } };
  await product.find(filter).sort({ _id: -1 }).limit(limit).lean();
  ```
- **Add `.lean()` to `findProduct`** — read-only path, no need for a full Mongoose document.

---

## Optimization Plan

### Phase 1 — Fix Bugs (High priority)

**1. Fix unawaited Promise null check (Issue #9)**
```js
// Both Clothing.createProduct and Electronics.createProduct
const newClothing = await clothing.create({ ...this.product_attributes, product_shop: this.product_shop });
if (!newClothing) throw new BadRequestError('create new clothing error');
```

**2. Fix `publishProductByShop` / `unPublishProductByShop` (Issue #8)**
```js
// Single atomic update, no findOne needed
const { modifiedCount } = await product.updateOne(
  { _id: new Types.ObjectId(product_id), product_shop: new Types.ObjectId(product_shop) },
  { $set: { isDraf: false, isPublished: true } }
);
```

**3. Fix ownership check in `updateProduct` (Issue #11)**

Pass `shopId` down from the controller through the service to `updateProductById`, and add it to the filter.

**4. Fix `Furnitures.updateProduct` and `Clothing.updateProduct` (Issue #4, #3)**

Implement `Furnitures.updateProduct` matching the `Electronics` pattern. Fix `Clothing.updateProduct` to call `removeUndefinedObject` and `updateNestedObjectParser` before updating the `clothes` collection.

**5. Fix `searchProductsByUser` regex (Issue #5)**
```js
// Pass string directly — $text handles tokenization
await product.find({ isDraf: false, $text: { $search: keySearch } }, { score: { $meta: 'textScore' } })
  .sort({ score: { $meta: 'textScore' } }).lean();
```

---

### Phase 2 — Cleanup (Medium priority)

**6. Rename and consolidate service files**
- Rename `xxx.advanced.product.service.js` → `product.service.js`
- Delete the old `product.service.js` (switch-based factory) and `product.config.js`
- Update the controller import

**7. Merge duplicate repo functions (Issue #7)**

Both `findAllDrafsForShop` and `findAllPublishForShop` call `queryProduct` identically. Expose `queryProduct` directly as `findProductsByQuery` and remove the wrappers.

---

### Phase 3 — Enhancements (Lower priority)

**8. Add compound indexes**
```js
productSchema.index({ product_shop: 1, isDraf: 1 });
productSchema.index({ product_shop: 1, isPublished: 1 });
```

**9. Replace N+1 with `$in` in `checkProductByServer`**

Single query replaces the per-product loop. Throw on any missing product rather than returning `null`.

**10. Cache public product queries in Redis**

Wrap `findAllProducts` and `findProduct` with a 60s Redis cache. Invalidate on publish/unpublish/update. No new dependency — Redis is already used by checkout.

**11. Cursor-based pagination**

Replace `skip/limit` with `_id`-based cursor for `findAllProducts` to avoid full collection scans on deep pages.

**12. Sync inventory on product update**

`updateProduct` can change `product_quantity` on the base product but does not update the `inventories` collection. Either sync inside `Product.updateProduct`, or remove `product_quantity` from the update path and treat inventory as the single source of truth.

---

## Files Reference

| File | Role |
|------|------|
| `routes/product/index.js` | Route definitions, auth boundary |
| `controllers/product.controller.js` | HTTP layer, delegates to service |
| `services/xxx.advanced.product.service.js` | ProductFactory + subclasses (active service) |
| `services/product.service.js` | Old factory with switch — unused, should be deleted |
| `services/product.config.js` | Broken config file — should be deleted |
| `models/product.model.js` | Base + type-specific schemas, text index, pre-save slug |
| `models/repositories/product.repo.js` | All Mongoose queries |
| `utils/index.js` | `removeUndefinedObject`, `updateNestedObjectParser`, projection helpers |
