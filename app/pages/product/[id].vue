<template>
  <div class="container mx-auto px-4 py-8">
    <NuxtLink to="/" class="text-teal-700 mb-6 inline-flex items-center gap-2">
      <Icon name="lucide:arrow-left" /> Back
    </NuxtLink>

    <div class="grid lg:grid-cols-2 gap-8">
      <div class="bg-white rounded-xl border p-6">
        <img :src="product.image || '/images/placeholder.svg'" alt="" class="w-full h-80 object-cover rounded-lg" />
      </div>

      <div>
        <h1 class="text-2xl font-bold">{{ product.name }}</h1>
        <p class="text-sm text-teal-700">By {{ product.brand }}</p>
        <div class="flex items-center gap-2 mt-2 text-yellow-500">
          <Icon name="lucide:star" />
          <span class="text-gray-700">{{ product.rating }} (2.2k)</span>
        </div>

      <div class="flex items-center gap-3 mt-4">
        <span class="text-3xl font-bold text-teal-700">${{ product.price.toFixed(2) }}</span>
          <span v-if="product.compareAt != null" class="line-through text-gray-400">${{ product.compareAt?.toFixed(2) }}</span>
      </div>

        <div class="mt-6">
          <h3 class="font-semibold mb-2">Flavor</h3>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="f in flavors"
              :key="f"
              :variant="selectedFlavor === f ? 'default' : 'outline'"
              class="rounded-xl"
              @click="selectedFlavor = f"
            >
              {{ f }}
            </Button>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="font-semibold mb-2">Size in Pound</h3>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="s in sizes"
              :key="s"
              :variant="selectedSize === s ? 'default' : 'outline'"
              class="w-12 h-12 rounded-full"
              @click="selectedSize = s"
            >
              {{ s }}
            </Button>
          </div>
        </div>

        <div class="mt-8 flex items-center gap-4">
          <div class="flex items-center gap-3">
            <Button variant="outline" class="w-9 h-9 rounded-full grid place-items-center" @click="qty = Math.max(1, qty-1)">
              <Icon name="lucide:minus" />
            </Button>
            <span class="text-lg">{{ qty }}</span>
            <Button variant="outline" class="w-9 h-9 rounded-full grid place-items-center" @click="qty++">
              <Icon name="lucide:plus" />
            </Button>
          </div>
          <Button class="flex-1 py-3 rounded-full font-bold" @click="addToCart">Add to Cart</Button>
        </div>

        <Tabs default-value="details" class="mt-10">
          <TabsList class="w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>
          <TabsContent value="details" class="pt-4">
            <p class="text-sm text-gray-700">High-quality, grain-free formula crafted for sensitive pets. Brand: {{ product.brand }}.</p>
            <ul class="list-disc pl-5 mt-2 text-sm text-gray-700">
              <li>Protein-rich for muscle health</li>
              <li>Balanced omega for coat and skin</li>
              <li>No artificial flavors or preservatives</li>
            </ul>
          </TabsContent>
          <TabsContent value="reviews" class="pt-4">
            <div v-if="reviews.length" class="space-y-4">
              <div v-for="(r, i) in reviews" :key="i" class="border rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <p class="font-semibold">{{ r.author }}</p>
                  <div class="flex items-center gap-1 text-yellow-500">
                    <Icon name="lucide:star" />
                    <span class="text-gray-700 text-sm">{{ r.rating }}/5</span>
                  </div>
                </div>
                <p class="text-sm text-gray-700 mt-2">{{ r.comment }}</p>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500">No reviews yet.</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useFetch, navigateTo, definePageMeta } from '#imports'
import { useCartStore } from '@/stores/cart'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const route = useRoute()
const id = route.params.id as string
const { data } = await useFetch(`/api/products/${id}`)
type Product = {
  id: string
  name: string
  brand: string
  price: number
  rating: number
  image?: string
  compareAt?: number
}

const product = computed<Product>(() => {
  const p = (data.value as any)?.data as Partial<Product> | undefined
  return {
    id,
    name: p?.name ?? 'Product',
    brand: p?.brand ?? 'Brand',
    price: typeof p?.price === 'number' ? p.price : 28.99,
    rating: typeof p?.rating === 'number' ? p.rating : 4.8,
    image: p?.image,
    compareAt: p?.compareAt,
  }
})

const flavors = ['Chicken & Green Pea', 'Duck & Green Pea', 'Salmon & Green Pea', 'Turkey & PeaChickpea']
const sizes = [2, 4, 4.5, 5, 8, 10, 15]
const selectedFlavor = ref(flavors[0])
const selectedSize = ref(sizes[4])
const qty = ref(1)

const cart = useCartStore()
const addToCart = () => {
  cart.addItem({ ...product.value, id, flavor: selectedFlavor.value, size: selectedSize.value, quantity: qty.value })
  navigateTo('/cart')
}

const reviews = ref([
  { author: 'Jane Doe', rating: 5, comment: 'My dog loves it!' },
  { author: 'Michael Chen', rating: 4, comment: 'Great quality, fair price.' },
])
definePageMeta({ layout: 'default' })
</script>