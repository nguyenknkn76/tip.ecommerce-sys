# Product

Products use a **polymorphic / factory pattern**: a base `Product` document is stored in the `products` collection, and type-specific attributes are stored in a dedicated sub-collection (`electronics`, `clothes`, or `furnitures`). Both documents share the same `_id`.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/api/product/` | — | List all published products (paginated) |
| GET | `/v1/api/product/:product_id` | — | Get a single product |
| GET | `/v1/api/product/search/:keySearch` | — | Full-text search |
| GET | `/v1/api/product/drafts/all` | authV2 | List shop's draft products |
| GET | `/v1/api/product/published/all` | authV2 | List shop's published products |
| POST | `/v1/api/product/` | authV2 | Create a product |
| PATCH | `/v1/api/product/:productId` | authV2 | Update a product |
| POST | `/v1/api/product/publish/:id` | authV2 | Publish a draft |
| POST | `/v1/api/product/unpublish/:id` | authV2 | Revert to draft |

## Factory Pattern

`ProductFactory` maintains a registry map `{ type → class }`. Calling `createProduct(type, payload)` or `updateProduct(type, productId, payload)` delegates to the correct subclass.

```
ProductFactory
  ├── Electronics  → collection: electronics  (manufacturer, model, color)
  ├── Clothing     → collection: clothes      (brand, size, material)
  └── Furniture    → collection: furnitures   (brand, size, material)
```

When a product is created, `Product.createProduct()` also calls `insertInventory()` to seed an `inventories` record with `stock = product_quantity`.

## Request / Response

### POST `/product/` — Create
```json
// Request body
{
  "product_name": "iPhone 15",
  "product_thumb": "https://...",
  "product_description": "...",
  "product_price": 999,
  "product_quantity": 50,
  "product_type": "Electronics",
  "product_attributes": {
    "manufacturer": "Apple",
    "model": "A17",
    "color": "Black"
  }
}
```
`product_shop` is taken from `req.user.userId` (JWT).

### PATCH `/product/:productId` — Update
Send only the fields to change. Nested `product_attributes` fields are merged (undefined values are removed). Both the base `products` doc and the type sub-doc are updated.

### GET `/product/` — List
Query params: `limit` (default 50), `page` (default 1), `sort` (`ctime`), `filter`.  
Returns: `product_name`, `product_price`, `product_thumb`, `product_shop`.

### GET `/product/search/:keySearch`
Uses MongoDB text index on `product_name` + `product_description`. Results sorted by text score.

## Draft / Publish States

| State | `isDraf` | `isPublished` |
|-------|----------|---------------|
| Draft (default) | `true` | `false` |
| Published | `false` | `true` |

Both fields have `select: false` — they are never returned in queries unless explicitly selected.

## Data Model

### Product (`products` collection)
| Field | Type | Notes |
|-------|------|-------|
| `product_name` | String | required; text index |
| `product_thumb` | String | required |
| `product_description` | String | text index |
| `product_slug` | String | auto-generated from name |
| `product_price` | Number | required |
| `product_quantity` | Number | required |
| `product_type` | String | `Electronics` / `Clothing` / `Furniture` |
| `product_shop` | ObjectId → Shop | |
| `product_attributes` | Mixed | required; type-specific |
| `product_ratingsAverage` | Number | 1.0–5.0, default 4.5 |
| `product_variations` | Array | default `[]` |
| `isDraf` | Boolean | default `true`; indexed, hidden |
| `isPublished` | Boolean | default `false`; indexed, hidden |

Sub-collections (`electronics`, `clothes`, `furnitures`) share the same `_id` as the parent product and include a `product_shop` reference.
