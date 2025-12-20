<script setup lang="ts">
import { useCart } from '@/composables/useCart'
import { useSupabaseUser, navigateTo } from '#imports'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'

const props = defineProps<{
  productId: string
  variantId?: string
  quantity?: number
}>()

const { addToCart } = useCart()
const supabaseUser = useSupabaseUser()

const onAdd = async () => {
  if (!supabaseUser.value) {
    navigateTo('/login')
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
    @click="onAdd"
  >
    Add to Cart
  </Button>
  
</template>
