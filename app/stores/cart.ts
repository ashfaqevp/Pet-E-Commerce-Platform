import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

type CartItem = { id?: string; flavor?: string; size?: number; price: number; quantity?: number; [k: string]: any }

export const useCartStore = defineStore('cart', () => {
  const items = useLocalStorage<CartItem[]>('bh-cart-store', [])

  const addItem = (product: CartItem) => {
    const existing = items.value.find((i) => i.id === product.id && i.flavor === product.flavor && i.size === product.size)
    if (existing) existing.quantity = (existing.quantity || 1) + (product.quantity || 1)
    else items.value.push({ ...product, quantity: product.quantity || 1 })
  }

  const updateQuantity = (index: number, qty: number) => {
    if (!items.value[index]) return
    items.value[index].quantity = qty
  }

  const removeItem = (index: number) => {
    items.value.splice(index, 1)
  }

  const total = computed(() => items.value.reduce((sum: number, i: CartItem) => sum + (i.price * (i.quantity || 1)), 0))

  return { items, addItem, updateQuantity, removeItem, total }
})
