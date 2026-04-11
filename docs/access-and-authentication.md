# Access & Authentication

---

## Two-Layer Security Model

Every request passes through **two independent security layers** before reaching any route handler:

```
Request
  │
  ▼
[Layer 1] API Key check  (x-api-key header)
  │  → find key in `apikeys` collection where status=true
  │  → attach req.objKey
  ▼
[Layer 2] Permission check  permission('0000')
  │  → confirm req.objKey.permissions includes '0000'
  ▼
[Layer 3] JWT auth  (protected routes only — authenticationV2)
  │  → validate x-client-id + authorization (or x-rtoken-id)
  │  → attach req.user + req.keyStore
  ▼
Route handler
```

Layer 1 & 2 are global in `routes/index.js`.  
Layer 3 sits as `router.use(authenticationV2)` inside `routes/access/index.js`, splitting public from protected routes.

---

## Data Models

### Shop (`shops` collection)

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | max 150 chars |
| `email` | String | unique |
| `password` | String | bcrypt hash, 10 salt rounds |
| `status` | String | `'active'` / `'inactive'`, default `'inactive'` |
| `verify` | Boolean | default `false` |
| `roles` | Array | `['SHOP']` on signup — also: WRITER, EDITOR, ADMIN |

### ApiKey (`apikeys` collection)

| Field | Type | Notes |
|-------|------|-------|
| `key` | String | unique random hex |
| `status` | Boolean | must be `true` to pass |
| `permissions` | [String] | enum: `'0000'`, `'1111'`, `'2222'` |

### KeyToken (`keys` collection)

| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId | ref → Shop |
| `publicKey` | String | 64-byte hex — verifies access token |
| `privateKey` | String | 64-byte hex — verifies refresh token |
| `refreshToken` | String | current valid refresh token |
| `refreshTokensUsed` | Array | consumed refresh tokens (reuse detection) |

---

## Data Flows

### Sign Up

```
POST /v1/api/shop/signup  {name, email, password}

1. Check email not in shops → BadRequestError if duplicate
2. bcrypt.hash(password, 10)
3. shopModel.create({ name, email, password: hash, roles: ['SHOP'] })
4. crypto.randomBytes(64).toString('hex') × 2  →  publicKey, privateKey
5. KeyTokenService.createKeyToken (upsert) — stores keypair, resets refreshTokensUsed
6. createTokenPair:
     accessToken  = JWT.sign({userId, email}, publicKey,  { expiresIn: '2 days' })
     refreshToken = JWT.sign({userId, email}, privateKey, { expiresIn: '7 days' })
7. Return { shop: {_id, name, email}, tokens }
```

### Login

```
POST /v1/api/shop/login  {email, password}

1. findByEmail → BadRequestError if not found
2. await bcrypt.compare(password, shop.password) → AuthFailureError if false
3. Generate NEW keypair (fresh keys every login — invalidates prior session)
4. Upsert KeyToken (overwrites old keypair, clears refreshTokensUsed)
5. Sign new token pair
6. Return { shop: {_id, name, email}, tokens }
```

### authenticationV2 Middleware

```
Any protected request

1. Read x-client-id → AuthFailureError if missing
2. KeyTokenService.findByUserId(userId) → NotFoundError if missing
3a. If x-rtoken-id present:
      JWT.verify(refreshToken, keyStore.privateKey)
      attach req.user, req.keyStore, req.refreshToken → next()
3b. Else:
      JWT.verify(accessToken, keyStore.publicKey)
      confirm decoded.userId === x-client-id
      attach req.user, req.keyStore → next()
```

### Refresh Token (V2)

```
POST /v1/api/shop/handleRefreshToken
Headers: x-client-id, x-rtoken-id
(authenticationV2 has already verified the token)

1. refreshToken in keyStore.refreshTokensUsed?
     YES → token reuse detected → deleteKeyById(userId) → ForbiddenError('Pls relogin')
2. keyStore.refreshToken !== incoming token → AuthFailureError
3. Verify shop still exists
4. createTokenPair (same keypair, new token values)
5. keyStore.$set refreshToken = new,  $addToSet refreshTokensUsed = old
6. Return { user, tokens }
```

### Logout

```
POST /v1/api/shop/logout
(authenticationV2 attaches req.keyStore)

1. KeyTokenService.removeKeyById(keyStore._id)
   → deleteOne(keyStore._id)   ← passes _id object, not a filter
2. Return deleted document
```

---

## Best Practices Used

### 1. Refresh Token Rotation with Reuse Detection
Every refresh issues a new token pair and moves the old refresh token into `refreshTokensUsed`. If a previously consumed token appears again, the entire keyStore is deleted — forcing re-login. This catches stolen token replays.

