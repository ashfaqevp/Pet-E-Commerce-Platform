<script setup lang="ts">
import ProductCard from '~/components/product/ProductCard.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import Autoplay from 'embla-carousel-autoplay'
import type { UnwrapRefCarouselApi } from '@/components/ui/carousel/interface'
const supabase = useSupabaseClient()
import { useWindowSize } from '@vueuse/core'
import { useSeoMeta } from '#imports'

interface BannerRow {
  name: string
  mobile: string
  desktop: string
}
// Carousel banners from public folder
// const banners: Banner[] = [
//   { mobile: '/images/banners/2-mobile.png', desktop: '/images/banners/2-desktop.png' },
//   { mobile: '/images/banners/1-mobile.png', desktop: '/images/banners/1-desktop.png' },

// ]
const { data: bannersData, pending: bannersPending, error: bannersError, refresh: refreshBanners } = await useLazyAsyncData(
  'home-banners',
  async () => {
    const { data, error } = await supabase
      .from('banners')
      .select('name,mobile,desktop')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as BannerRow[]
  },
  { server: true }
)
const banners = computed(() => (bannersData.value ?? []).map(b => ({ mobile: b.mobile, desktop: b.desktop })))

  
const { fetchActivePetTypes } = usePetTypes()
const { data: activePetTypesData } = await useLazyAsyncData(
  'home-pet-types',
  fetchActivePetTypes,
  { server: true }
)
const activePetTypes = computed(() => activePetTypesData.value ?? [])

interface ProductRow {
  id: string
  name: string
  retail_price?: number | null
  wholesale_price?: number | null
  default_rating?: number | null
  thumbnail_url?: string | null
}

interface CardProduct {
  id: string
  name: string
  brand: string
  price: number
  rating: number
  discount?: number
  image?: string
  retail_price?: number | null
  wholesale_price?: number | null
}

const mapRow = (row: ProductRow): CardProduct => ({
  id: String(row.id),
  name: row.name,
  brand: '',
  price: Number(row.retail_price || 0),
  rating: Number(row.default_rating || 0),
  discount: 0,
  image: row.thumbnail_url || undefined,
  retail_price: row.retail_price ?? null,
  wholesale_price: row.wholesale_price ?? null,
})

const { data: featuredData, pending: featuredPending, error: featuredError, refresh: refreshFeatured } = await useLazyAsyncData(
  'home-featured-products',
  async () => {
    let q = supabase
      .from('products')
      .select('id,name,retail_price,wholesale_price,default_rating,thumbnail_url', { count: 'exact' })
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .range(0, 23)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as ProductRow[]
  },
  { server: true }
)

definePageMeta({ layout: 'default' })

// Carousel state for dots pagination
const activeIndex = ref(0)
const carouselApiRef = ref<UnwrapRefCarouselApi | null>(null)
const onInitApi = (api: UnwrapRefCarouselApi) => {
  if (!api)
    return

  carouselApiRef.value = api
  activeIndex.value = api.selectedScrollSnap()
  api.on('select', () => {
    activeIndex.value = api.selectedScrollSnap()
  })
}

const featuredProducts = computed<CardProduct[]>(() => (featuredData.value ?? []).map(mapRow))

const { fetchActiveBrands } = useBrands()
const { data: featuredBrandsData } = await useLazyAsyncData(
  'featured-brands',
  async () => {
    const brands = await fetchActiveBrands()
    const featured = brands.filter(b => b.is_featured)

    if (featured.length === 0) return []

    // Fetch product counts for these brands
    const { data: countsData, error: countsError } = await supabase
      .from('products')
      .select('brand_id')
      .eq('is_active', true)
      .not('brand_id', 'is', null)

    if (countsError) throw countsError

    const countsMap = (countsData || []).reduce((acc: Record<string, number>, curr: { brand_id: string | null }) => {
      if (curr.brand_id) {
        acc[curr.brand_id] = (acc[curr.brand_id] || 0) + 1
      }
      return acc
    }, {})

    return featured.map(b => ({
      ...b,
      product_count: countsMap[b.id] || 0
    }))
  },
  { server: true }
)
const featuredBrands = computed(() => featuredBrandsData.value ?? [])

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)

