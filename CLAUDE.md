# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `backend/` directory.

```bash
npm run dev      # Start with nodemon (auto-reload)
npm start        # Start with node
npm run test     # Run test.js with nodemon
```

No linter is configured. No formal test framework — `test.js` is a scratch file.

## Architecture

Node.js + Express v5 backend for an e-commerce platform. Single service, MVC + Service layer pattern.

**Request flow:**
```
Request
  → Morgan / Helmet / Compression (global middleware)
  → API key check (x-api-key header → ApiKey collection)
  → Permission check (code '0000')
  → Route → Controller → Service → Mongoose → MongoDB
  → Standardized Success/Error response
```

**Layer responsibilities:**
- `routes/` — URL mapping and middleware chains
- `controllers/` — extract request data, call service, return response
- `services/` — all business logic; no direct HTTP objects
- `models/` — Mongoose schemas; also define class-based query helpers
- `auth/` — `checkAuth.js` (API key + permission), `authUtils.js` (JWT sign/verify)
- `core/` — `SuccessResponse` / `ErrorResponse` classes; all controllers use these
- `dbs/init.mongodb.js` — Mongoose connection as a Singleton
- `configs/config.mongodb.js` — reads `NODE_ENV` to select dev vs. production config

## Key Design Patterns

**Polymorphic Products:** `product.model.js` defines a base `Product` schema plus sub-schemas (Electronics, Clothing, Furniture). `ProductFactory` in `product.service.js` dispatches `create`/`update` to the correct subclass via a registry map.

**Standardized responses:** All controllers return `new SuccessResponse({...}).send(res)` or throw a typed error (`BadRequestError`, `NotFoundError`, etc.) that the global error handler formats.

**Async error propagation:** Route handlers are wrapped with `asyncHandler` from `helpers/asyncHandler.js` so thrown errors reach the global handler without try/catch in every controller.

**Session tokens:** Login stores access + refresh tokens in the `KeyToken` collection keyed by shop ID. Refresh token rotation is implemented; old tokens are invalidated on reuse.

## Environment

Copy `.env.example` (or set manually):

| Variable | Dev default |
|---|---|
| `NODE_ENV` | `dev` |
| `DEV_APP_PORT` | `3000` |
| `DEV_DB_HOST` | `localhost` |
| `DEV_DB_PORT` | `27017` |
| `DEV_DB_NAME` | `shopDEV` |

Production uses `PRO_*` equivalents and `NODE_ENV=production`.

## API Key Header

Every request must include `x-api-key: <key>` matching a document in the `apikeys` collection. Seed one manually in MongoDB for local dev.

## Routes Prefix

All routes are mounted under `/v1/api/`. Main route groups: `shop` (auth), `product`, `discount`, `cart`, `checkout`, `inventory`.