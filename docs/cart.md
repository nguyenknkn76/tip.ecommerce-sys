# Cart

Each user has one active cart (`cart_state: 'active'`). Cart products are stored as an embedded array. All current endpoints are public (no JWT required — `userId` is passed in the request body/query).

> Note: `cart_userId` is stored as `Number` in the model. The service `getListUserCart` casts `userId` to `Number` explicitly.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/api/cart/` | — | Add a product to cart |
| POST | `/v1/api/cart/update` | — | Update product quantity |
| DELETE | `/v1/api/cart/` | — | Remove a product from cart |
| GET | `/v1/api/cart/` | — | Get the user's cart |

## Request / Response

### POST `/cart/` — Add to Cart
```json
// Request body
{
  "userId": 123,
  "product": { "productId": "<ObjectId>", "quantity": 2 }
}
```
Uses `addToCartV3`:
- If no cart exists → create one with `cart_state: 'active'`.
- If product already in cart → increment quantity.
- If product not in cart → push to `cart_products`.

### POST `/cart/update` — Update Quantity
```json
// Request body
{
  "userId": 123,
  "shop_order_ids": [
    {
      "shopId": "<shopId>",
      "item_products": [
        { "productId": "<ObjectId>", "quantity": 3, "old_quantity": 1 }
      ]
    }
  ]
}
```
Validates product belongs to `shopId`. Applies `quantity - old_quantity` delta via `$inc`.

### DELETE `/cart/` — Remove Product
```json
// Request body
{ "userId": 123, "productId": "<ObjectId>" }
```
Uses `$pull` to remove the product from `cart_products`.

### GET `/cart/?userId=123`
Returns the user's active cart document.

## Cart Product Shape

Each element in `cart_products` is:
```json
{ "productId": "<ObjectId>", "quantity": 2 }
```

## Data Model

### Cart (`carts` collection)
| Field | Type | Notes |
|-------|------|-------|
| `cart_state` | String | `active` / `completed` / `failed` / `pending`; default `active` |
| `cart_products` | Array | embedded product list |
| `cart_count_product` | Number | default `0` (not auto-updated) |
| `cart_userId` | Number | required |
