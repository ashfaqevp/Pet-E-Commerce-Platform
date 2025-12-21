<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useRoute, definePageMeta, useLazyAsyncData, useSupabaseClient } from "#imports";
import { Button } from "@/components/ui/button";
import AddToCartButton from "@/components/AddToCartButton.vue";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import type { UnwrapRefCarouselApi } from "@/components/ui/carousel/interface";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { CATEGORY_CONFIG } from "~/domain/categories/category.config";

definePageMeta({ layout: "default" });

type VariantOption = {
  id: string;
  label?: string;
  value: string | number;
  priceDelta?: number;
  inStock?: boolean;
};

type VariantGroup = {
  name: "Flavour" | "Size" | "Age" | string;
  key: "flavour" | "size" | "age" | string;
  options: VariantOption[];
};

interface ProductRow {
  id: string;
  name: string;
  brand?: string | null;
  pet_type?: string | null;
  product_type?: string | null;
  age?: string | null;
  unit?: string | null;
  size?: string | null;
  flavour?: string | null;
  retail_price?: number | null;
  default_rating?: number | null;
  thumbnail_url?: string | null;
  base_product_id?: string | null;
  is_active?: boolean | null;
}

const route = useRoute();
const id = route.params.id as string;
const supabase = useSupabaseClient();

const qty = ref(1);
const activeIndex = ref(0);
const carouselApiRef = ref<UnwrapRefCarouselApi | null>(null);

const { data, pending, error, refresh } = await useLazyAsyncData(
  `product-${id}`,
  async () => {
    const { data: row, error: e } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    if (e) throw e;
    const current = row as unknown as ProductRow;
    const baseId = current.base_product_id || current.id;
    const { data: variantsData, error: ve } = await supabase
      .from("products")
      .select("*")
      .or(`id.eq.${baseId},base_product_id.eq.${baseId}`)
      .eq("is_active", true);
    if (ve) throw ve;
    const variants = (variantsData || []) as unknown as ProductRow[];
    return { current, variants, baseId };
  },
  { server: true }
);

const current = computed(() => data.value?.current as ProductRow | undefined);
const variantRows = computed(() => (data.value?.variants || []) as ProductRow[]);

const variantGroups = ref<VariantGroup[]>([]);

function buildGroups() {
  const cur = current.value;
  const rows = variantRows.value;
  if (!cur) {
    variantGroups.value = [];
    return;
  }
  const flavourSet = new Map<string, VariantOption>();
  const sizeSet = new Map<string, VariantOption>();
  const ageSet = new Map<string, VariantOption>();
  for (const r of rows) {
    if (r.flavour) {
      const opts = CATEGORY_CONFIG.flavour.rules?.flatMap(x => x.options) || [];
      const label = opts.find(o => o.id === r.flavour)?.label || r.flavour;
      flavourSet.set(r.flavour, { id: r.flavour, label, value: r.flavour });
    }
    if (r.size) {
      const unit = cur.unit ?? r.unit ?? undefined;
      const rules = CATEGORY_CONFIG.size.rules || [];
      const rule = unit ? rules.find(x => x.when.values.includes(unit)) : undefined;
      const label = rule?.options.find(o => o.id === r.size)?.label || r.size;
      sizeSet.set(r.size, { id: r.size, label, value: r.size });
    }
    if (r.age) {
      const pet = cur.pet_type ?? r.pet_type ?? undefined;
      const rules = CATEGORY_CONFIG.age.rules || [];
      const rule = pet ? rules.find(x => x.when.values.includes(pet)) : undefined;
      const label = rule?.options.find(o => o.id === r.age)?.label || r.age;
      ageSet.set(r.age, { id: r.age, label, value: r.age });
    }
  }
  const groups: VariantGroup[] = [];
  const type = cur.product_type || undefined;
  const showFlavour = !!type && CATEGORY_CONFIG.flavour.requiredWhen?.some(x => x.values.includes(type));
  if (showFlavour && flavourSet.size > 0) groups.push({ name: "Flavour", key: "flavour", options: Array.from(flavourSet.values()) });
  if (sizeSet.size > 0) groups.push({ name: "Size", key: "size", options: Array.from(sizeSet.values()) });
  const pet = cur.pet_type || undefined;
  const showAge = !!pet && CATEGORY_CONFIG.age.requiredWhen?.some(x => x.values.includes(pet));
  if (showAge && ageSet.size > 0) groups.push({ name: "Age", key: "age", options: Array.from(ageSet.values()) });
  variantGroups.value = groups;
}

