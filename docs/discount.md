# Discount

Discount codes are created per-shop and can apply to either all products in a shop or a specific list. Two discount types are supported: `fixed_amount` and `percentage`.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/api/discount/` | authV2 | Create a discount code |
| GET | `/v1/api/discount/` | authV2 | List active codes for authenticated shop |
| GET | `/v1/api/discount/list_product_code` | — | List products eligible for a code |
| POST | `/v1/api/discount/amount` | — | Calculate discount on a set of products |

## Request / Response

### POST `/discount/` — Create
```json
{
  "code": "SUMMER20",
  "name": "Summer Sale 20%",
  "description": "20% off all items",
  "type": "percentage",
  "value": 20,
  "min_order_value": 100,
  "max_uses": 500,
  "max_uses_per_user": 1,
  "start_date": "2025-06-01T00:00:00Z",
  "end_date": "2025-08-31T23:59:59Z",
  "applies_to": "all",
  "product_ids": []
}
```
- `applies_to: "specific"` requires `product_ids` to be populated.
- `shopId` is injected from `req.user.userId`.
- Validation: start < end, code unique per shop, not already expired.

### GET `/discount/list_product_code`
Query params: `code`, `shopId`, `userId`, `limit`, `page`.  
Returns all products eligible for the discount. If `applies_to = 'all'`, returns all published products from the shop. If `'specific'`, returns products whose `_id` is in `discount_product_ids`.

### POST `/discount/amount` — Calculate
```json
// Request body
{
  "codeId": "SUMMER20",
  "userId": "<userId>",
  "shopId": "<shopId>",
  "products": [
    { "quantity": 2, "price": 150 }
  ]
}

// Response
{
  "metadata": {
    "totalOrder": 300,
    "discount": 60,
    "totalPrice": 240
  }
}
```

Validation order:
1. Discount `is_active` check.
2. `max_uses` not exhausted.
3. Current date within `[start_date, end_date]`.
4. Order total ≥ `min_order_value`.
5. User's usage count < `max_uses_per_user`.

## Cancelling a Discount

`cancelDiscountCode({ codeId, shopId, userId })` — removes `userId` from `discount_users_used`, increments `max_uses`, decrements `uses_count`. Used when an order is cancelled after a discount was applied.

## Data Model

### Discount (`discounts` collection)
| Field | Type | Notes |
|-------|------|-------|
| `discount_name` | String | required |
| `discount_description` | String | required |
| `discount_type` | String | `fixed_amount` (default) / `percentage` |
| `discount_value` | Number | required |
| `discount_code` | String | required |
| `discount_start_date` | Date | required |
| `discount_end_date` | Date | required |
| `discount_max_uses` | Number | total redemptions allowed |
| `discount_uses_count` | Number | times redeemed so far |
| `discount_users_used` | Array | list of userIds who used it |
| `discount_max_uses_per_user` | Number | per-user cap |
| `discount_min_order_value` | Number | minimum cart total |
| `discount_shopId` | ObjectId → Shop | |
| `discount_is_active` | Boolean | default `true` |
| `discount_applies_to` | String | `all` / `specific` |
| `discount_product_ids` | Array | ObjectIds; used when `applies_to = 'specific'` |

> **Known bug:** `deleteDiscountCode` searches `discount_applies_to` instead of `discount_code` when looking up the record to delete.
