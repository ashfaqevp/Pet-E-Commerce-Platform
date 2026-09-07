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

### Path aliases

- `~/` and `@/` both resolve to `app/` (Nuxt convention)
- `~/domain/categories/...` — explicit import required (not auto-imported)

### Directory map

| Path | Purpose |
|------|---------|
| `app/pages/` | File-based routing. `/admin/**` is middleware-protected. |
| `app/components/ui/` | shadcn-vue components — auto-imported, use as `<Button />` |
| `app/components/admin/` | Admin dashboard components. CRUD modals use a Sheet pattern: `BrandSheet.vue`, `PetTypeSheet.vue` |
| `app/stores/` | Pinia stores (auto-imported) — `useAuthStore` (auth dialog state), `useCartStore` (navbar badge count), `useProductsStore` |
| `app/composables/` | Business logic — auth, cart, orders, profile, addresses, brands, pet types |
| `app/domain/categories/` | Config-driven category system (partially migrated to DB — see below) |
| `app/layouts/` | `default.vue` (main), `admin.vue` (sidebar), `admin-auth.vue` |
| `app/middleware/` | `admin.ts` (route guard), two `.global.ts` guards |
| `app/plugins/` | `auth.client.ts` (session restore + guest cart sync), `seo.global.ts` |
| `app/lib/utils.ts` | `cn()` — clsx + tailwind-merge helper for conditional classes |
| `app/utils/index.ts` | `formatOMR()`, `formatOmanPhone()`, `orderStatusStyle()`, `paymentStatusStyle()`, `canOrderTransition()` — auto-imported |
| `app/assets/css/main.css` | Tailwind v4 with OKLch CSS variables, dark mode |
| `server/api/` | Server routes using Supabase service role (secure) |
| `server/api/paytabs/` | Payment gateway: create, verify, webhook |
| `server/api/admin/` | User management (create wholesaler, delete user) |
| `supabase/functions/` | Deno edge functions (Razorpay order creation) |
| `types/database.types.ts` | Generated Supabase DB types — regenerate with `pnpm supabase gen types` |
| `scripts/` | One-off data processing (CSV → JSON) |
| `data/` | Static JSON files used by seed scripts, not imported by the app |

### Auto-import rules

- **Never manually import** from `app/` — Nuxt auto-imports all composables, stores, utils, and components.
- Components in `app/components/**` are auto-imported under a **path-prefixed** name — Nuxt's default, since the `components` option in `nuxt.config.ts` is commented out. `app/components/admin/brands/BrandSheet.vue` is `<AdminBrandsBrandSheet />`, `app/components/admin/storage/CompressSheet.vue` is `<AdminStorageCompressSheet />`. Only components directly in `app/components/` keep a bare name.
- `app/domain/` is **NOT auto-imported** — must be explicitly imported when used.
- `@iconify/vue` icons are wrapped in `<Icon name="lucide:..." />` — use that component, not the raw `Icon` from iconify.

### Data fetching pattern

```ts
const { data, pending } = await useLazyAsyncData('unique-key', async () => {
  const supabase = useSupabaseClient()
  const { data, error } = await supabase.from('table').select('*')
  if (error) throw error
  return data
}, { server: true })
```

### Form validation

Forms use **vee-validate + zod** (`@vee-validate/nuxt` auto-imports `useForm`, `Field`, etc.). Define a zod schema, pass it to `useForm({ validationSchema: toTypedSchema(schema) })`.

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

### Category system (partially migrated to DB)

The category config in `app/domain/categories/category.config.ts` is in transition:

- **Pet types** → fully migrated to the `pet_types` DB table. Use `usePetTypes()` composable. **Do not add new pets to `category.config.ts`** — the static list there is a deprecated fallback.
- **Flavour options** → stored in the `product_flavour_options` DB table (queried via Supabase client).
- **Type, Age, Unit** → still static in `category.config.ts`.

Key helpers in `category.helpers.ts` (must import explicitly from `app/domain/`):
- `getCategoryOptions(key, context)` — options for a field given current form state
- `isCategoryVisible(key, context)` / `isCategoryRequired(key, context)` — driven by `dependsOn` rules
- `getVisibleKeys(context)` / `collectCategoryIssues(context)` — for form validation
- `getDependents(key)` — find downstream fields to reset when a parent changes

Use `useCategories()` composable for reactive form context. Never hardcode category values.

### Order status transitions

`canOrderTransition(from, to, payment_status, payment_method?)` in `app/utils/index.ts` enforces the allowed state machine. Always call this before updating order status — it handles COD vs. online payment rules (e.g. COD orders can ship unpaid, online orders require payment before `confirmed`). The full transition graph is defined in `ALLOWED_TRANSITIONS` inside that file.

### Toast notifications

Use `vue-sonner` via the `<Toaster />` component (mounted in the default layout). Call `toast.success()`, `toast.error()`, etc. — these are auto-imported from `vue-sonner`.

### Brands

