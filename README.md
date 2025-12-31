# Buypets.om — Pet E‑Commerce

Nuxt 4 + Vue 3 + shadcn‑vue + Supabase. Mobile‑first, TypeScript‑strict, and pnpm‑only.

## Overview
- UI: `shadcn-vue` components only, Tailwind v4 tokens
- Style: Antfu pattern (script setup → template → style)
- Data: Supabase (`useSupabaseClient()`), SSR‑safe `useLazyAsyncData`
- Design: Primary black (`text-foreground`), Secondary teal `#0f766e`, Accent orange `#FF9500`
- Auto‑imports: Use Nuxt auto‑imports from `app/` (no manual app imports)

## Prerequisites
- Node 18+ and `pnpm` 9+
- Supabase project with anon key

## Setup
- Install dependencies (pnpm only):
```bash
pnpm install
```

- Create `.env.local` and set runtime values:
```bash
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
# Fallback also supported: SUPABASE_KEY=<your-anon-key>

# Optional integrations
RAZORPAY_KEY_ID=<your-razorpay-key-id>
SUPABASE_FUNCTION_URL=https://<your-project>.functions.supabase.co
```

## Run
- Dev server:
```bash
pnpm dev
```
- Build:
```bash
pnpm build
```
- Preview production build:
```bash
pnpm preview
```

## Project Structure
- `app/components/ui/` shadcn‑vue components (auto‑added via CLI)
- `app/pages/` Nuxt pages and routes
- `app/stores/` Pinia stores
- `app/composables/` shared logic (auto‑imported)
- `app/assets/css/` Tailwind v4 tokens and theme variables

## shadcn‑vue Components
- Components are managed in `app/components/ui/` and auto‑imported.
- Add new components with the CLI:
```bash
pnpm exec shadcn-vue add @shadcn/<component>
# Example
pnpm exec shadcn-vue add @shadcn/button @shadcn/card @shadcn/accordion @shadcn/breadcrumb
```

## Data Fetching (SSR‑safe)
- Always use `useLazyAsyncData` with Supabase:
```ts
const { data, pending, error, refresh } = await useLazyAsyncData(
  'products',
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase.from('products').select('*')
    if (error) throw error
    return data
  },
  { server: true }
)
```
- Real‑time refresh:
```ts
const supabase = useSupabaseClient()
supabase.from('products').on('*', () => refresh()).subscribe()
```

## Coding Guidelines
- Antfu style: script setup → template → style (no custom CSS)
- Mobile‑first: default mobile, add `md:` and `lg:` for larger screens
- Colors: `text-foreground`, `bg-secondary`, `text-accent`, `bg-accent-foreground`
- Types: TypeScript strict, no `any`
- Imports: do not manually import from `app/`; rely on Nuxt auto‑imports

## Common Scripts
- Lint/Typecheck (if configured):
```bash
pnpm typecheck
pnpm lint
```

## Troubleshooting
- shadcn component resolution issues: ensure files match export case (e.g., `Input.vue` vs `index.ts` export).
- Supabase env: either `SUPABASE_ANON_KEY` or `SUPABASE_KEY` must be present.

## Deployment
- Build with `pnpm build` and deploy the `.output` per Nuxt documentation.
