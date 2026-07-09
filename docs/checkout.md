# Checkout & Orders

Checkout is a two-step process: **review** (price/discount calculation) and **place** (order creation with inventory locking). The review step is currently the only exposed endpoint; order placement (`orderByUser`) exists in the service layer but has no route yet.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/api/checkout/review` | — | Preview total with discounts applied |

## Checkout Review

### POST `/checkout/review`
```json
// Request body
{
  "cartId": "<cartId>",
  "userId": 123,
  "shop_order_ids": [
    {
      "shopId": "<shopId>",
      "shop_discounts": [{ "codeId": "SUMMER20" }],
      "item_products": [
        { "productId": "<ObjectId>", "quantity": 2 }
      ]
    }
  ]
}

// Response
{
  "metadata": {
    "shop_order_ids": [...],
    "shop_order_ids_new": [
      {
        "shopId": "<shopId>",
        "shop_discounts": [...],
        "item_products": [{ "productId", "quantity", "price" }],
        "rawPrice": 300,
        "discount": 60,
        "finalPrice": 240
      }
    ],
    "checkout_order": {
      "totalPrice": 300,
      "feeShip": 0,
      "totalDiscount": 60,
      "totalCheckout": 240
    }
  }
}
```

Per-shop processing:
1. Validates products via `checkProductByServer` (checks existence, returns live prices).
2. Calculates raw subtotal from live prices × quantities.
3. If `shop_discounts` is non-empty, calls `DiscountService.getDiscountAmount` for the shop.
4. Accumulates totals across all shops into `checkout_order`.

## Order Placement (service-only)

`CheckoutService.orderByUser({ shop_order_ids, cartId, userId, user_address, user_payment })`:

1. Runs `checkoutReview` for final prices.
2. For each product, acquires a Redis distributed lock via `acquireLock(productId, quantity, cartId)`.
   - Lock key: `lock_v2025_${productId}` with a 3-second TTL.
   - Retries up to 10 times with 50ms delay.
   - On acquisition, calls `reservationInventory` to decrement stock.
3. Creates an `Order` document.
4. Releases all locks.

> **Known bug in `orderByUser`:** The `acquireProduct` array accumulation is incorrect — it pushes the return value of `acquireLock` which may be `undefined`. Redis `retryTimes.length` is used instead of the retry count number.

## Data Model

### Order (`orders` collection)
| Field | Type | Notes |
|-------|------|-------|
| `order_userId` | Number | required |
| `order_checkout` | Object | `{ totalPrice, totalApplyDiscount, feeShip }` |
| `order_shipping` | Object | `{ street, city, state, country }` |
| `order_payment` | Object | payment method details |
| `order_products` | Array | required; snapshot of ordered items |
| `order_trackingNumber` | String | default `'#00001102082025'` |
| `order_status` | String | `pending` / `confirmed` / `shipped` / `cancelled` / `delivered`; default `pending` |

## Unimplemented Service Methods

The following methods exist as stubs in `checkout.service.js`:
- `getOrdersByUser()`
- `getOneOrderByUser()`
- `cancelOrderByUser()`
- `updateOrderStatusByShop()`
