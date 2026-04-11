# Features

All routes are prefixed with `/v1/api` and require `x-api-key` header.
Authenticated routes additionally require `x-client-id` + `authorization` headers.

---

## Authentication & Access

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/shop/signup` | No | Register a new shop account |
| POST | `/shop/login` | No | Login and receive access/refresh tokens |
| POST | `/shop/logout` | Yes | Logout and invalidate tokens |
| POST | `/shop/handleRefreshToken` | Yes (refresh token) | Rotate access token using refresh token |

---

## Product

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/product/` | Yes | Create a new product draft (Electronics or Clothing) |
| PATCH | `/product/:productId` | Yes | Update product fields and type-specific attributes |
| POST | `/product/publish/:id` | Yes | Publish a draft product (visible to customers) |
| POST | `/product/unpublish/:id` | Yes | Unpublish a product |
| GET | `/product/drafts/all` | Yes | List all draft products for the current shop |
| GET | `/product/published/all` | Yes | List all published products for the current shop |
| GET | `/product/search/:keySearch` | No | Search products by keyword |
| GET | `/product/` | No | List all published products (paginated) |
| GET | `/product/:product_id` | No | Get full details of a specific product |

---

## Inventory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/inventory/` | Yes | Add stock to a product inventory (upserts if not exists) |

---

## Discount

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/discount/` | Yes | Create a new discount code (fixed or percentage, all or specific products) |
| GET | `/discount/` | Yes | List all active discount codes for the current shop |
| GET | `/discount/list_product_code` | No | List products applicable for a given discount code |
| POST | `/discount/amount` | No | Calculate discount amount for a set of products |

---

## Cart

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/cart/` | No | Add a product to cart (creates cart if not exists) |
| DELETE | `/cart/` | No | Remove a product from cart |
| POST | `/cart/update` | No | Update quantity of a cart item |
| GET | `/cart/` | No | Get current cart contents |

---

## Checkout

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/checkout/review` | No | Preview order: validates products, applies discounts, calculates totals. Uses Redis distributed locks per SKU to prevent race conditions. |

---

## Auth Header Reference

| Header | Purpose |
|--------|---------|
| `x-api-key` | Required on all routes |
| `x-client-id` | userId for authenticated routes |
| `authorization` | JWT access token (2-day expiry) |
| `x-rtoken-id` | JWT refresh token (7-day expiry) |
