<script setup lang="ts">
import CategoryPill from '~/components/common/CategoryPill.vue'
import ProductCard from '~/components/product/ProductCard.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import Autoplay from 'embla-carousel-autoplay'
import type { UnwrapRefCarouselApi } from '@/components/ui/carousel/interface'
const supabase = useSupabaseClient()
const router = useRouter()
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

  
const categories = [
  { id: 'cat', name: 'Cat', icon: 'emojione-v1:cat-face' },
  { id: 'dog', name: 'Dog', icon: 'fluent-emoji-flat:dog-face' },
  { id: 'bird', name: 'Bird', icon: 'emojione-v1:bird' },
  { id: 'fish', name: 'Fish', icon: 'fxemoji:fish' },
  { id: 'other', name: 'Other', icon: 'fluent-color:animal-paw-print-20' },
] as const

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

const onCategoryClick = (id: typeof categories[number]['id']) => {
  router.push({ path: '/products', query: { pet: id } })
}
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
        <Skeleton class="h-48 w-full rounded-2xl" />
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
                alt="Promotion banner"
                class="w-full h-48 sm:h-48 md:h-64 lg:h-80 object-cover rounded-2xl"
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

    <!-- Categories -->
    <section class="container mx-auto px-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-semibold">Categories</h3>
        <!-- <NuxtLink to="/browse"><Button variant="ghost">See All</Button></NuxtLink> -->
      </div>
      <div class="grid grid-cols-5 sm:grid-cols-12 gap-4">
        <div v-for="c in categories" :key="c.id" @click="onCategoryClick(c.id)" class="cursor-pointer">
          <CategoryPill :item="{ name: c.name, icon: c.icon }" />
        </div>
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
  </div>
  
</template>
