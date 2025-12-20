<script setup lang="ts">
import { useCart } from '@/composables/useCart'
import { useSupabaseUser } from '#imports'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'

const props = defineProps<{
  productId: string
  variantId?: string
  quantity?: number
}>()

const { addToCart } = useCart()
const user = useSupabaseUser()
const authStore = useAuthStore()

const onAddToCart = async () => {
  if (!user.value) {
    authStore.requireAuth()
    return
  }

  try {
    await addToCart({
      productId: props.productId,
      variantId: props.variantId,
      quantity: props.quantity ?? 1,
    })
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
