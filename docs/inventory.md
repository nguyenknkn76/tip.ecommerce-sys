# Inventory

Inventory tracks stock per product per shop. A record is automatically created when a product is created (via `insertInventory` called from `Product.createProduct()`). Stock can be topped up manually via the API.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/api/inventory/` | authV2 | Add stock to a product's inventory |

## Request / Response

### POST `/inventory/` — Add Stock
```json
// Request body
{
  "stock": 100,
  "productId": "<ObjectId>",
  "shopId": "<shopId>",
  "location": "Warehouse A, Long Bien, Hanoi"
}
```
- Validates the product exists (`getProductById`).
- Upserts the inventory record by `shopId + productId`.
- Increments `inven_stock` by `stock`, updates `inven_location`.
- Default location if omitted: `'123, Long Bien, Hanoi'`.

## Reservation System

When an order is placed, `reservationInventory({ productId, quantity, cartId })` is called:
- Finds an inventory document where `inven_stock >= quantity`.
- Atomically decrements `inven_stock` by `quantity`.
- Appends a reservation entry: `{ cartId, quantity, createdOn: Date }` to `inven_reservations`.

This is used inside the Redis distributed lock flow in `checkout.service.js` to prevent overselling under concurrent orders.

## Data Model

### Inventory (`inventories` collection)
| Field | Type | Notes |
|-------|------|-------|
| `inven_productId` | ObjectId → Product | |
| `inven_location` | String | default `'unKnow'` |
| `inven_stock` | Number | required |
| `inven_shopId` | ObjectId → Shop | |
| `inven_reservations` | Array | `[{ cartId, quantity, createdOn }]` |