### 2. Per-User Keypair (Session Isolation)
Each shop gets its own `publicKey`/`privateKey`. A compromised key only affects one shop. New login replaces the keypair, instantly invalidating any prior tokens.

### 3. Upsert for KeyToken
`KeyTokenService.createKeyToken` uses `findOneAndUpdate` with `upsert: true`. Safe to call on both signup and login without checking if a record already exists.

### 4. `asyncHandler` for Clean Error Propagation
All route handlers are wrapped in `asyncHandler(fn)` which calls `.catch(next)`. Thrown errors from services propagate cleanly to the Express error middleware in `app.js` without try/catch in every handler.

### 5. Defense in Depth (API Key + JWT)
API key gates the platform boundary; JWT gates individual user actions. Either layer can be changed independently without breaking the other.

### 6. `lean()` on Read Queries
`findByRefreshTokenUsed` uses `.lean()` — returns plain JS objects instead of full Mongoose documents. Faster for read-only paths where you don't need `.save()` or virtuals.

### 7. bcrypt Password Hashing
`bcrypt.hash(password, 10)` with 10 salt rounds. Verified with `bcrypt.compare` — no plaintext ever stored or compared.

---

## Issues Found

| # | Location | Problem |
|---|----------|---------|
| 1 | `access.service.js:118` | `bcrypt.compare` **not awaited** — `match` is always a truthy Promise, any password passes login |
| 2 | `keyToken.service.js:42` | `deleteOne(id)` receives a raw ObjectId not a filter `{_id: id}` — logout silently no-ops |
| 3 | `keyToken.service.js:8` | `createKeyToken` swallows errors with `catch(e) { return error }` — callers can't distinguish success from failure |
| 4 | `access.service.js:59` | `handleRefreshToken` V1 is dead code — controller uses V2 only |
| 5 | `authUtils.js:54` | JWT errors re-thrown raw (`TokenExpiredError`, `JsonWebTokenError`) — inconsistent error shape to client |
| 6 | `shop.model.js` | `status: 'inactive'` / `verify: false` set on signup but never enforced on login |
| 7 | `checkAuth.js` | API keys must be manually seeded into MongoDB — no management endpoint |
| 8 | `authUtils.js:15` | `publicKey` signs access token, `privateKey` signs refresh token — inverted from RSA convention, confusing naming |
| 9 | `routes/access` | No rate limiting on `/shop/login` or `/shop/signup` — open to brute force |
| 10 | `authUtils.js` | `authorization` header expects raw JWT — any client sending `Bearer <token>` silently fails |
| 11 | `keyToken.model.js` | `refreshTokensUsed` array grows unboundedly — no cap or TTL pruning |
| 12 | `apikey.service.js` | API key stored as plaintext — if DB is compromised, all keys are immediately usable |
| 13 | `authUtils.js` | Access token TTL is 2 days — far too long; limits damage window if a token leaks |

---

## Performance & Security Improvements

### Security

- **Critical: `await bcrypt.compare`** — missing `await` at `access.service.js:118` means any password passes. Fix immediately.
- **Shorten access token TTL** — 2 days is excessive. Standard is 15–60 minutes. Refresh tokens handle UX continuity; short-lived access tokens limit exposure if leaked:
  ```js
  JWT.sign(payload, publicKey, { expiresIn: '15m' })
  ```
- **Rate limit auth endpoints** — add `express-rate-limit` to block brute-force and credential stuffing:
  ```js
  const rateLimit = require('express-rate-limit');
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
  router.post('/shop/login', loginLimiter, asyncHandler(accessController.login));
  ```
- **Hash API keys at rest** — storing plaintext keys means a DB dump exposes all of them. Store a SHA-256 hash; compare on incoming request:
  ```js
  const hashed = crypto.createHash('sha256').update(key).digest('hex');
  await apikeyModel.findOne({ key: hashed, status: true }).lean();
  ```
- **Cap `refreshTokensUsed` array** — unbounded growth is both a memory concern and makes reuse-detection queries slower. Cap at the last 20 entries:
  ```js
  $push: { refreshTokensUsed: { $each: [oldToken], $slice: -20 } }
  ```
- **Enforce shop `status` on login** — currently `status: 'inactive'` is set on signup but never checked. Add a guard in `AccessService.login`:
  ```js
  if (foundShop.status === 'inactive') throw new ForbiddenError('Shop not activated');
  ```
- **Support `Bearer` token prefix** — standard HTTP clients send `Authorization: Bearer <token>`. Strip the prefix in `authUtils.js`:
  ```js
  const raw = req.headers[HEADER.AUTHORIZATION];
  const accessToken = raw?.startsWith('Bearer ') ? raw.slice(7) : raw;
  ```
- **Wrap JWT errors** — expose `expired` vs `invalid` without leaking internal error types:
  ```js
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw new AuthFailureError('Token expired');
    throw new AuthFailureError('Invalid token');
  }
  ```

