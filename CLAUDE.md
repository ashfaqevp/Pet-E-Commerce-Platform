# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm typecheck    # TypeScript type checking
pnpm lint         # ESLint with auto-fix
```

Use **pnpm only** — no npm or yarn. Run `pnpm postinstall` (via `pnpm install`) to regenerate Nuxt types after config changes.

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
| `supabase/` | DB migrations and Edge Functions |
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
- `admin.ts` middleware protects all `/admin/**` routes
- `auth.client.ts` plugin handles session restore and syncs guest cart to server on login

### Cart architecture

- **Guest**: localStorage via `useLocalStorage`
- **Authenticated**: Supabase RLS-protected queries
- `syncGuestToServer()` in `useCart.ts` merges guest items on login
- Cart Pinia store tracks count; composable handles all operations

### Category system

Product categories are config-driven via `app/domain/categories/category.config.ts`. They have cascading dependencies (pet → type, unit → size). Use `getCategoryOptions()` and `useCategories()` for reactive context. Do not hardcode category values — use the `CATEGORY_CONFIG` and helpers.

### Server API conventions

All `/server/api/admin/**` routes verify the caller is an admin using the Supabase service role key. Paytabs webhook at `/server/api/paytabs/webhook.post.ts` uses XML parsing (fast-xml-parser).

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
