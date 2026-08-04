# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Read `AGENTS.md` first.** This project pins **Next.js 16.2.6** (pre-release, breaking) with **React 19**. APIs, conventions, and file structure differ from mainline. Consult `node_modules/next/dist/docs/` before touching framework code (routing, caching, server/client component rules, `middleware.ts`, route handler signatures). A full dependency/version map lives in `docs/TECH_STACK.md`.

## Commands

```bash
npm run dev          # dev server (localhost:3000)
npm run build        # production build (NODE_OPTIONS=--max-old-space-size=4096)
npm run start        # production server
npm run lint         # ESLint (flat config in eslint.config.mjs)

npx prisma migrate dev --name <name>   # create + apply migration (dev)
npx prisma generate                    # regenerate client after schema edits
npx prisma studio                      # inspect DB
npx tsx scripts/seed-100-products.ts   # seed sample products

docker compose up -d                   # local Redis (6379) + PgBouncer (6432)
```

There is **no test framework** configured — do not assume `npm test` exists. Verify changes via `npm run build` and `npm run lint`.

## Architecture

Single Next.js App Router codebase serving **both** a customer storefront and an admin dashboard. Path alias `@/*` → project root.

- **Route groups:** `app/(admin)/admin/*` (dashboard UI), `app/(auth)/*` (login/register), and ungrouped storefront routes (`men`, `women`, `shop`, `product/[slug]`, `cart`, `checkout`, `account`, `orders`, `wishlist`, `pages`, …). API route handlers live under `app/api/*`, mirroring admin vs public under `app/api/admin/*`.
- **Data:** PostgreSQL via Prisma (`prisma/schema.prisma`, ~30 models covering the full commerce domain). Always import the shared client from `@/lib/prisma` (`lib/prisma.ts`) — it's a global singleton tuned for connection-pool limits; never `new PrismaClient()` in a route.
- **Cache:** `@/lib/redis` exposes the `redis` singleton plus `getCache` / `setCache(key, data, ttl)` / `invalidateCache`. Redis is **fail-soft** — every helper swallows errors and returns null so the app keeps working when Redis is down. Caching is applied selectively (e.g. `app/api/categories`, `app/page.tsx`), not globally.

### Two separate auth systems (don't conflate them)

- **Admin:** JWT in `ag_admin_token` cookie (24h, HS256, signed with `JWT_SECRET`). `middleware.ts` guards all `/admin/*` and `/api/admin/*` routes and enforces `role === 'ADMIN'`. Admin API handlers **additionally** call `await getAdminPayload(req)` from `@/lib/auth` at the top and return 401 on throw — replicate this guard in any new admin route.
- **Customer:** JWT in `ag_customer_token` cookie (7d), issued at login/register/Google-OAuth. Note: most customer-facing API routes (e.g. `app/api/customer/account`) currently identify the user by an **`email` query/body param**, not by verifying this cookie. Match the pattern of the surrounding route rather than introducing a new convention silently.
- Guest checkout creates `User` rows with placeholder passwords prefixed `GUEST_`; login explicitly rejects these. Preserve that check.

### Other conventions

- **Cart & wishlist are client-side only** — `lib/cart.ts` / `lib/wishlist.ts` store JSON in `localStorage` (`ag_cart` / `ag_wishlist`) and dispatch a `window` event (`cart-updated`) for cross-component sync. There is no server-side cart for the storefront flow; the `Cart`/`CartItem` Prisma models are not the source of truth here.
- **Settings** are key-value rows in the `Setting` table, read via `@/lib/settings` (`getSettings`, `getStoreName`) and surfaced app-wide through `SettingsProvider` + `CurrencyProvider` (wrapped in `app/layout.tsx`). Tunables like `reward_point_earn_rate` come from here, not env vars.
- **Validation:** Zod schemas in `lib/validations.ts`, bridged into forms via `react-hook-form` + `@hookform/resolvers`.
- **Stripe** server SDK pins an explicit `apiVersion` (`2026-04-22.dahlia`) — keep it consistent across handlers. Email via Resend in `lib/email.ts`.
- **Rate limiting** exists in two forms: in-memory per-instance (`lib/rateLimit.ts`) and inline Redis-backed counters (see `app/api/auth/login`). The Redis approach is fail-open (logs and continues if Redis errors).
- **Errors:** route handlers log with a bracketed tag (`console.error("[CONTEXT_ERROR]", e)`) and return `NextResponse.json({ message }, { status })`. Follow this shape.

### Production

`ecosystem.config.js` runs PM2 in cluster mode (`instances: 'max'`) with zero-downtime reloads. At multi-instance scale, route Postgres through PgBouncer (transaction mode) and lower Prisma's per-instance `connection_limit` in `DATABASE_URL` accordingly (see comments in `lib/prisma.ts`).

## Environment

Set in `.env`: `DATABASE_URL` + `DIRECT_DATABASE_URL` (pooled + direct for migrations), `REDIS_URL`, `JWT_SECRET` (admin auth fails closed without it), plus Stripe / Resend / Google OAuth credentials.
