<template>
  <div class="container mx-auto px-4 py-6 md:py-8">
    

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
      <div class="bg-card rounded-2xl border p-4 md:p-6">
        <img :src="product.image || '/images/placeholder.svg'" alt="" class="w-full h-80 object-contain rounded-xl" />
        <!-- simple dot indicator -->
        <div class="mt-4 flex items-center justify-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"></span>
        </div>
      </div>

      <div>
        <h1 class="text-2xl font-bold text-foreground">{{ product.name }}</h1>
        <p class="text-sm text-secondary">By {{ product.brand }}</p>
        <div class="flex items-center gap-2 mt-2 text-yellow-500">
          <Icon name="lucide:star" />
          <span class="text-muted-foreground">{{ product.rating }} (2.2k)</span>
        </div>

        <div class="flex items-center gap-3 mt-4">
          <span class="text-3xl font-bold text-secondary">${{ product.price.toFixed(2) }}</span>
          <span v-if="product.compareAt != null" class="line-through text-muted-foreground">${{ product.compareAt?.toFixed(2) }}</span>
        </div>

        <div class="mt-6">
          <h3 class="font-semibold mb-2 text-foreground">Flavor</h3>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="f in flavors"
              :key="f"
              variant="outline"
              :class="selectedFlavor === f ? 'border-accent text-foreground' : 'border-muted-foreground text-muted-foreground'"
              class="rounded-xl px-4 py-2"
              @click="selectedFlavor = f"
            >
              {{ f }}
            </Button>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="font-semibold mb-2 text-foreground">Size in Pound</h3>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="s in sizes"
              :key="s"
              variant="outline"
              :class="selectedSize === s ? 'border-accent text-foreground' : 'border-muted-foreground text-muted-foreground'"
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
          <Button class="flex-1 py-3 rounded-full font-bold bg-secondary text-white hover:bg-secondary/90" @click="addToCart">Add to Cart</Button>
        </div>

        <Tabs default-value="details" class="mt-10">
          <TabsList class="w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>
          <TabsContent value="details" class="pt-4">
            <p class="text-sm text-muted-foreground">High-quality, grain-free formula crafted for sensitive pets. Brand: {{ product.brand }}.</p>
            <ul class="list-disc pl-5 mt-2 text-sm text-muted-foreground">
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
                    <span class="text-muted-foreground text-sm">{{ r.rating }}/5</span>
                  </div>
                </div>
                <p class="text-sm text-muted-foreground mt-2">{{ r.comment }}</p>
              </div>
            </div>
            <p v-else class="text-sm text-muted-foreground">No reviews yet.</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useLazyAsyncData, navigateTo, definePageMeta } from '#imports'
import { useCartStore } from '@/stores/cart'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb'

const route = useRoute()
const id = route.params.id as string
const { data } = await useLazyAsyncData(`product-${id}`, async () => {
  const res = await $fetch(`/api/products/${id}`)
  return (res as any)?.data
})
type Product = {
  id: string
  name: string
  brand: string
  price: number
  rating: number
  image?: string
  compareAt?: number
  discount?: number
}

const demoProducts: Product[] = [
  { id: '1', name: 'Chicken & Green Pea Recipe', brand: 'Natural Balance', price: 28.99, rating: 4.8, image: 'https://www.wiggles.in/cdn/shop/products/Untitled-1-01_2.png?v=1706864479', discount: 0 },
  { id: '2', name: 'Whitefish & Potato Recipe', brand: 'Blue Buffalo', price: 28.99, rating: 4.8, image: 'https://petstrong.in/cdn/shop/files/FOP_CV.webp?v=1732613363', discount: 25 },
  { id: '3', name: "Nature's Evolutionary Diet", brand: 'Blue Buffalo', price: 42.99, rating: 4.9, image: 'https://images.apollo247.in/pub/media/catalog/product/p/e/ped0079_111_2_.jpg?tr=q-80,f-webp,w-100,dpr-3,c-at_max%20100w', discount: 0 },
  { id: '4', name: 'Grain‑Free Turkey Recipe', brand: 'Wellness CORE', price: 32.50, rating: 4.7, image: 'https://m.media-amazon.com/images/I/61V-CvhDMwL._AC_UF1000,1000_QL80_.jpg', discount: 15 },
  { id: '5', name: 'Chicken & Green Pea Recipe', brand: 'Natural Balance', price: 28.99, rating: 4.8, image: 'https://www.wiggles.in/cdn/shop/products/Untitled-1-01_2.png?v=1706864479', discount: 0 },
  { id: '6', name: 'Whitefish & Potato Recipe', brand: 'Blue Buffalo', price: 28.99, rating: 4.8, image: 'https://petstrong.in/cdn/shop/files/FOP_CV.webp?v=1732613363', discount: 25 },
  { id: '7', name: "Nature's Evolutionary Diet", brand: 'Blue Buffalo', price: 42.99, rating: 4.9, image: 'https://images.apollo247.in/pub/media/catalog/product/p/e/ped0079_111_2_.jpg?tr=q-80,f-webp,w-100,dpr-3,c-at_max%20100w', discount: 0 },
  { id: '8', name: 'Grain‑Free Turkey Recipe', brand: 'Wellness CORE', price: 32.50, rating: 4.7, image: 'https://m.media-amazon.com/images/I/61V-CvhDMwL._AC_UF1000,1000_QL80_.jpg', discount: 15 },
]

const product = computed<Product>(() => {
  const p = (data.value as any) as Partial<Product> | undefined
  const sample = demoProducts.find(x => x.id === id)
  const price = typeof p?.price === 'number' ? p!.price : sample?.price ?? 28.99
  const discount = typeof p?.discount === 'number' ? p!.discount : sample?.discount ?? 0
  const compareAt = typeof p?.compareAt === 'number' ? p!.compareAt : (discount > 0 ? price / (1 - discount / 100) : undefined)
  return {
    id,
    name: p?.name ?? sample?.name ?? 'Product',
    brand: p?.brand ?? sample?.brand ?? 'Brand',
    price,
    rating: typeof p?.rating === 'number' ? p!.rating : sample?.rating ?? 4.8,
    image: p?.image ?? sample?.image,
    compareAt,
    discount,
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