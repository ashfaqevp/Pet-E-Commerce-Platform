<template>
  <div>
    <!-- Hero banner -->
    <section class="container mx-auto px-4 py-8">
      <div class="bg-gradient-to-r from-teal-500 to-teal-700 rounded-2xl p-8 text-white flex items-center justify-between">
        <div>
          <p class="uppercase tracking-wide">Christmas Offer</p>
          <h2 class="text-4xl md:text-5xl font-bold mt-1">25% OFF</h2>
          <p class="text-sm mt-1">Nov 16 – Dec 22</p>
          <NuxtLink to="/browse">
            <Button class="mt-6 rounded-full bg-yellow-400 text-black hover:bg-yellow-500">Shop Now</Button>
          </NuxtLink>
        </div>
        <div class="hidden md:block w-56 h-40 rounded-xl bg-white/10"></div>
      </div>
    </section>

    <!-- Categories -->
    <section class="container mx-auto px-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-2xl font-bold">Categories</h3>
        <NuxtLink to="/browse"><Button variant="ghost">See All</Button></NuxtLink>
      </div>
      <div class="grid grid-cols-5 sm:grid-cols-6 gap-4">
        <CategoryPill v-for="c in categories" :key="c.name" :item="c" />
      </div>
    </section>

    <!-- Top Selling -->
    <section class="container mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-2xl font-bold">Top Selling</h3>
        <NuxtLink to="/browse"><Button variant="ghost">See All</Button></NuxtLink>
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

<script setup lang="ts">
import CategoryPill from '~/components/common/CategoryPill.vue'
import ProductCard from '~/components/product/ProductCard.vue'
import { Button } from '@/components/ui/button'
const categories = [
  { name: 'Cat', icon: 'tabler:cat' },
  { name: 'Dog', icon: 'tabler:dog' },
  { name: 'Bird', icon: 'tabler:bird' },
  { name: 'Fish', icon: 'tabler:fish' },
  { name: 'Other', icon: 'lucide:circle-dot' },
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
</script>