watch([current, variantRows], buildGroups, { immediate: true });

const flavourGroup = computed(() => variantGroups.value.find(v => v.key === "flavour"));
const sizeGroup = computed(() => variantGroups.value.find(v => v.key === "size"));
const ageGroup = computed(() => variantGroups.value.find(v => v.key === "age"));

const selectedFlavour = ref<VariantOption | null>(null);
const selectedSize = ref<VariantOption | null>(null);
const selectedAge = ref<VariantOption | null>(null);

function initSelections() {
  const cur = current.value;
  if (!cur) return;
  selectedFlavour.value = flavourGroup.value?.options.find(o => o.id === cur.flavour) || flavourGroup.value?.options[0] || null;
  selectedSize.value = sizeGroup.value?.options.find(o => o.id === cur.size) || sizeGroup.value?.options[0] || null;
  selectedAge.value = ageGroup.value?.options.find(o => o.id === cur.age) || ageGroup.value?.options[0] || null;
}

watch([flavourGroup, sizeGroup, ageGroup], initSelections, { immediate: true });

function moveSelectedToFront(group: VariantGroup | undefined, selected: VariantOption | null) {
  if (!group || !selected) return;
  const idx = group.options.findIndex(o => o.id === selected.id);
  if (idx > 0) {
    const opt = group.options[idx]!;
    group.options.splice(idx, 1);
    group.options.unshift(opt);
  }
}

watch(selectedFlavour, (v) => moveSelectedToFront(flavourGroup.value, v));
watch(selectedSize, (v) => moveSelectedToFront(sizeGroup.value, v));
watch(selectedAge, (v) => moveSelectedToFront(ageGroup.value, v));

const selectedVariant = computed<ProductRow | undefined>(() => {
  const rows = variantRows.value;
  const f = selectedFlavour.value?.id;
  const s = selectedSize.value?.id;
  const a = selectedAge.value?.id;
  let r = rows.find(x => (!f || x.flavour === f) && (!s || x.size === s) && (!a || x.age === a));
  if (r) return r;
  r = rows.find(x => (!s || x.size === s) && (!f || x.flavour === f));
  if (r) return r;
  r = rows.find(x => (!s || x.size === s));
  if (r) return r;
  r = rows.find(x => (!f || x.flavour === f));
  if (r) return r;
  r = rows.find(x => (!a || x.age === a));
  return r || current.value;
});

const images = computed(() => {
  const list: string[] = [];
  const thumb = selectedVariant.value?.thumbnail_url || current.value?.thumbnail_url || undefined;
  if (thumb) list.push(thumb);
  return list.length ? list : ["/images/placeholder.svg"];
});

const product = computed(() => {
  const cur = current.value;
  const sel = selectedVariant.value || cur;
  const price = Number(sel?.retail_price ?? cur?.retail_price ?? 0) || 0;
  const rating = Number(sel?.default_rating ?? cur?.default_rating ?? 0) || 0;
  return {
    id: String(sel?.id ?? id),
    name: String(cur?.name || "Product"),
    brand: cur?.brand || undefined,
    price,
    rating,
    thumbnail: sel?.thumbnail_url || undefined,
    images: images.value,
    compareAt: undefined as number | undefined,
    discount: 0,
    variants: variantGroups.value,
  } as {
    id: string;
    name: string;
    brand?: string;
    price: number;
    rating: number;
    thumbnail?: string;
    images?: string[];
    compareAt?: number;
    discount?: number;
    variants?: VariantGroup[];
  };
});