### Performance

- **Cache API key lookup in Redis** — `apikey.service.findById` hits MongoDB on every single request. API keys rarely change — cache with a long TTL:
  ```js
  const cached = await redis.get(`apikey:${key}`);
  if (cached) return JSON.parse(cached);
  const objKey = await apikeyModel.findOne({ key, status: true }).lean();
  await redis.setEx(`apikey:${key}`, 3600, JSON.stringify(objKey));
  // invalidate: redis.del(`apikey:${key}`) on key revocation
  ```
- **Cache KeyToken lookup in Redis** — `findByUserId` runs a DB query on every authenticated request. Cache with a short TTL, invalidate on logout and refresh:
  ```js
  // on login/signup:  redis.setEx(`keytoken:${userId}`, 300, JSON.stringify(keyStore))
  // on logout/refresh: redis.del(`keytoken:${userId}`)
  ```
- **Add indexes on `keys` collection** — `findByRefreshToken` and `findByRefreshTokenUsed` do full scans:
  ```js
  keyTokenSchema.index({ refreshToken: 1 });
  keyTokenSchema.index({ refreshTokensUsed: 1 });
  ```
  Redis is already in the stack (used by checkout), so no new dependency needed for caching.

---

## Optimization Plan

### Phase 1 — Fix Bugs (Critical)

**1. Await `bcrypt.compare` (Issue #1)**
```js
// access.service.js:118
const match = await bcrypt.compare(password, foundShop.password);
if (!match) throw new AuthFailureError('[Error] Authentication error');
```

**2. Fix `removeKeyById` filter (Issue #2)**
```js
// keyToken.service.js
static removeKeyById = async (id) => {
  return await keytokenModel.deleteOne({ _id: id });
}
```

**3. Stop swallowing errors in `createKeyToken` (Issue #3)**
```js
// Remove try/catch or re-throw — never return an Error object as a value
} catch (error) {
  throw error;
}
```

**4. Wrap JWT errors in `authenticationV2` (Issue #5)**
```js
} catch (error) {
  if (error.name === 'TokenExpiredError') throw new AuthFailureError('Token expired');
  throw new AuthFailureError('Invalid token');
}
```

---

### Phase 2 — Cleanup (Medium priority)

**5. Delete `handleRefreshToken` V1 (Issue #4)**

Remove `static handleRefreshToken` (lines 59–99) from `access.service.js`. Rename `handleRefreshTokenV2` → `handleRefreshToken`.

**6. Support `Bearer` token format (Issue #10)**
```js
const raw = req.headers[HEADER.AUTHORIZATION];
const accessToken = raw?.startsWith('Bearer ') ? raw.slice(7) : raw;
```

**7. Rename keypair fields (Issue #8)**

`publicKey`/`privateKey` names are misleading — these are symmetric HMAC secrets, not RSA keys. Rename to `accessTokenSecret` / `refreshTokenSecret` across `authUtils.js`, `access.service.js`, `keyToken.service.js`, and the `keys` collection (DB migration).

---

### Phase 3 — Enhancements (Lower priority)

**8. Add Redis caching for API key and KeyToken lookups**

Eliminates DB hits on every request. Both can be cached with TTLs and invalidated on change events (logout, key revocation).

**9. Shorten access token TTL to 15 minutes**

Reduces the blast radius of a leaked token. Clients already handle expiry via the refresh token flow.

**10. Rate limit `/shop/login`**

10 attempts per 15 minutes per IP using `express-rate-limit`.

**11. Add shop activation flow**

Either auto-activate on signup, or implement `POST /shop/verify` with a one-time token. Enforce `status === 'active'` check in `login`.

**12. Add API key management endpoint**

```
POST /v1/api/admin/apikey  (requires '2222' permission)
→ generate key, hash it, store hash in DB
→ return the plaintext key once (never stored)
```

**13. Cap `refreshTokensUsed` with `$slice`**

Prevent unbounded array growth and keep reuse-detection queries fast.

---

## Files Reference

| File | Role |
|------|------|
| `auth/checkAuth.js` | Layer 1 & 2 — API key + permission middleware |
| `auth/authUtils.js` | Layer 3 — JWT auth middleware + `createTokenPair` |
| `services/access.service.js` | signUp, login, logout, handleRefreshTokenV2 |
| `services/keyToken.service.js` | CRUD for KeyToken documents |
| `services/apikey.service.js` | Lookup API key from DB |
| `models/shop.model.js` | Shop schema |
| `models/keytoken.model.js` | KeyToken schema |
| `models/apikey.model.js` | ApiKey schema |
| `routes/access/index.js` | Public vs protected route split |
| `routes/index.js` | Global API key + permission middleware |
| `helpers/asyncHandler.js` | Propagates async errors to Express error middleware |
