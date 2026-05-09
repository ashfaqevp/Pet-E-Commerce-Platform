# Claude Code Task: Colour · Brands · Pet Types

## Code implementation only — DB migrations are complete

> **Production app. Read every section before writing code.**
> Run `pnpm typecheck` and `pnpm lint` after every logical chunk of work.
> Migrations are already applied — do NOT run any `ALTER TABLE` or `CREATE TABLE` SQL.

---

## 0. Current DB state — confirmed done

All three migrations have been applied and types regenerated. The following is already
live in the database and reflected in `database.types.ts`:

| Column / Table                                                                         | Status       |
| -------------------------------------------------------------------------------------- | ------------ |
| `products.colour text \| null`                                                         | ✅ Applied   |
| `products.brand_id uuid \| null → brands(id)`                                          | ✅ Applied   |
| `products.brand text \| null` (legacy, kept)                                           | ✅ Unchanged |
| `brands` table (name, slug, logo_url, description, sort_order, is_active, is_featured) | ✅ Applied   |
| `pet_types` table (name, slug, image_url, sort_order, is_active)                       | ✅ Applied   |

## ⚠️ Supabase items still to verify before coding (do these first, ~5 min)

These don't appear in TypeScript types — check them manually in the Supabase dashboard:

### 1. RLS policies — run this in the SQL editor to check:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('brands', 'pet_types')
ORDER BY tablename, cmd;
```

Expected output — **4 policies total**:

| tablename | policyname            | cmd    |
| --------- | --------------------- | ------ |
| brands    | brands_public_read    | SELECT |
| brands    | brands_admin_all      | ALL    |
| pet_types | pet_types_public_read | SELECT |
| pet_types | pet_types_admin_all   | ALL    |

If any are missing, apply the relevant block:

```sql
-- If brands policies are missing:
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brands_public_read"
  ON public.brands FOR SELECT
  USING (is_active = true);

CREATE POLICY "brands_admin_all"
  ON public.brands FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- If pet_types policies are missing:
ALTER TABLE public.pet_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_types_public_read"
  ON public.pet_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "pet_types_admin_all"
  ON public.pet_types FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### 2. Storage buckets — check in Supabase dashboard → Storage

Need two public buckets:

| Bucket name       | Public | Purpose              |
| ----------------- | ------ | -------------------- |
| `brand-logos`     | ✅ yes | Brand logo images    |
| `pet-type-images` | ✅ yes | Pet type tile images |

If either bucket is missing, create it:

- Dashboard → Storage → New bucket
- Name: `brand-logos` (or `pet-type-images`)
- Public bucket: **on**

Then add storage policies for each bucket (Dashboard → Storage → [bucket] → Policies):

```sql
-- Public read (anyone can view images)
CREATE POLICY "public read brand-logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-logos');

-- Admin upload/delete
CREATE POLICY "admin write brand-logos"
ON storage.objects FOR ALL
USING (bucket_id = 'brand-logos' AND public.is_admin())
WITH CHECK (bucket_id = 'brand-logos' AND public.is_admin());

-- Repeat with 'pet-type-images' for the second bucket
```

### 3. Seed pet types — IMPORTANT

`products.pet_type` is a `text[]` storing slugs. The `pet_types` table is currently
empty. Before the product form can show pet type options, you must seed it.

**First, read `app/domain/categories/category.config.ts` to get the exact slug values
currently used in `products.pet_type[]` across all existing products.**

Then run this in the SQL editor — replacing the values with what you find in the config:

```sql
-- Example — replace with actual values from category.config.ts
INSERT INTO public.pet_types (name, slug, sort_order, is_active)
VALUES
  ('Dog',  'dog',  1, true),
  ('Cat',  'cat',  2, true),
  ('Bird', 'bird', 3, true),
  ('Fish', 'fish', 4, true)
  -- add all pet types from the config
ON CONFLICT (slug) DO NOTHING;
```

