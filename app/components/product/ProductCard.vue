<template>
  <Card
    class="border-none rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white py-3 md:py-4 md:pb-0 cursor-pointer min-h-64"
    @click="goToProduct"
  >
    <div class="relative">
      <img :src="product.image || placeholder" alt="" class="w-full h-30 sm:h-48 object-contain bg-white rounded-t-2xl" />
      <span
        v-if="product.discount && product.discount > 0"
        class="absolute left-3 top-0 bg-yellow-200 text-secondary text-[11px] font-bold px-2.5 py-1 rounded-sm"
      >
        {{ product.discount }}% OFF
      </span>
    </div>
    <CardContent class="p-3 pt-2 sm:p-5 py-0 h-full flex flex-col justify-between">
      <CardTitle class="text-sm sm:text-lg font-medium leading-snug text-foreground">{{ product.name }}</CardTitle>
      <!-- <CardDescription class="text-xs sm:text-sm text-muted-foreground">{{ product.brand }}</CardDescription> -->

      <div class="flex items-center gap-1 mt-2 text-yellow-500 text-sm">
        <Icon name="lucide:star" />
        <span class="text-muted-foreground">{{ product.rating }}</span>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-baseline gap-1">
          <span class="font-medium text-sm sm:text-xl text-secondary">{{ formatOMR(product.price) }}</span>
          <span v-if="product.discount && product.discount > 0" class="text-muted-foreground line-through text-[10px]">{{ formatOMR(originalPrice) }}</span>
        </div>
        <Button class="size-7 md:size-8 p-0 rounded-full bg-accent text-accent-foreground hover:bg-accent/90" @click.stop="onAdd">
          <Icon name="lucide:plus" color="white" />
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatOMR } from '@/utils'
import { useCart } from '@/composables/useCart'
import { toast } from 'vue-sonner'

interface Product {
  id: string
  name: string
  brand: string
  price: number
  rating: number
  discount?: number
  image?: string
}

const props = defineProps<{ product: Product }>()
const placeholder = '/images/placeholder.svg'

const originalPrice = computed(() => {
  const discount = props.product.discount || 0
  if (discount <= 0) return props.product.price
  const factor = 1 - discount / 100
  return factor > 0 ? props.product.price / factor : props.product.price
})

const router = useRouter()
const { addToCart, refreshCart } = useCart()
const adding = ref(false)

const goToProduct = () => {
  router.push(`/product/${props.product.id}`)
}

const onAdd = async () => {
  if (adding.value) return
  adding.value = true
  try {
    await addToCart({ productId: props.product.id, quantity: 1 })
    await refreshCart()
    toast.success('Added to cart')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to add'
    if (msg === 'LOGIN_REQUIRED') toast.error('Please sign in to add items')
    else toast.error(msg)
  } finally {
    adding.value = false
  }
}
</script>