`useBrands()` composable wraps all CRUD operations for the `brands` table. Images upload to the `brand-logos` Supabase storage bucket. The admin UI uses `BrandSheet.vue` for create/edit.

### Pet types (DB-driven)

`usePetTypes()` composable wraps all CRUD operations for the `pet_types` table. Images upload to the `pet-type-images` Supabase storage bucket. The admin UI uses `PetTypeSheet.vue` for create/edit. `sort_order` controls display order; `is_active` gates visibility on the storefront.

### Rendering stored images

**Never bind a raw `/storage/v1/object/public/` URL to an `<img>`.** Two measured
reasons: that endpoint returns the upload at full size, and it answers
`cache-control: no-cache` regardless of what the object was stored with — an
object written with `cacheControl: 31536000` still comes back `no-cache` there.

Go through `transformedImage(url, preset)` / `productImage(url, preset)` in
`app/utils/image.ts` (auto-imported). They rewrite the URL onto
`/storage/v1/render/image/public/`, which resizes, re-encodes to WebP, and does
honour the stored `cacheControl`. Measured against production objects: banner
1.5 MB -> 47 KB, product card 493 KB -> 19 KB, pet tile 4.4 MB -> 8 KB.

- Add a named entry to `IMAGE_PRESETS` per surface rather than passing sizes
  inline. Size it at ~2x the largest CSS box the element renders.
- **Always give both width and height.** A width on its own keeps the source's
  original height (a 1672x941 banner asked for `width=800` returns 800x941,
  squashed).
- `resize` must match the CSS: `object-contain` -> `contain`,
  `object-cover` -> `cover`.
- Local paths, `blob:` previews and SVG pass through untouched.

Transforms are a Supabase Pro-plan feature. Objects predating
`UPLOAD_CACHE_CONTROL` carry Supabase's 3600 default, so their transforms are
cacheable for an hour; the `/admin/storage` compression sweep re-uploads with
`31536000` and lifts them to a year.

### Icons

`<Icon name="lucide:..." />` renders from `app/assets/icons/offline.json`, which
is registered by `app/plugins/iconify.client.ts` (`enforce: 'pre'` — it has to
run before `auth.client.ts`, which awaits session restore). An icon missing from
the bundle silently falls back to fetching api.iconify.design at runtime, so
after adding a new `<Icon name="...">` run `pnpm icons` to regenerate.

`pnpm fonts` does the equivalent for the self-hosted Poppins files in
`public/fonts/`, declared as `@font-face` in `app/assets/css/main.css`.

### Image uploads

All admin image uploads pass through `useImageCompression` before reaching Storage (WebP, max edge per surface). Buckets enforce a 1 MB limit and an image-only MIME allowlist. When an image is replaced or its row deleted, the old object must be released via `/api/admin/storage/release` — Storage is not cascade-deleted by the database. `/admin/storage` shows the current state and sweeps anything missed.

`useUploadImage` holds the policy layer: call `prepareUpload(file, preset, statusKey)` (or `prepareUploads` for a set) inside the upload function, never in the form — the composable is the choke point, so no form can bypass it.

| Surface | Bucket | Preset |
|---|---|---|
| Product thumbnail + gallery | `product-images` | `UPLOAD_PRESETS.product` — 1400 px, q80 |
| Brand logo | `brand-logos` | `UPLOAD_PRESETS.brandLogo` — 800 px, q85 |
| Pet type tile | `pet-type-images` | `UPLOAD_PRESETS.petType` — 800 px, q85 |
| Banner desktop | `product-images/banners` | `UPLOAD_PRESETS.bannerDesktop` — 1920 px, q80 |
| Banner mobile | `product-images/banners` | `UPLOAD_PRESETS.bannerMobile` — 1080 px, q80 |

Rules the upload path relies on:

- **Filenames never change.** A compressed file keeps its original name and suffix while its content type says WebP — browsers go by the header. The `products/<id>/` path shape is what the storage classifier matches on.
- **SVG and GIF pass through untouched** — canvas would rasterise one and flatten the other.
- **An unreadable file is rejected; a failed encode is not.** `compressBlob` tags its errors `UNDECODABLE` (corrupt or empty — the save fails, nothing is written) or `ENCODE_FAILED` (the original uploads instead, with a console warning). An admin is never left unable to save a product because a browser's encoder gave up.
- Uploads set `contentType` from the prepared file and `cacheControl: UPLOAD_CACHE_CONTROL` (1 year).
- `<AdminUploadStatus for="…" />` renders the `Optimising… 8.4 MB → 480 KB` line under a file input; it reads a shared ref keyed by input, so the upload composable does not thread a callback back through the form.
- Storage rejections go through `storageUploadError()`, which maps 413/415 to a message the admin can act on and passes anything else through unchanged.

The bucket limits are the backstop, applied in the SQL editor **after** the back-catalogue compression has finished:

```sql
update storage.buckets
set file_size_limit = 1048576,   -- 1 MB
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/svg+xml']
where id in ('product-images', 'brand-logos', 'pet-type-images');
```

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