**Critical:** The slugs must exactly match the strings already stored in
`products.pet_type[]`. If the config uses `'dog'`, the slug must be `'dog'` — not
`'dogs'`, not `'Dog'`. Run this query to see what values are actually in products:

```sql
SELECT DISTINCT unnest(pet_type) AS slug, count(*) AS product_count
FROM public.products
GROUP BY 1
ORDER BY 1;
```

Seed `pet_types` rows to match every slug that appears in this result.

---

## 1. Project conventions (quick reference)

- All app code under `app/`. Nuxt auto-imports everything — **never add manual imports**
  for composables, stores, utils, or components.
- `app/domain/` is **NOT auto-imported** — import explicitly.
- `pnpm` only. No npm or yarn.
- Component style: `<script setup lang="ts">` → `<template>`, no `<style>` blocks.
- Mobile-first Tailwind. Colors: teal `#0f766e` = `bg-secondary`, orange `#FF9500` = `text-accent`.
- Container: `max-w-7xl`.

---

## 2. Feature A — Colour variant dimension (code only)

The `colour` column is already on `products`. This is purely a UI/logic change.

### 2.1 Colour swatch map

Create `app/lib/colourMap.ts`:

```ts
export const COLOUR_SWATCH: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#a855f7",
  pink: "#ec4899",
  black: "#111827",
  white: "#f9fafb",
  grey: "#6b7280",
  gray: "#6b7280",
  brown: "#92400e",
  navy: "#1e3a5f",
  beige: "#d4b896",
  gold: "#ca8a04",
  silver: "#9ca3af",
};
// Keys must be lowercase. Add more as needed.
// If a colour value is not in this map, the swatch falls back to bg-gray-300.
```

### 2.2 Product detail page — extend `buildGroups()`

**Find the file:** search the codebase for `buildGroups` or `flavourSet` — it lives in
`app/pages/products/[id].vue` or a composable it calls.

Add `colour` to `buildGroups()` — identical pattern to `flavourSet`:

```ts
// Add this alongside the existing flavourSet, sizeSet, ageSet blocks:
const colourSet = new Map<string, VariantOption>();
for (const r of rows) {
  if (r.colour) {
    colourSet.set(r.colour, {
      id: r.colour,
      label: r.colour.charAt(0).toUpperCase() + r.colour.slice(1), // "Red"
      value: r.colour,
    });
  }
}
if (colourSet.size > 0) {
  groups.push({
    name: "Colour",
    key: "colour",
    options: Array.from(colourSet.values()),
  });
}
```

Extend the `selectedVariant` filter chain — add `colour` at every tier exactly as
`flavour` and `size` are already added. Do not remove or reorder existing tiers.

### 2.3 Colour swatch UI in the variant selector

In the variant selector template, when `group.key === 'colour'`, render swatches
instead of text buttons. Find where the variant group options are rendered (search for
`VariantGroup` or the `v-for` over `groups` in the product page template).

```vue
<!-- Inside the variant group loop, replace the plain button with swatch when colour -->
<template v-if="group.key === 'colour'">
  <button
    v-for="option in group.options"
    :key="option.value"
    :title="option.label"
    :aria-label="option.label"
    :class="[
      'w-8 h-8 rounded-full border-2 transition-all focus:outline-none',
      selectedVariants[group.key] === option.value
        ? 'border-secondary ring-2 ring-secondary ring-offset-2 scale-110'
        : 'border-transparent hover:border-gray-300',
      option.value === 'white' ? 'border-gray-200' : '',
    ]"
    :style="{
      backgroundColor: COLOUR_SWATCH[option.value.toLowerCase()] ?? '#d1d5db',
    }"
    @click="selectVariant(group.key, option.value)"
  />
  <!-- Show selected colour label -->
  <span
    v-if="selectedVariants[group.key]"
    class="text-sm text-muted-foreground ml-1"
  >
    {{
      selectedVariants[group.key].charAt(0).toUpperCase() +
      selectedVariants[group.key].slice(1)
    }}
  </span>
</template>
<template v-else>
  <!-- existing non-colour option buttons unchanged -->
</template>
```

