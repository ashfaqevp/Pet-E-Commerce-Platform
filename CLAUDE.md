# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm typecheck    # TypeScript type checking
pnpm lint         # ESLint with auto-fix
pnpm postinstall  # Regenerate Nuxt types (run after nuxt.config changes)
```

Use **pnpm only** — no npm or yarn. No test suite exists yet.

## Architecture

**Nuxt 4 SPA** (`ssr: false`) — Vue 3 + TypeScript strict mode. All code lives under `app/` (Nuxt's app directory convention). The backend is serverless: Supabase for auth/DB and Nuxt server routes for secure operations.

### Directory map

| Path | Purpose |
|------|---------|
| `app/pages/` | File-based routing. `/admin/**` is middleware-protected. |
| `app/components/ui/` | shadcn-vue components — auto-imported, use as `<Button />` |
| `app/components/admin/` | Admin dashboard components |
| `app/stores/` | Pinia stores (auto-imported) — auth dialog state, cart count |
| `app/composables/` | Business logic — auth, cart, orders, profile, addresses |
| `app/domain/categories/` | Config-driven category system (not DB-driven) |
| `app/layouts/` | `default.vue` (main), `admin.vue` (sidebar), `admin-auth.vue` |
| `app/middleware/` | `admin.ts` (route guard), two `.global.ts` guards |
| `app/plugins/` | `auth.client.ts` (session restore + guest cart sync), `seo.global.ts` |
| `app/lib/utils.ts` | `formatOMR()`, `formatOmanPhone()`, status helpers |
| `app/assets/css/main.css` | Tailwind v4 with OKLch CSS variables, dark mode |
| `server/api/` | Server routes using Supabase service role (secure) |
| `server/api/paytabs/` | Payment gateway: create, verify, webhook |
| `server/api/admin/` | User management (create wholesaler, delete user) |
| `supabase/functions/` | Deno edge functions (Razorpay order creation) |
| `scripts/` | One-off data processing (CSV → JSON) |

### Auto-import rules

- **Never manually import** from `app/` — Nuxt auto-imports all composables, stores, utils, and components.
- Components in `app/components/**` are available globally without prefix (`<ProductCard />`, not `<ProductsProductCard />`).
- `app/domain/` is **NOT auto-imported** — must be explicitly imported when used.

### Data fetching pattern

```ts
const { data, pending } = await useLazyAsyncData('unique-key', async () => {
  const supabase = useSupabaseClient()
  const { data, error } = await supabase.from('table').select('*')
  if (error) throw error
  return data
}, { server: true })
```

### Authentication & roles

Three roles: **admin**, **wholesale**, **retail** (default).

- Retail: Google OAuth via Supabase
- Wholesale: email/password (accounts created by admin only)
- Role is fetched server-side via `/api/auth/get-role` using the service role key
- `admin.ts` middleware protects all `/admin/**` routes; on failure redirects to `/admin/login?redirect=<path>`
- `auth.client.ts` plugin handles session restore and syncs guest cart to server on login (non-blocking via `queueMicrotask`)

### Cart architecture

Two implementations exist — use the **composable**, not the store directly:

- `useCart()` composable — the primary implementation. Guest (localStorage) + authenticated (Supabase RLS) hybrid. `syncGuestToServer()` merges guest items on login.
- `useCartStore` Pinia store — tracks cart count for the navbar badge only.

The `auth.client.ts` plugin watches `onAuthStateChange`; on `SIGNED_IN` / `INITIAL_SESSION` it calls `syncGuestToServer()` then `refreshNuxtData()`.

### Role-aware pricing

`useCheckoutOrder` reads `profiles.role` at order creation time and applies `wholesale_price` or `retail_price` accordingly. Prices are baked into order item snapshots and are immutable after creation.

### Category system

Product categories are config-driven via `app/domain/categories/category.config.ts`. They have cascading dependencies: `pet → age`, `unit → size`, `type → flavour`.

Key helpers in `category.helpers.ts` (must import explicitly from `app/domain/`):
- `getCategoryOptions(key, context)` — options for a field given current form state
- `isCategoryVisible(key, context)` / `isCategoryRequired(key, context)` — driven by `dependsOn` rules
- `getVisibleKeys(context)` / `collectCategoryIssues(context)` — for form validation
- `getDependents(key)` — find downstream fields to reset when a parent changes

Use `useCategories()` composable for reactive form context. Never hardcode category values.

### Middleware

- `admin.ts` — checks auth + admin role, redirects unauthenticated users
- `admin-logout.global.ts` — if an admin user navigates outside `/admin/**`, they are automatically signed out (security invariant)
- `clear-search.global.ts` — strips `?q=` search param on any route except `/products`

### Server API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/get-role` | GET | Returns `profiles.role` using service role key |
| `/api/paytabs/create` | POST | Creates PayTabs transaction, stores `tran_ref` on order |
| `/api/paytabs/verify` | POST | Verifies a transaction status |
| `/api/paytabs/webhook` | POST | HMAC-verified webhook; updates order status (idempotent — source of truth for payment status) |
| `/api/admin/users` | GET | List users (admin only) |
| `/api/admin/create-wholesaler` | POST | Create wholesale account |
| `/api/admin/delete-user` | DELETE | Delete user |
| `/api/admin/update-wholesaler-email` | POST | Update wholesale email |

All `/server/api/admin/**` routes verify the caller is admin via the service role key. The PayTabs webhook uses XML parsing (`fast-xml-parser`) — **never update payment status in `/create`**, only in the webhook handler.

### Payment flow

1. Frontend creates order → calls `/api/paytabs/create` → receives `tran_ref` + `redirect_url`
2. User is redirected to PayTabs hosted page
3. PayTabs POSTs to `/api/paytabs/webhook` (HMAC-verified) → order status updated
4. Razorpay (secondary) is handled via a Deno edge function in `supabase/functions/create-razorpay-order/`

## Component style

- `<script setup lang="ts">` → `<template>` — no `<style>` blocks (Tailwind only)
- Mobile-first: default styles for mobile, `md:` and `lg:` for larger screens
- Colors: `text-foreground` (black), teal `#0f766e` (`bg-secondary`), orange `#FF9500` (`text-accent`)
- Container width: `max-w-7xl`
- Font: Poppins (loaded via Google Fonts in layout)

## Environment variables

Required in `.env`:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server-only, never expose to client
SUPABASE_FUNCTION_URL=
SITE_URL=
PAYTABS_PROFILE_ID=
PAYTABS_SERVER_KEY=
PAYTABS_CLIENT_KEY=
PAYTABS_BASE_URL=
PAYTABS_CALLBACK_URL=
PAYTABS_RETURN_URL=
RAZORPAY_KEY_ID=              # secondary payment option
```
