# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `backend/` directory:

```bash
npm run dev      # Start with nodemon (development)
npm start        # Start production server
npm test         # Run test.js with nodemon
```

No lint or test framework is configured — `npm test` runs `nodemon test.js` (manual test file).

## Architecture

Single Express 5 monolith with MongoDB (Mongoose) and Redis. All source code lives in `backend/src/`.

**Request lifecycle:**
1. `server.js` → `app.js` (middleware: helmet, morgan, compression, body-parser)
2. All routes require two middleware layers applied in `routes/index.js`:
   - `apiKey` — validates `x-api-key` header against the `apikeys` collection; attaches `req.objKey`
   - `permission('0000')` — checks that the key's permissions array includes the required level
3. Protected routes additionally use `authentication` / `authenticationV2` from `auth/authUtils.js`:
   - Requires `x-client-id` (userId) + `authorization` (JWT access token)
   - `authenticationV2` also handles refresh via `x-rtoken-id` header
   - JWT keypairs are stored per-user in the `keytokens` collection

**Layer structure (strict separation):**
- `routes/` — defines endpoints, applies auth middleware, delegates to controllers
- `controllers/` — extracts request data, calls service, returns `SuccessResponse`
- `services/` — all business logic; services may call each other (e.g., `checkout.service` calls `discount.service`, `inventory.service`, `cart.service`)
- `models/` — Mongoose schemas only
- `core/` — `success.response.js` and `error.response.js` (custom error classes extending `TypeError`)
- `helpers/asyncHandler.js` — wraps async route handlers; errors propagate to Express error middleware in `app.js`

**Domain modules:** `access` (auth/shop registration), `product`, `inventory`, `discount`, `cart`, `checkout`, `shop`

**Checkout flow** (`checkout.service.js`) is the most complex service: it aggregates multi-shop orders, applies discounts, acquires Redis distributed locks per SKU during order placement, and releases them after.

## Database

MongoDB via `src/configs/config.mongodb.js`. Environment is selected by `NODE_ENV`:
- `development` → `shopDEV` on `localhost:27017`
- `production` → `shopPRO` on `localhost:27017`

Connection uses singleton pattern (`dbs/init.mongodb.js` — `Database.getInstance()`).

Redis is used only for distributed inventory locking in the checkout flow (`services/redis.service.js` with `acquireLock` / `releaseLock`).

## Auth Headers Reference

| Header | Purpose |
|--------|---------|
| `x-api-key` | API key for all routes |
| `x-client-id` | userId for JWT-authenticated routes |
| `authorization` | JWT access token |
| `x-rtoken-id` | JWT refresh token (authenticationV2 only) |

## Postman Collections

API test collections are in `backend/src/postman/` for manual API testing.

## Documentation

Detailed docs live in `docs/` at the project root:

| File | Description |
|------|-------------|
| [`docs/features.md`](docs/features.md) | Full API endpoint reference for all 6 domains |
| [`docs/access-and-authentication.md`](docs/access-and-authentication.md) | Auth flows, JWT keypair model, known issues, optimization plan |
| [`docs/product.md`](docs/product.md) | Product service patterns, Factory/Registry, known issues, optimization plan |
| [`docs/discount.md`](docs/discount.md) | Discount service flows, atomic ops, known issues, optimization plan |
| [`docs/cart.md`](docs/cart.md) | Cart service flows, upsert patterns, known issues, optimization plan |
| [`docs/plan.md`](docs/plan.md) | Backend, testing, frontend, and deployment checklists |
