<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, definePageMeta } from "#imports";
import { Button } from "@/components/ui/button";
import AddToCartButton from "@/components/AddToCartButton.vue";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import type { UnwrapRefCarouselApi } from "@/components/ui/carousel/interface";
import Autoplay from "embla-carousel-autoplay";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const route = useRoute();
const id = route.params.id as string;
// Using static product data for this page
type VariantOption = {
  id: string;
  label?: string;
  value: string | number;
  priceDelta?: number;
  inStock?: boolean;
};

type VariantGroup = {
  name: "Flavor" | "Size" | "Age" | string;
  key: "flavor" | "size" | "age" | string;
  options: VariantOption[];
};

type Product = {
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

// Sample product used only when API data is missing, for UI demonstration
const sampleProduct: Product = {
  id: "sample",
  name: "Bestpet Kitten Chicken 85g",
  brand: "Bestpet",
  price: 0.300,
  rating: 4.8,
  thumbnail:
    "https://www.wiggles.in/cdn/shop/products/Untitled-1-01_2.png?v=1706864479",
  images: [
    "https://www.wiggles.in/cdn/shop/products/Untitled-1-01_2.png?v=1706864479",
    "https://www.wiggles.in/cdn/shop/products/Untitled-1-01_3.png?v=1706864479",
    "https://www.wiggles.in/cdn/shop/products/Untitled-1-01_4.png?v=1706864479",
  ],
  discount: 0,
  variants: [
    {
      name: "Flavor",
      key: "flavor",
      options: [
        { id: "flv-chicken", label: "Chicken & Green Pea", value: "chicken-green-pea" },
        { id: "flv-duck", label: "Duck & Green Pea", value: "duck-green-pea" },
        { id: "flv-salmon", label: "Salmon & Green Pea", value: "salmon-green-pea" },
      ],
    },
    {
      name: "Size",
      key: "size",
      options: [
        { id: "size-2", label: "2 lb", value: 2 },
        { id: "size-4", label: "4 lb", value: 4 },
        { id: "size-5", label: "5 lb", value: 5 },
        { id: "size-8", label: "8 lb", value: 8 },
        { id: "size-10", label: "10 lb", value: 10 },
      ],
    },
    {
      name: "Age",
      key: "age",
      options: [
        { id: "age-puppy", label: "Puppy", value: "puppy" },
        { id: "age-adult", label: "Adult", value: "adult" },
        { id: "age-senior", label: "Senior", value: "senior" },
      ],
    },
  ],
};



const product = computed<Product>(() => {
  const p = sampleProduct
  const price = typeof p.price === "number" ? p.price : 0;
  const discount = typeof p.discount === "number" ? p.discount : 0;
  const compareAt =
    typeof p.compareAt === "number"
      ? p.compareAt
      : discount > 0 && price > 0
      ? price / (1 - discount / 100)
      : undefined;

  // Build images array: prepend thumbnail to images if present
  const images = (() => {
    const list = p.images ?? [];
    if (p.thumbnail) {
      return [p.thumbnail, ...list.filter((u) => u !== p.thumbnail)];
    }
    return list.length ? list : undefined;
  })();

  return {
    id,
    name: p.name ?? "Product",
    brand: p.brand, // hide when missing
    price,
    rating: typeof p.rating === "number" ? p.rating : 0,
    thumbnail: p.thumbnail,
    images,
    compareAt,
    discount,
    variants: p.variants ?? [],
  };
});

const variants = computed(() => product.value.variants ?? []);
const flavorGroup = computed(() => variants.value.find((v) => v.key === "flavor"));
const sizeGroup = computed(() => variants.value.find((v) => v.key === "size"));
const ageGroup = computed(() => variants.value.find((v) => v.key === "age"));

const selectedFlavor = ref<VariantOption | null>(null);
const selectedSize = ref<VariantOption | null>(null);
const selectedAge = ref<VariantOption | null>(null);

watch(flavorGroup, (g) => {
  selectedFlavor.value = g?.options?.[0] ?? null;
}, { immediate: true });

watch(sizeGroup, (g) => {
  selectedSize.value = g?.options?.[0] ?? null;
}, { immediate: true });

watch(ageGroup, (g) => {
  selectedAge.value = g?.options?.[0] ?? null;
}, { immediate: true });

// Narrow variant values to satisfy CartItem types
const flavorValue = computed<string | undefined>(() => {
  const v = selectedFlavor.value?.value;
  return typeof v === 'string' ? v : undefined;
});

const sizeValue = computed<number | undefined>(() => {
  const v = selectedSize.value?.value;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
});

const ageValue = computed<string | number | undefined>(() => selectedAge.value?.value);
const qty = ref(1);

// Carousel state
const activeIndex = ref(0);
const carouselApiRef = ref<UnwrapRefCarouselApi | null>(null);

// Initialize carousel API and keep dots in sync
const onInitApi = (api: UnwrapRefCarouselApi) => {
  if (!api)
    return;

  carouselApiRef.value = api;
  activeIndex.value = api.selectedScrollSnap();
  api.on("select", () => {
    activeIndex.value = api.selectedScrollSnap();
  });
};





const reviews = ref([
  { author: "Jane Doe", rating: 5, comment: "My dog loves it!" },
  { author: "Michael Chen", rating: 4, comment: "Great quality, fair price." },
]);
definePageMeta({ layout: "default" });
</script>

<template>
  <div class="container mx-auto px-4 py-6 md:py-8 bg-white">
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

    <div class="grid lg:grid-cols-2 gap-8">
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

        <div v-if="flavorGroup?.options?.length" class="mt-6">
          <h3 class="font-semibold mb-2 text-foreground">Flavor</h3>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="opt in flavorGroup!.options"
              :key="opt.id"
              variant="outline"
              :class="
                selectedFlavor?.id === opt.id
                  ? 'border-accent text-foreground'
                  : 'border-muted-foreground text-muted-foreground'
              "
              class="rounded-md px-4 py-2"
              @click="selectedFlavor = opt"
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
            <AddToCartButton :product-id="id" />
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