Import `COLOUR_SWATCH` from `~/lib/colourMap` at the top of the file
(`app/domain/` is not auto-imported; `app/lib/` may need explicit import too — check
whether `app/lib/utils.ts` is auto-imported in this project or explicitly imported).

### 2.4 Admin product form — colour input

**Find the file:** search for the `flavour` or `age` input field in admin product
create/edit pages. Add `colour` in the same section as the other variant dimension inputs.

```vue
<FormField name="colour" v-slot="{ field }">
  <FormItem>
    <FormLabel>Colour</FormLabel>
    <FormControl>
      <Input
        v-bind="field"
        placeholder="e.g. red, blue, black (lowercase)"
      />
    </FormControl>
    <FormDescription>
      Leave blank if no colour variant. Use lowercase English colour names.
    </FormDescription>
    <FormMessage />
  </FormItem>
</FormField>
```

Add `colour` to the form schema (zod or vee-validate — match whatever schema validation
the existing form uses). Add it to the save/update payload. Nullable string, no required
validation.

### 2.5 Feature A checklist

- [ ] `app/lib/colourMap.ts` created
- [ ] `buildGroups()` extended with `colourSet`
- [ ] `selectedVariant` filter chain updated with colour
- [ ] Swatch UI rendered when `group.key === 'colour'`
- [ ] Admin product form: `colour` input wired up
- [ ] `pnpm typecheck` clean

---

## 3. Feature B — Brands (code only)

The `brands` table and `products.brand_id` FK are already in the DB.
`products.brand` (legacy text) stays permanently as a fallback — never delete or null it.

### 3.1 Composable — `useBrands()`

Create `app/composables/useBrands.ts`:

```ts
export function useBrands() {
  const supabase = useSupabaseClient();

  /** Active brands ordered by sort_order → name. Used by homepage + brand page. */
  async function fetchActiveBrands() {
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, slug, logo_url, is_featured, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  }

  /** Single brand by slug. Used by /brands/[slug] page. */
  async function fetchBrandBySlug(slug: string) {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();
    if (error) throw error;
    return data;
  }

  /** All brands including inactive. Admin only. */
  async function fetchAllBrandsAdmin() {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  }

  async function createBrand(payload: {
    name: string;
    slug: string;
    logo_url?: string | null;
    description?: string | null;
    sort_order?: number;
    is_active?: boolean;
    is_featured?: boolean;
  }) {
    const { data, error } = await supabase
      .from("brands")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function updateBrand(id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("brands")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteBrand(id: string) {
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) throw error;
  }

  /** Upload logo to brand-logos bucket. Returns public URL. */
  async function uploadLogo(file: File, brandSlug: string): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${brandSlug}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("brand-logos")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("brand-logos").getPublicUrl(path);
    return data.publicUrl;
  }

  return {
    fetchActiveBrands,
    fetchBrandBySlug,
    fetchAllBrandsAdmin,
    createBrand,
    updateBrand,
    deleteBrand,
    uploadLogo,
  };
}
```

### 3.2 Brand display helper pattern

Wherever a product's brand is shown, **always use this fallback chain:**

```ts
// In a computed or inline:
const brandName =
  product.brands?.name ?? // joined brand record (preferred)
  product.brand ?? // legacy free text (fallback)
  null; // nothing

const brandLogo = product.brands?.logo_url ?? null;
```

When fetching products that need to display brand, join the brands table:

```ts
supabase.from("products").select(`*, brands ( id, name, slug, logo_url )`);
```

Apply this join + fallback pattern in: product cards, product detail page,
admin product list, anywhere brand is currently displayed from `products.brand`.

### 3.3 Admin — Brands list page

Create `app/pages/admin/brands/index.vue`. Use the `admin` layout.
Fetch with `useLazyAsyncData('admin-brands', () => useBrands().fetchAllBrandsAdmin())`.

