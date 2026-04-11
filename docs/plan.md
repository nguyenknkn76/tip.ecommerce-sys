# Project Plan

Draft plan covering backend development, testing, frontend, and deployment.

---

## 1. Backend — Bug Fixes & Feature Completion

> Fix correctness issues before adding anything new. Ordered by severity.

### Phase 1 — Critical Bugs (break existing features)

- [ ] **Auth** — `await bcrypt.compare` in `access.service.js:118` — any password passes login right now
- [ ] **Auth** — fix `removeKeyById` filter: `deleteOne({_id: id})` not `deleteOne(id)` — logout is a no-op
- [ ] **Auth** — stop swallowing errors in `createKeyToken` — `catch(e) { return error }` returns Error object as success value
- [ ] **Discount** — fix `totalOrder` scope: move `reduce` outside the `min_order_value > 0` guard — percentage discounts always return 0
- [ ] **Discount** — fix `deleteDiscountCode` filter: `discount_code: codeId` not `discount_applies_to: codeId` — delete never works
- [ ] **Discount** — record usage after applying: `$inc uses_count`, `$inc max_uses -1`, `$addToSet users_used` — currently every code is unlimited-use
- [ ] **Cart** — fix `quantity === 0` in `addToCartV2` — call `deleteUserCart` instead of doing nothing
- [ ] **Cart** — fix `deleteUserCart` response — use `findOneAndUpdate` + `{new:true}` instead of `updateOne`, returns raw write result now
- [ ] **Product** — `await` the `clothing.create` / `electronic.create` calls before the null check — Promise is always truthy
- [ ] **Product** — fix `publishProductByShop` / `unPublishProductByShop` — replace `findOne + updateOne(fullDoc)` with single `$set` update

### Phase 2 — Security Fixes (exploitable)

- [ ] **Cart** — add `authenticationV2` to all cart routes — `userId` currently comes from request body, any user can read/write any cart
- [ ] **Cart** — never trust client-supplied price — overwrite `product.price` from DB (`getProductById`) in `addToCartV3`
- [ ] **Cart** — validate product exists and is published before adding in `addToCartV3`
- [ ] **Product** — add `product_shop` ownership filter to `updateProductById` — any shop can update any product by ID
- [ ] **Discount** — strip `uses_count` and `users_used` from create payload — always initialize to `0` / `[]` server-side
- [ ] **Discount** — fix `applies_to === 'specific'` query — re-enable `product_shop` filter to prevent cross-shop product leakage
- [ ] **Discount** — complete `max_uses_per_user` enforcement — replace the `console.log` TODO with an actual usage count check and `BadRequestError`
- [ ] **Auth** — wrap JWT errors in `AuthFailureError` — `TokenExpiredError` / `JsonWebTokenError` currently leak raw to client
- [ ] **Auth** — shorten access token TTL from `'2 days'` to `'15m'`

### Phase 3 — Feature Completion (incomplete implementations)

- [ ] **Discount** — add `discount_max_value` field to schema — currently saved in service but silently dropped by Mongoose
- [ ] **Discount** — fix `discount_users_used` structure inconsistency — pick one format (plain userId string) for `$addToSet`, `$pull`, and per-user lookup
- [ ] **Discount** — fix date validation logic — allow future `start_date` (scheduled discounts), only reject expired `end_date`
- [ ] **Discount** — add routes + controller handlers for `deleteDiscountCode` and `cancelDiscountCode` — both exist in service but are unreachable
- [ ] **Cart** — fix `cart_userId` type to `ObjectId` — currently `Number`, `+userId` coercion returns `NaN` for ObjectId strings
- [ ] **Product** — implement `Furnitures.updateProduct` — falls back to base which ignores `product_attributes`
- [ ] **Product** — fix `Clothing.updateProduct` — add `removeUndefinedObject` + `updateNestedObjectParser` before clothes collection update
- [ ] **Auth** — remove `handleRefreshToken` V1 dead code — rename V2 to `handleRefreshToken`
- [ ] **Product** — rename `xxx.advanced.product.service.js` → `product.service.js`, delete old switch-based `product.service.js` and `product.config.js`

### Phase 4 — Performance (indexes, caching)

- [ ] Add compound indexes: `{discount_code:1, discount_shopId:1}`, `{discount_shopId:1, discount_is_active:1}`
- [ ] Add compound indexes: `{product_shop:1, isDraf:1}`, `{product_shop:1, isPublished:1}`
- [ ] Add index: `{cart_userId:1, cart_state:1}`
- [ ] Add indexes on `keys` collection: `{refreshToken:1}`, `{refreshTokensUsed:1}`
- [ ] Cache API key lookup in Redis — hits MongoDB on every request
- [ ] Cache KeyToken lookup in Redis — hits MongoDB on every authenticated request
- [ ] Cache `checkDiscountExists` in Redis (60s TTL) — called on every checkout review
- [ ] Cache `GET /product/:id` and `GET /product/` in Redis (60s TTL) — high-traffic public endpoints
- [ ] Cache active cart in Redis (300s TTL) — invalidate on write
- [ ] Replace N+1 in `checkProductByServer` with single `$in` query
- [ ] Add `Bearer` token prefix parsing in `authUtils.js`

