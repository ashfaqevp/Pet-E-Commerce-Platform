<script setup lang="ts">
import CategoryPill from '~/components/common/CategoryPill.vue'
import ProductCard from '~/components/product/ProductCard.vue'
import { Button } from '@/components/ui/button'
import Autoplay from 'embla-carousel-autoplay'
import type { UnwrapRefCarouselApi } from '@/components/ui/carousel/interface'
// Carousel banners from public folder
const banners: string[] = [
  '/images/banners/1.png',
  '/images/banners/2.png',
]
const categories = [
  { name: 'Cat', icon: 'emojione-v1:cat-face' },
  { name: 'Dog', icon: 'fluent-emoji-flat:dog-face' },
  { name: 'Bird', icon: 'emojione-v1:bird' },
  { name: 'Fish', icon: 'fxemoji:fish' },
  { name: 'Other', icon: 'fluent-color:animal-paw-print-20' },
]

const products = [
  { id: '1', name: 'Chicken & Green Pea Recipe', brand: 'Natural Balance', price: 28.99, rating: 4.8, image: '/images/products/cat-food-1.jpg', discount: 0 },
  { id: '2', name: 'Whitefish & Potato Recipe', brand: 'Blue Buffalo', price: 28.99, rating: 4.8, image: '/images/products/cat-food-2.jpg', discount: 25 },
  { id: '3', name: "Nature's Evolutionary Diet", brand: 'Blue Buffalo', price: 42.99, rating: 4.9, image: '/images/products/cat-food-3.jpg', discount: 0 },
  { id: '4', name: 'Grain‑Free Turkey Recipe', brand: 'Wellness CORE', price: 32.50, rating: 4.7, image: '/images/products/cat-food-4.jpg', discount: 15 },
]

const router = useRouter()
const addToCart = (p: any) => router.push(`/product/${p.id}`)
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
</script>


<template>
  <div>
    <!-- Hero banner: shadcn-vue Carousel with sliding images -->
    <section class="container mx-auto px-4 py-6">
      <Carousel
        class="w-full"
        :opts="{ loop: true }"
        :plugins="[Autoplay({ delay: 5000, stopOnMouseEnter: true })]"
        @init-api="onInitApi"
      >
        <CarouselContent>
          <CarouselItem v-for="src in banners" :key="src">
            <img
              :src="src"
              alt="Promotion banner"
              class="w-full h-48 sm:h-48 md:h-64 lg:h-80 object-cover rounded-2xl"
            />
          </CarouselItem>
        </CarouselContent>
        <!-- Dots pagination -->
        <div class="flex justify-center gap-2 mt-3">
          <button
            v-for="(_, idx) in banners"
            :key="idx"
            type="button"
            class="w-2 h-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
            :class="idx === activeIndex ? 'bg-secondary' : 'bg-secondary/30'"
            @click="carouselApiRef?.scrollTo(idx)"
          />
        </div>
      </Carousel>
    </section>

    <!-- Categories -->
    <section class="container mx-auto px-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-semibold">Categories</h3>
        <!-- <NuxtLink to="/browse"><Button variant="ghost">See All</Button></NuxtLink> -->
      </div>
      <div class="grid grid-cols-5 sm:grid-cols-12 gap-4">
        <CategoryPill v-for="c in categories" :key="c.name" :item="c" />
      </div>
    </section>

    <!-- Top Selling -->
    <section class="container mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-semibold">Products</h3>
        <!-- <NuxtLink to="/browse"><Button variant="ghost">See All</Button></NuxtLink> -->
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          @add="addToCart"
        />
      </div>
    </section>
  </div>
  
</template>