Table columns:

- **Logo** — `<img>` thumbnail (40×40, object-contain) or grey placeholder if null
- **Name**
- **Slug**
- **Sort order**
- **Featured** — toggle switch (calls `updateBrand` on change)
- **Active** — toggle switch (calls `updateBrand` on change)
- **Actions** — Edit button (`/admin/brands/[id]`), Delete button with confirm dialog

Header: "Brands" h1 + "New Brand" button → `/admin/brands/new`.

### 3.4 Admin — Brand create/edit page

Create `app/pages/admin/brands/[id].vue`. Handle both create (`id === 'new'`) and edit.

Form fields:
| Field | Type | Notes |
|-------|------|-------|
| Name | text input, required | On change, auto-populate slug if slug is empty |
| Slug | text input, required | Lowercase, hyphens only. Validate: `/^[a-z0-9-]+$/` |
| Logo | file input (image/\*) | Show current logo preview. On submit call `uploadLogo()` |
| Description | textarea, optional | |
| Sort order | number input | Default 0. Lower = first |
| Featured | switch | Show on homepage strip |
| Active | switch | Hidden from public when off |

On save:

- Create: `createBrand(payload)` → redirect to `/admin/brands`
- Edit: `updateBrand(id, payload)` → redirect to `/admin/brands`

Slug auto-generation helper:

```ts
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
```

### 3.5 Admin sidebar

In `app/layouts/admin.vue`, add "Brands" to the nav list near the Products link.
Use `ShoppingBag` icon from `lucide-vue-next`. Route: `/admin/brands`.

### 3.6 Product form — brand_id dropdown

In the admin product create/edit form, add a brand selector **alongside** (not
replacing) the existing brand display. The old `brand` text field should become
read-only / informational once `brand_id` is set.

```vue
<!-- Brand selector -->
<FormField name="brand_id" v-slot="{ field }">
  <FormItem>
    <FormLabel>Brand</FormLabel>
    <FormControl>
      <Select v-bind="field" :model-value="field.value ?? ''">
        <SelectTrigger>
          <SelectValue placeholder="Select a brand…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">— No brand —</SelectItem>
          <SelectItem
            v-for="brand in brandOptions"
            :key="brand.id"
            :value="brand.id"
          >
            {{ brand.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </FormControl>
    <FormDescription>
      Link to a brand for logo + homepage display.
      <NuxtLink to="/admin/brands/new" target="_blank" class="underline text-secondary">
        Create a new brand
      </NuxtLink>
    </FormDescription>
    <FormMessage />
  </FormItem>
</FormField>

<!-- Legacy brand text — shown read-only when brand_id is not yet set -->
<p
  v-if="product?.brand && !currentBrandId"
  class="text-xs text-muted-foreground mt-1"
>
  Legacy brand text: <span class="font-medium">{{ product.brand }}</span>
  — link to a brand above to enable logo display.
</p>
```

Fetch brand options at the top of the form:

```ts
const { fetchActiveBrands } = useBrands();
const { data: brandOptions } = await useLazyAsyncData(
  "brand-options",
  fetchActiveBrands,
);
```

On save, write `brand_id` to the product. Do NOT overwrite or clear `products.brand`.

When loading an existing product for edit:

- If `product.brand_id` is set → pre-select it in the dropdown
- If null but `product.brand` has text → show legacy notice, dropdown at "— No brand —"

### 3.7 Homepage — "Shop by Brand" strip

In `app/pages/index.vue` (or the homepage component), add a featured brands section.
Show only brands where `is_featured = true`, ordered by `sort_order`.