---

## 2. Testing Plan

### Manual Testing (current approach — `.http` files in `backend/src/postman/`)

- [ ] **Auth flow**: signup → login → get token → use token → refresh → logout
- [ ] **Auth edge cases**: wrong password, expired token, invalid API key, missing headers, reused refresh token
- [ ] **Product CRUD**: create draft → publish → update → search → unpublish → verify ownership enforcement
- [ ] **Discount**: create code → list products for code → apply to order → apply expired code → exceed max uses
- [ ] **Cart**: add item → add same item again (quantity increment) → add different item → update quantity → delete item → get cart
- [ ] **Cart edge cases**: add with `quantity=0`, add non-existent product, add unpublished product, invalid userId
- [ ] **Checkout review**: single shop no discount → single shop with discount → multi-shop → discount min order not met → invalid cartId
- [ ] **Cross-feature**: login → create product → add to cart → create discount → checkout review

### Unit / Integration Tests (to be set up)

- [ ] Choose a test framework — **Jest** is the standard choice for Node.js; add to `devDependencies`
- [ ] Add `npm test` script: `jest --coverage` (replace current `nodemon test.js`)
- [ ] Create `backend/src/__tests__/` directory structure mirroring `services/`

**Priority test cases to write first:**

- [ ] `access.service` — signUp duplicate email, login wrong password, refresh token reuse detection
- [ ] `discount.service` — `getDiscountAmount` calculation (fixed vs percentage), expired code, below min order, max uses exceeded
- [ ] `cart.service` — addToCart creates cart, addToCart increments existing, addToCartV2 ownership check, delete removes item
- [ ] `product.service` — createProduct inserts to both collections with same `_id`, publishProduct sets flags, updateProduct ownership
- [ ] `checkout.service` — checkoutReview with and without discount, invalid cart, missing product

**Test infra checklist:**
- [ ] Use `mongodb-memory-server` for in-memory MongoDB — no real DB needed for unit tests
- [ ] Mock Redis in tests (`jest.mock('../services/redis.service')`)
- [ ] Add `.env.test` with `NODE_ENV=test` and test DB config
- [ ] Add coverage thresholds in `jest.config.js` (`branches: 70, functions: 80`)

---

## 3. Frontend Development Plan

> No frontend exists yet. This is a greenfield plan.

### Tech Stack Decisions

- [ ] Choose framework: **Next.js 14** (App Router) — SSR for product pages (SEO), client components for cart/checkout
- [ ] State management: **Zustand** for cart state, auth state — lightweight, no boilerplate
- [ ] Data fetching: **TanStack Query (React Query)** — caching, background refetch, loading/error states
- [ ] Styling: **Tailwind CSS** — utility-first, pairs well with component libraries
- [ ] HTTP client: **axios** with an interceptor for `x-api-key` + `Authorization` headers + auto token refresh
- [ ] Form validation: **React Hook Form** + **Zod** — schema-based, works with TypeScript

### Project Structure

```
frontend/
  app/
    (shop)/          # shop-owner pages (auth required)
      dashboard/
      products/
      discounts/
    (store)/         # customer pages (public)
      products/
      cart/
      checkout/
    auth/
      login/
      signup/
  components/
  hooks/
  lib/
    api/             # one file per domain (auth.api.ts, product.api.ts, ...)
    store/           # Zustand stores
  types/
```

### Feature Implementation Order

- [ ] **Auth pages**: signup, login, logout, token refresh interceptor in axios
- [ ] **Product listing** (public): product grid, search, pagination, product detail page
- [ ] **Cart**: add to cart, cart sidebar/drawer, quantity update, delete item
- [ ] **Checkout review**: order summary, discount code input, totals breakdown
- [ ] **Shop dashboard**: create product, publish/unpublish, draft list, published list
- [ ] **Discount management**: create discount code, list codes, applicable products

### API Integration Checklist

- [ ] Create axios instance with `baseURL`, default `x-api-key` header
- [ ] Add request interceptor — inject `x-client-id` and `Authorization` from stored token
- [ ] Add response interceptor — on 401: call refresh token endpoint, retry original request; on second 401: redirect to login
- [ ] Store `accessToken` in memory (not localStorage) — store `refreshToken` in `httpOnly` cookie
- [ ] Handle all error shapes from `core/error.response.js` — display `error.message` to user

### Key Pages & Components

