<script setup lang="ts">
definePageMeta({ layout: 'default' })
import ProductCard from '~/components/product/ProductCard.vue'
import { Skeleton } from '@/components/ui/skeleton'

const route = useRoute()
const supabase = useSupabaseClient()
const { fetchBrandBySlug } = useBrands()

const { data: brand, error: brandError } = await useLazyAsyncData(
  `brand-${route.params.slug}`,
  () => fetchBrandBySlug(route.params.slug as string),
  { server: true }
)

const { data: productsData, pending: productsPending } = await useLazyAsyncData(
  `brand-products-${route.params.slug}`,
  async () => {
    if (!brand.value) return []
    const { data, error } = await supabase
      .from('products')
      .select('id,name,retail_price,wholesale_price,default_rating,thumbnail_url,brand,brand_id')
      .eq('brand_id', brand.value.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
  { server: true, watch: [brand] }
)

useSeoMeta({
  title: () => brand.value ? `${brand.value.name} | Buypets.om` : 'Brand | Buypets.om',
  description: () => brand.value?.description ?? `Shop all ${brand.value?.name ?? ''} products.`,
})

interface CardProduct {
  id: string
  name: string
  brand: string
  price: number
  rating: number
  image?: string
  retail_price?: number | null
  wholesale_price?: number | null
}

const products = computed<CardProduct[]>(() =>
  (productsData.value ?? []).map((p: any) => ({
    id: String(p.id),
    name: p.name,
    brand: brand.value?.name ?? p.brand ?? '',
    price: Number(p.retail_price || 0),
    rating: Number(p.default_rating || 0),
    image: p.thumbnail_url ?? undefined,
    retail_price: p.retail_price ?? null,
    wholesale_price: p.wholesale_price ?? null,
  }))
)
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="brandError" class="text-center py-16">
      <p class="text-xl font-semibold text-foreground">Brand not found</p>
      <NuxtLink to="/" class="text-secondary underline mt-2 inline-block">Back to home</NuxtLink>
    </div>

    <template v-else-if="brand">
      <div class="flex flex-col items-center gap-4 mb-8">
        <img
          v-if="brand.logo_url"
          :src="brand.logo_url"
          :alt="brand.name"
          class="max-h-24 object-contain"
        />
        <h1 class="text-3xl font-semibold text-foreground">{{ brand.name }}</h1>
        <p v-if="brand.description" class="text-muted-foreground text-center max-w-xl">{{ brand.description }}</p>
      </div>

      <div v-if="productsPending" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <Skeleton v-for="i in 8" :key="i" class="h-64 w-full rounded-lg" />
      </div>

      <div v-else-if="products.length === 0" class="text-center py-16">
        <p class="text-muted-foreground">No products found for this brand.</p>
        <NuxtLink to="/products" class="text-secondary underline mt-2 inline-block">Browse all products</NuxtLink>
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        <ProductCard v-for="p in products" :key="p.id" :product="p" />
      </div>
    </template>
  </div>
</template>