useSeoMeta({
  title: 'Buypets.om — Quality Pet Products',
  ogTitle: 'Buypets.om — Quality Pet Products',
  description: 'Shop premium pet supplies for cats, dogs, birds and fish. Fast delivery and great prices.',
  ogDescription: 'Shop premium pet supplies for cats, dogs, birds and fish. Fast delivery and great prices.',
  ogImage: '/favicon-96x96.png',
  twitterCard: 'summary_large_image',
})
onMounted(() => {
  const channel = supabase
    .channel('public:home-banners')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
      refreshBanners()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})
</script>


<template>
  <div>
    <!-- Hero banner: shadcn-vue Carousel with sliding images -->
    <section class="container mx-auto px-4 py-6">
      <div v-if="bannersPending" class="w-full">
        <Skeleton class="w-full aspect-[16/9] md:aspect-[8/3] rounded-2xl" />
      </div>
      <div v-else>
        <Carousel
          class="w-full"
          :opts="{ loop: true }"
          :plugins="[Autoplay({ delay: 5000, stopOnMouseEnter: true })]"
          @init-api="onInitApi"
        >
          <CarouselContent>
            <CarouselItem v-for="(b, idx) in banners" :key="idx">
              <img
                :src="isMobile ? b.mobile : b.desktop"
                loading="lazy"
                decoding="async"
                alt="Promotion banner"
                class="w-full aspect-[16/9] md:aspect-[8/3] object-cover rounded-2xl"
              />
            </CarouselItem>
          </CarouselContent>
          <div class="flex justify-center gap-2 mt-3">
            <button
              v-for="(b, idx) in banners"
              :key="idx"
              type="button"
              class="w-2 h-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
              :class="idx === activeIndex ? 'bg-secondary' : 'bg-secondary/30'"
              @click="carouselApiRef?.scrollTo(idx)"
            />
          </div>
        </Carousel>
        <Alert v-if="bannersError" variant="destructive" class="mt-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{{ bannersError.message || 'Failed to load banners' }}</AlertDescription>
        </Alert>
      </div>
    </section>

    <!-- Shop by Pet -->
    <section v-if="activePetTypes.length" class="container mx-auto px-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-semibold">Shop by Pet</h3>
      </div>
      <div class="flex flex-wrap gap-4 justify-center md:justify-start">
        <NuxtLink
          v-for="pet in activePetTypes"
          :key="pet.id"
          :to="`/products?pet=${pet.slug}`"
          class="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card hover:border-secondary hover:shadow-md transition-all w-24 md:w-28"
        >
          <img
            v-if="pet.image_url"
            :src="pet.image_url"
            :alt="pet.name"
            class="h-14 w-14 object-contain"
          />
          <div v-else class="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Icon name="lucide:paw-print" class="w-7 h-7 text-muted-foreground" />
          </div>
          <span class="text-sm font-medium text-center text-foreground">{{ pet.name }}</span>
        </NuxtLink>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="container mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-semibold">Featured</h3>
        <NuxtLink :to="{ path: '/products' }"><Button variant="ghost" class="underline">See All</Button></NuxtLink>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        <template v-if="featuredPending">
          <Skeleton v-for="i in 8" :key="`feat-s-${i}`" class="h-64 w-full rounded-lg" />
        </template>
        <template v-else>
          <ProductCard v-for="p in featuredProducts" :key="p.id" :product="p" />
        </template>
      </div>
      <Alert v-if="featuredError" variant="destructive" class="mt-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{{ featuredError.message || 'Failed to load featured' }}</AlertDescription>
      </Alert>
    </section>

    <!-- Shop by Brand -->
    <section v-if="featuredBrands.length" class="container mx-auto px-4 py-12 border-t">
      <div class="flex items-center justify-between mb-8">
        <h3 class="text-xl font-semibold">Shop by Brand</h3>
      </div>
      <div class="flex items-start gap-8 md:gap-16 overflow-x-auto pb-4 no-scrollbar">
        <NuxtLink
          v-for="brand in (featuredBrands as any[])"
          :key="brand.id"
          :to="`/brands/${brand.slug}`"
          class="flex flex-col items-center gap-3 min-w-[120px] md:min-w-[140px] group shrink-0"
        >
          <div class="h-20 w-full flex items-center justify-center">
            <img
              v-if="brand.logo_url"
              :src="brand.logo_url"
              :alt="brand.name"
              class="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <span v-else class="text-sm font-bold text-center text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-tight">{{ brand.name }}</span>
          </div>
          <div class="text-center">
            <span class="text-[11px] md:text-xs font-semibold text-black tracking-wider transition-colors group-hover:text-secondary">
              {{ brand.name }} ({{ brand.product_count || 0 }})
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
  
</template>
