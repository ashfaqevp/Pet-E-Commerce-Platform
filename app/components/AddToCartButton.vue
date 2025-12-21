<script setup lang="ts">
import { useCart } from '@/composables/useCart'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'

const props = defineProps<{
  productId: string
  quantity?: number
}>()

const { addToCart } = useCart()

const onAddToCart = async () => {
  try {
    await addToCart({ productId: props.productId, quantity: props.quantity ?? 1 })
    toast.success('Added to cart')
  } catch {
    toast.error('Failed to add')
  }
}
</script>

<template>
  <Button
    class="w-full py-3 rounded-full font-bold bg-secondary text-white hover:bg-secondary/90"
    size="lg"
    @click="onAddToCart"
  >
    Add to Cart
  </Button>
  
</template>
