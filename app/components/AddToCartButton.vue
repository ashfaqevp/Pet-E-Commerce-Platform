<script setup lang="ts">
import { useCart } from '@/composables/useCart'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { ref } from '#imports'

const props = defineProps<{
  productId: string
  quantity?: number
}>()

const { addToCart, refreshCart } = useCart()
const loading = ref(false)

const onAddToCart = async () => {
  if (loading.value) return
  loading.value = true
  try {
    await addToCart({ productId: props.productId, quantity: Math.max(1, props.quantity ?? 1) })
    await refreshCart()
    toast.success('Added to cart')
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'LOGIN_REQUIRED') {
      useAuthStore().requireAuth()
    } else {
      toast.error('Failed to add')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Button
    class="w-full py-3 rounded-full font-bold bg-secondary text-white hover:bg-secondary/90 disabled:opacity-60 disabled:cursor-not-allowed"
    size="lg"
    @click="onAddToCart"
    :disabled="loading"
  >
    <span v-if="!loading">Add to Cart</span>
    <span v-else>Adding...</span>
  </Button>
  
</template>