```vue
<section v-if="featuredBrands?.length" class="py-8">
  <div class="max-w-7xl mx-auto px-4">
    <h2 class="text-xl font-semibold text-foreground mb-6">Shop by Brand</h2>
    <div class="flex flex-wrap gap-4 justify-center md:justify-start">
      <NuxtLink
        v-for="brand in featuredBrands"
        :key="brand.id"
        :to="`/brands/${brand.slug}`"
        class="flex flex-col items-center justify-center gap-2 p-4 rounded-xl
               border border-border bg-card hover:border-secondary hover:shadow-md
               transition-all w-28 md:w-32 min-h-20"
      >
        <img
          v-if="brand.logo_url"
          :src="brand.logo_url"
          :alt="brand.name"
          class="h-12 w-full object-contain"
        />
        <span
          v-else
          class="text-sm font-semibold text-center text-foreground leading-tight"
        >
          {{ brand.name }}
        </span>
      </NuxtLink>
    </div>
  </div>
</section>
```

Data fetch in the page:

```ts
const { fetchActiveBrands } = useBrands();
const { data: featuredBrands } = await useLazyAsyncData("featured-brands", () =>
  fetchActiveBrands().then((brands) => brands.filter((b) => b.is_featured)),
);
```

Placement: after hero banners, before featured products — or wherever fits visually.

### 3.8 Public brand page — `/brands/[slug]`

Create `app/pages/brands/[slug].vue`:

```ts
const route = useRoute();
const { fetchBrandBySlug } = useBrands();
const supabase = useSupabaseClient();

const { data: brand, error: brandError } = await useLazyAsyncData(
  `brand-${route.params.slug}`,
  () => fetchBrandBySlug(route.params.slug as string),
);

const { data: products } = await useLazyAsyncData(
  `brand-products-${route.params.slug}`,
  async () => {
    if (!brand.value) return [];
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("brand_id", brand.value.id)
      .eq("is_active", true)
      .is("base_product_id", null) // show base products only, not variants
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  { watch: [brand] },
);
```

Template structure:

- If `brandError` or brand is null → show "Brand not found" with a back link.
- Brand header: logo (if present, max-h-24), name (h1), description (if present).
- Product grid using the existing `ProductCard` component.
- If no products yet → "No products found for this brand."
- Page `<title>` / `useHead`: `{brand.name} — {site name}`.

### 3.9 Feature B checklist

- [ ] `app/composables/useBrands.ts` created
- [ ] Admin brands list page (`/admin/brands`)
- [ ] Admin brand create/edit page (`/admin/brands/[id]`)
- [ ] Admin sidebar: "Brands" link added
- [ ] Product form: brand_id dropdown + legacy text notice
- [ ] Product queries that display brand name: updated to join `brands` table
- [ ] Brand fallback display (`brands.name ?? products.brand`) applied to product cards + detail page
- [ ] Homepage: "Shop by Brand" strip (featured only)
- [ ] `/brands/[slug]` page
- [ ] `pnpm typecheck` clean

---

## 4. Feature C — Pet Types (code only)

The `pet_types` table is already in the DB. `products.pet_type text[]` format is
unchanged — it still stores slugs. Only the source of allowed options changes
(config → DB).

**Prerequisite: seed data must be in `pet_types` table before the product form will
work** (see section 0, item 3 above).

### 4.1 Composable — `usePetTypes()`

Create `app/composables/usePetTypes.ts`:

```ts
export function usePetTypes() {
  const supabase = useSupabaseClient();

  async function fetchActivePetTypes() {
    const { data, error } = await supabase
      .from("pet_types")
      .select("id, name, slug, image_url, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  }

  async function fetchAllPetTypesAdmin() {
    const { data, error } = await supabase
      .from("pet_types")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data;
  }

  async function createPetType(payload: {
    name: string;
    slug: string;
    image_url?: string | null;
    sort_order?: number;
    is_active?: boolean;
  }) {
    const { data, error } = await supabase
      .from("pet_types")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function updatePetType(id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("pet_types")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deletePetType(id: string) {
    const { error } = await supabase.from("pet_types").delete().eq("id", id);
    if (error) throw error;
  }

  async function uploadImage(file: File, slug: string): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${slug}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("pet-type-images")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage
      .from("pet-type-images")
      .getPublicUrl(path);
    return data.publicUrl;
  }

  return {
    fetchActivePetTypes,
    fetchAllPetTypesAdmin,
    createPetType,
    updatePetType,
    deletePetType,
    uploadImage,
  };
}
```

