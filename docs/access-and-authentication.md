# Access & Authentication

JWT-based authentication using per-shop asymmetric key pairs (RSA-style crypto). Every shop gets a unique `privateKey`/`publicKey` stored in the `Keys` collection.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/api/shop/signup` | — | Register a new shop |
| POST | `/v1/api/shop/login` | — | Login, receive token pair |
| POST | `/v1/api/shop/logout` | authV2 | Invalidate session |
| POST | `/v1/api/shop/handleRefreshToken` | authV2 | Rotate tokens |

All routes require the global `x-api-key` header.

## Request / Response

### POST `/shop/signup`
```json
// Request body
{ "name": "My Shop", "email": "shop@example.com", "password": "secret" }

// Response 201
{ "metadata": { "shop": { "_id", "name", "email" }, "tokens": { "accessToken", "refreshToken" } } }
```

### POST `/shop/login`
```json
// Request body
{ "email": "shop@example.com", "password": "secret" }

// Response 200
{ "metadata": { "shop": { "_id", "name", "email" }, "tokens": { "accessToken", "refreshToken" } } }
```

### POST `/shop/logout`
Requires headers: `x-client-id` (shop `_id`) + `authorization` (access token).  
Deletes the `KeyToken` record — both tokens become invalid.

### POST `/shop/handleRefreshToken`
Requires headers: `x-client-id` + `x-rtoken-id` (the refresh token).  
Returns a new `{ accessToken, refreshToken }` pair.

## Token Lifecycle

- **Access token** — signed with `privateKey`, verified with `publicKey`. Expires in **2 days**.
- **Refresh token** — signed with `privateKey` verified with `privateKey` (symmetric on refresh path). Expires in **7 days**.
- On every refresh, the old refresh token is appended to `refreshTokensUsed`. If a used token is presented again, the entire `KeyToken` record is deleted (all sessions invalidated).

## Middleware

**`apiKey`** (`checkAuth.js`) — reads `x-api-key` header, looks up `ApiKey` collection, attaches `req.objKey`. Returns `403` if missing or inactive.

**`permission('0000')`** — checks `req.objKey.permissions` contains `'0000'`. Applied globally on all routes.

**`authenticationV2`** (`authUtils.js`) — for protected routes:
1. Reads `x-client-id` → finds `KeyToken` by `userId`.
2. If `x-rtoken-id` present → verifies refresh token with `privateKey`, sets `req.refreshToken`.
3. Otherwise verifies `authorization` (access token) with `publicKey`, sets `req.user`.

## Data Models

### Shop (`shops` collection)
| Field | Type | Notes |
|-------|------|-------|
| `name` | String | max 150 chars |
| `email` | String | unique |
| `password` | String | bcrypt(10) |
| `status` | String | `active` / `inactive` (default `inactive`) |
| `verify` | Boolean | default `false` |
| `roles` | Array | `['SHOP', 'WRITER', 'EDITOR', 'ADMIN']` |

### KeyToken (`keys` collection)
| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId → Shop | |
| `publicKey` | String | hex |
| `privateKey` | String | hex |
| `refreshToken` | String | current valid refresh token |
| `refreshTokensUsed` | Array | previously used refresh tokens |