- [ ] `ProductCard` — name, price, thumbnail, add-to-cart button
- [ ] `CartDrawer` — item list, quantity stepper, subtotal, checkout CTA
- [ ] `CheckoutSummary` — per-shop order breakdown, discount input, fee ship, total
- [ ] `AuthGuard` — HOC / layout that redirects to login if no valid token
- [ ] `ProductForm` — create/edit product with type-specific attribute fields (Electronics / Clothing / Furniture)
- [ ] `DiscountForm` — date pickers, applies_to toggle, product selector for `specific` type

---

## 4. Deployment Checklist

### Environment & Config

- [ ] Create `.env.production` — never commit to git, use secrets manager (GitHub Secrets, Doppler, or AWS SSM)
- [ ] Required env vars: `NODE_ENV`, `PORT`, `MONGODB_URI`, `REDIS_URL`, `JWT_ACCESS_SECRET` (or keypair), `API_KEY_SALT`
- [ ] Verify `config.mongodb.js` reads correct `NODE_ENV` env — `shopPRO` in production, `shopDEV` in dev
- [ ] Remove all `console.log` debug statements or replace with a proper logger (e.g. `pino` or `winston`)
- [ ] Ensure no hardcoded secrets in source (API keys, tokens in postman `.http` files — add to `.gitignore`)

### Database

- [ ] Run all pending schema migrations (add missing `discount_max_value` field, change `cart_userId` type)
- [ ] Create all missing indexes before going live (see Phase 4 list above)
- [ ] Enable MongoDB authentication — no unauthenticated access in production
- [ ] Set up MongoDB Atlas or a managed instance with automated backups (daily minimum)
- [ ] Test connection pooling config (`maxPoolSize: 50` in `init.mongodb.js`) under expected load
- [ ] Seed at least one API key into the `apikeys` collection before first request

### Redis

- [ ] Confirm Redis is accessible from the app server (`REDIS_URL` env)
- [ ] Set a `maxmemory` policy (`allkeys-lru`) — prevent Redis from filling up and crashing
- [ ] Verify `acquireLock` / `releaseLock` in `redis.service.js` works against production Redis
- [ ] Enable Redis persistence (RDB or AOF) if cart/lock data must survive restarts

### Security Hardening

- [ ] Confirm `helmet` middleware is active in `app.js` — sets security headers (CSP, HSTS, X-Frame-Options)
- [ ] Add `express-rate-limit` on `/shop/login` and `/shop/signup`
- [ ] Enable CORS with an explicit `origin` whitelist — no wildcard `*` in production
- [ ] Validate all `ObjectId` params before DB queries — unvalidated IDs cause Mongoose `CastError` 500s
- [ ] Ensure error middleware in `app.js` does NOT send stack traces in production responses
- [ ] Rotate all API keys and JWT secrets used during development before going live

### Process & Infra

- [ ] Use **PM2** or a container orchestrator — `node server.js` directly will not auto-restart on crash
  ```bash
  pm2 start server.js --name tip-ecommerce -i max   # cluster mode
  pm2 save && pm2 startup
  ```
- [ ] Or containerise with Docker:
  - [ ] Write `Dockerfile` (node:20-alpine, non-root user, `npm ci --omit=dev`)
  - [ ] Write `docker-compose.yml` for local: app + MongoDB + Redis
  - [ ] Add `.dockerignore` — exclude `node_modules`, `.env`, `postman/`
- [ ] Set up a reverse proxy (Nginx or Caddy) in front of the Node server — TLS termination, gzip, rate limiting at edge
- [ ] Configure TLS/HTTPS — Let's Encrypt via Certbot or Caddy's auto-HTTPS
- [ ] Set `NODE_ENV=production` in the process environment — affects MongoDB db name and Express error output

### CI/CD

- [ ] Add a GitHub Actions workflow:
  - [ ] On pull request: `npm ci` + `npm test` + lint
  - [ ] On push to `main`: build Docker image → push to registry → deploy
- [ ] Block merge to `main` if tests fail
- [ ] Store secrets in GitHub Actions secrets — never in workflow YAML

### Monitoring & Observability

- [ ] Set up structured request logging — `morgan` is already in `app.js`, switch format to `json` in production
- [ ] Add a health check endpoint: `GET /health` → `{ status: 'ok', db: 'connected', redis: 'connected' }`
- [ ] Set up uptime monitoring (Better Uptime, UptimeRobot, or Grafana Cloud free tier)
- [ ] Configure error alerting — Sentry (Node SDK) or a self-hosted equivalent
- [ ] Export MongoDB metrics to a dashboard (Atlas has built-in; or use `mongostat` + Grafana)

### Pre-launch Smoke Tests

- [ ] Signup → login → logout cycle works end-to-end
- [ ] Create product → publish → visible in public listing
- [ ] Add to cart → checkout review → discount applied correctly
- [ ] Refresh token rotation works (old token rejected after rotation)
- [ ] Redis lock acquired and released during checkout (verify no stuck locks)
- [ ] 404 and 500 responses do not include stack traces
- [ ] All routes return correct HTTP status codes (201 for create, 200 for others, 400/401/403/404 for errors)