### 4.2 Admin — Pet Types list page

Create `app/pages/admin/pet-types/index.vue`. Use `admin` layout.
Fetch with `useLazyAsyncData('admin-pet-types', () => usePetTypes().fetchAllPetTypesAdmin())`.

Table columns:

- **Image** — thumbnail (40×40, rounded-full, object-cover) or placeholder icon if null
- **Name**
- **Slug**
- **Sort order**
- **Active** — toggle switch
- **Actions** — Edit (`/admin/pet-types/[id]`), Delete with confirm

Header: "Pet Types" h1 + "New Pet Type" button → `/admin/pet-types/new`.

### 4.3 Admin — Pet Type create/edit page

Create `app/pages/admin/pet-types/[id].vue`. Handle both create (`id === 'new'`) and edit.

Form fields:
| Field | Type | Notes |
|-------|------|-------|
| Name | text input, required | e.g. "Rabbit" |
| Slug | text input, required | Lowercase-kebab. Must match `products.pet_type[]` values. Validate: `/^[a-z0-9-]+$/` |
| Image | file input (image/\*) | Shown as rounded preview tile. Upload to `pet-type-images` |
| Sort order | number input | Lower = first on homepage |
| Active | switch | |

**Slug warning:** Show a helper note: "This slug must exactly match the values used in
products. If unsure, use lowercase with no spaces (e.g. 'rabbit', 'small-animal')."

On save: `createPetType()` or `updatePetType()` → redirect to `/admin/pet-types`.

### 4.4 Admin sidebar

In `app/layouts/admin.vue`, add "Pet Types" to nav near Products.
Use `PawPrint` icon from `lucide-vue-next`. Route: `/admin/pet-types`.

### 4.5 Product form — pet type options from DB

**Find** where the pet type multi-select is in the admin product form. It currently
reads options from `app/domain/categories/category.config.ts`.

Replace the option source:

```ts
// Replace config-driven pet type options with DB fetch:
const { fetchActivePetTypes } = usePetTypes();
const { data: petTypeOptions } = await useLazyAsyncData(
  "pet-types-form",
  fetchActivePetTypes,
);
```

The multi-select component itself stays the same — it still writes to `products.pet_type`
as `string[]`. Only the options list source changes. Map the DB rows to whatever option
format the existing select component expects:

```ts
// If the select expects { value, label } objects:
const mappedPetTypes = computed(
  () =>
    petTypeOptions.value?.map((p) => ({ value: p.slug, label: p.name })) ?? [],
);
```

### 4.6 Homepage — "Shop by Pet" strip

In `app/pages/index.vue`, update the pet types strip to source from DB instead of config.

```ts
const { fetchActivePetTypes } = usePetTypes();
const { data: activePetTypes } = await useLazyAsyncData(
  "home-pet-types",
  fetchActivePetTypes,
);
```

Template:

```vue
<section v-if="activePetTypes?.length" class="py-8">
  <div class="max-w-7xl mx-auto px-4">
    <h2 class="text-xl font-semibold text-foreground mb-6">Shop by Pet</h2>
    <div class="flex flex-wrap gap-4 justify-center md:justify-start">
      <NuxtLink
        v-for="pet in activePetTypes"
        :key="pet.id"
        :to="`/?pet_type=${pet.slug}`"
        class="flex flex-col items-center gap-2 p-3 rounded-xl border border-border
               bg-card hover:border-secondary hover:shadow-md transition-all w-24 md:w-28"
      >
        <img
          v-if="pet.image_url"
          :src="pet.image_url"
          :alt="pet.name"
          class="h-14 w-14 object-contain rounded-full"
        />
        <div
          v-else
          class="h-14 w-14 rounded-full bg-muted flex items-center justify-center"
        >
          <PawPrint class="w-7 h-7 text-muted-foreground" />
        </div>
        <span class="text-sm font-medium text-center text-foreground">{{ pet.name }}</span>
      </NuxtLink>
    </div>
  </div>
</section>
```