const onInitApi = (api: UnwrapRefCarouselApi) => {
  if (!api) return;
  carouselApiRef.value = api;
  activeIndex.value = api.selectedScrollSnap();
  api.on("select", () => {
    activeIndex.value = api.selectedScrollSnap();
  });
};

onMounted(() => {
  const channel = supabase
    .channel("public:products-detail")
    .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `id=eq.${data.value?.baseId}` }, () => refresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `base_product_id=eq.${data.value?.baseId}` }, () => refresh())
    .subscribe();
  onUnmounted(() => {
    supabase.removeChannel(channel);
  });
});

const reviews = ref([
  { author: "Jane Doe", rating: 5, comment: "My dog loves it!" },
  { author: "Michael Chen", rating: 4, comment: "Great quality, fair price." },
]);

const user = useSupabaseUser()

const { data: _data_test } = await supabase.auth.getSession()
</script>

<template>
  <div class="container mx-auto px-4 py-6 md:py-8 bg-white">
    {{ user?.id }}
    <Alert v-if="error" variant="destructive" class="mb-4">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{{ (error as any)?.message || 'Failed to load product' }}</AlertDescription>
    </Alert>
    <!-- Desktop breadcrumbs -->
    <div class="hidden md:block mb-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/product">Products</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{{ product.name }}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>

    <div v-if="pending" class="grid lg:grid-cols-2 gap-8">
      <div class="rounded-2xl p-4 md:p-6">
        <Skeleton class="h-80 md:h-[70vh] w-full rounded-2xl" />
      </div>
      <div class="space-y-3">
        <Skeleton class="h-8 w-2/3" />
        <Skeleton class="h-6 w-1/3" />
        <Skeleton class="h-10 w-1/2" />
        <Skeleton class="h-24 w-full" />
      </div>
    </div>

    <div v-else class="grid lg:grid-cols-2 gap-8">
      <div class="rounded-2xl p-4 md:p-6">
        <Carousel
          class="w-full"
          :opts="{ loop: true }"
          @init-api="onInitApi"
        >
          <CarouselContent>
            <CarouselItem v-for="src in product.images ?? ['/images/placeholder.svg']" :key="src">
              <img
                :src="src"
                alt="Product image"
                class="w-full h-80 md:h-[70vh] object-contain rounded-2xl bg-white"
              />
            </CarouselItem>
          </CarouselContent>
          <div class="flex justify-center gap-2 mt-3">
            <button
              v-for="(_, idx) in product.images ?? ['/images/placeholder.svg']"
              :key="idx"
              type="button"
              class="w-2 h-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
              :class="idx === activeIndex ? 'bg-secondary' : 'bg-secondary/30'"
              @click="carouselApiRef?.scrollTo(idx)"
            />
          </div>
        </Carousel>
      </div>

      <div>
        <h1 class="text-2xl font-medium text-foreground">{{ product.name }}</h1>
        <div class="flex justify-start gap-3 items-center">
          <p v-if="product.brand" class="text-md text-secondary mt-1"><span class="text-gray-500">By</span> {{ product.brand }}</p>
          <p>.</p>
          <div class="flex items-center gap-2 mt-2 text-yellow-500">
            <Icon name="lucide:star" />
            <span class="text-muted-foreground">{{ product.rating }} (2.2k)</span>
            <Icon name="lucide:chevron-right" color="gray" />
          </div>
        </div>



        <div class="flex items-center justify-between gap-3 mt-4">
          <div>
            <span class="text-2xl font-semibold text-secondary"
              >OMR {{ product.price.toFixed(3) }}</span
            >
            <span
              v-if="product.compareAt != null"
              class="line-through text-muted-foreground"
              >OMR {{ product.compareAt?.toFixed(3) }}</span
            >
          </div>

          <div class="flex items-center gap-3 md:hidden">
            <Button
              variant="outline"
              class="w-9 h-9 rounded-full grid place-items-center"
              @click="qty = Math.max(1, qty - 1)"
            >
              <Icon name="lucide:minus" />
            </Button>
            <span class="text-lg font-medium">{{ qty }}</span>
            <Button
              variant="outline"
              class="w-9 h-9 rounded-full border-accent text-accent grid place-items-center"
              @click="qty++"
            >
              <Icon name="lucide:plus" />
            </Button>
          </div>

        </div>

        <div v-if="flavourGroup?.options?.length" class="mt-6">
          <h3 class="font-semibold mb-2 text-foreground">Flavour</h3>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="opt in flavourGroup!.options"
              :key="opt.id"
              variant="outline"
              :class="
                selectedFlavour?.id === opt.id
                  ? 'border-accent text-foreground'
                  : 'border-muted-foreground text-muted-foreground'
              "
              class="rounded-md px-4 py-2"
              @click="selectedFlavour = opt"
            >
              {{ opt.label ?? opt.value }}
            </Button>
          </div>
        </div>

        <div v-if="sizeGroup?.options?.length" class="mt-6">
          <h3 class="font-medium mb-2 text-foreground">Size</h3>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="opt in sizeGroup!.options"
              :key="opt.id"
              variant="outline"
              :class="
                selectedSize?.id === opt.id
                  ? 'border-accent text-foreground'
                  : 'border-muted-foreground text-muted-foreground'
              "
              class="w-12 h-12 rounded-full"
              @click="selectedSize = opt"
            >
              {{ opt.label ?? opt.value }}
            </Button>
          </div>
        </div>

        <div v-if="ageGroup?.options?.length" class="mt-6">
          <h3 class="font-medium mb-2 text-foreground">Age</h3>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="opt in ageGroup!.options"
              :key="opt.id"
              variant="outline"
              :class="
                selectedAge?.id === opt.id
                  ? 'border-accent text-foreground'
                  : 'border-muted-foreground text-muted-foreground'
              "
              class="rounded-md px-4 py-2"
              @click="selectedAge = opt"
            >
              {{ opt.label ?? opt.value }}
            </Button>
          </div>
        </div>

        <div class="mt-8 flex items-center gap-4">
          <!-- Desktop: show qty controls to the left of button -->
          <div class="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              class="w-9 h-9 rounded-full grid place-items-center"
              @click="qty = Math.max(1, qty - 1)"
            >
              <Icon name="lucide:minus" />
            </Button>
            <span class="text-lg font-medium">{{ qty }}</span>
            <Button
              variant="outline"
              class="w-9 h-9 rounded-full border-accent text-accent grid place-items-center"
              @click="qty++"
            >
              <Icon name="lucide:plus" />
            </Button>
          </div>

          <div class="flex-1">
            <AddToCartButton :product-id="product.id" :quantity="qty" />
          </div>
        </div>

        <!-- Details section -->
        <section class="mt-10">
          <h2 class="text-lg font-medium text-foreground">Details</h2>
          <div class="pt-2">
            <p class="text-sm text-muted-foreground">
              High-quality, grain-free formula crafted for sensitive pets.
              Brand: {{ product.brand ?? '—' }}.
            </p>
            <ul class="list-disc pl-5 mt-2 text-sm text-muted-foreground">
              <li>Protein-rich for muscle health</li>
              <li>Balanced omega for coat and skin</li>
              <li>No artificial flavors or preservatives</li>
            </ul>
          </div>
        </section>

        <!-- Reviews section stacked below details -->
        <section class="mt-8">
          <h2 class="text-lg font-medium text-foreground">Reviews</h2>
          <div class="pt-2">
            <div v-if="reviews.length" class="space-y-4">
              <div v-for="(r, i) in reviews" :key="i" class="border rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <p class="font-semibold">{{ r.author }}</p>
                  <div class="flex items-center gap-1 text-yellow-500">
                    <Icon name="lucide:star" />
                    <span class="text-muted-foreground text-sm">{{ r.rating }}/5</span>
                  </div>
                </div>
                <p class="text-sm text-muted-foreground mt-2">{{ r.comment }}</p>
              </div>
            </div>
            <p v-else class="text-sm text-muted-foreground">No reviews yet.</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