**Check the existing homepage** for how pet type filtering currently works (URL param name,
query structure) and keep the `:to` link consistent with that — don't invent a new param
name if one already exists.

### 4.7 Category config — mark pet types as migrated

In `app/domain/categories/category.config.ts`, find the pet type list.
Do **not** delete anything else in this file — only the pet type list is moving to DB.

Add a comment above it:

```ts
// PET TYPES — MIGRATED TO DB (pet_types table)
// The list below is kept only as a reference / fallback during transition.
// The product form and homepage now source pet types from usePetTypes() composable.
// This list can be removed once all usages have been confirmed migrated.
// DO NOT add new pet types here — add them via the admin dashboard instead.
```

Leave the list itself in place for now. Remove it only after confirming no code
still reads from it.

### 4.8 Feature C checklist

- [ ] `pet_types` table seeded (see section 0 prerequisite)
- [ ] `app/composables/usePetTypes.ts` created
- [ ] Admin pet types list page (`/admin/pet-types`)
- [ ] Admin pet type create/edit page (`/admin/pet-types/[id]`)
- [ ] Admin sidebar: "Pet Types" link added
- [ ] Product form: pet type options sourced from DB via `usePetTypes()`
- [ ] Homepage: "Shop by Pet" strip sourced from DB
- [ ] Category config: deprecation comment added
- [ ] `pnpm typecheck` clean

---

## 5. Final verification

After all three features:

```bash
pnpm typecheck   # zero errors required
pnpm lint        # zero errors (auto-fix permitted)
pnpm build       # must succeed cleanly
```

Smoke tests:

1. Admin creates a brand with logo → appears on homepage "Shop by Brand" strip.
2. Click brand tile → `/brands/[slug]` loads with logo header + product grid.
3. Admin links an existing product to a brand → product detail shows brand name
   from `brands.name`, not legacy text. A product with no `brand_id` still shows
   the old `products.brand` text as fallback.
4. Admin adds "Rabbit" pet type with image via `/admin/pet-types` → appears on
   homepage "Shop by Pet" strip and in the product form pet type selector.
5. Admin creates two sibling products (same `base_product_id`) with `colour: 'red'`
   and `colour: 'blue'` → product detail page shows colour swatch picker; selecting
   each swatch switches the active variant.
6. `pnpm build` produces no TypeScript errors.

---

## 6. Files to create / modify

### New files

| File                                  | Feature |
| ------------------------------------- | ------- |
| `app/lib/colourMap.ts`                | A       |
| `app/composables/useBrands.ts`        | B       |
| `app/composables/usePetTypes.ts`      | C       |
| `app/pages/admin/brands/index.vue`    | B       |
| `app/pages/admin/brands/[id].vue`     | B       |
| `app/pages/admin/pet-types/index.vue` | C       |
| `app/pages/admin/pet-types/[id].vue`  | C       |
| `app/pages/brands/[slug].vue`         | B       |

### Modified files

| File                                                           | What changes                                         |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| `app/pages/products/[id].vue`                                  | `buildGroups()` + swatch UI + colour in filter chain |
| `app/pages/index.vue`                                          | Pet types strip from DB + featured brands strip      |
| `app/layouts/admin.vue`                                        | Sidebar: Brands + Pet Types links                    |
| Admin product form (find by searching for flavour/size inputs) | colour input + brand_id dropdown + pet types from DB |
| `app/domain/categories/category.config.ts`                     | Deprecation comment on pet type list                 |
| All files displaying `products.brand`                          | Join brands table, apply fallback pattern            |

---

_End of task — DB migrations complete, code only from here._
