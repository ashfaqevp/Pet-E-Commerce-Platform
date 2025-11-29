<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Cart</h1>

    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <div v-if="!items.length" class="bg-white rounded-xl border p-6 text-gray-600">
          Your cart is empty. <NuxtLink to="/" class="text-teal-700 underline">Continue shopping</NuxtLink>
        </div>

        <div v-else>
          <div v-for="(item,i) in items" :key="i" class="bg-white rounded-xl border p-4 flex gap-4">
            <img :src="item.image || '/images/placeholder.svg'" class="w-20 h-20 rounded-lg object-cover" />
            <div class="flex-1">
              <h4 class="font-semibold">{{ item.name }}</h4>
              <p class="text-xs text-secondary">{{ item.brand }}</p>
              <p class="text-xs text-gray-500">Size: {{ item.size }} lbs</p>
              <div class="flex items-center gap-3 mt-2">
                <Button variant="outline" class="w-8 h-8 rounded-full grid place-items-center" @click="dec(i)"><Icon name="lucide:minus"/></Button>
                <span>{{ item.quantity ?? 1 }}</span>
                <Button variant="outline" class="w-8 h-8 rounded-full grid place-items-center" @click="inc(i)"><Icon name="lucide:plus"/></Button>
              </div>
            </div>
            <div class="text-right">
              <p class="font-bold text-secondary">${{ (item.price * (item.quantity ?? 1)).toFixed(2) }}</p>
              <Button variant="ghost" class="mt-2 text-gray-500" @click="remove(i)"><Icon name="lucide:trash"/></Button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border p-6 h-fit">
        <h3 class="text-lg font-bold mb-4">Order Summary</h3>
        <div class="space-y-3">
          <div class="flex justify-between"><span>Subtotal:</span><span>${{ subtotal.toFixed(2) }}</span></div>
          <div class="flex justify-between"><span>Shipping & Tax:</span><span>${{ shipping.toFixed(2) }}</span></div>
          <div class="border-t pt-3 flex justify-between font-bold text-lg"><span>Total:</span><span>${{ total.toFixed(2) }}</span></div>
          <NuxtLink to="/checkout"><Button class="w-full mt-4">Checkout</Button></NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCartStore } from '@/stores/cart'
import { definePageMeta } from '#imports'
import { Button } from '@/components/ui/button'
// Login is optional; checkout does not enforce auth

const cart = useCartStore()
const items = computed(() => cart.items)
const subtotal = computed(() => cart.total)
const shipping = computed(() => (items.value.length ? 10 : 0))
const total = computed(() => subtotal.value + shipping.value)

const inc = (i:number) => cart.updateQuantity(i, (items.value[i]?.quantity ?? 1) + 1)
const dec = (i:number) => cart.updateQuantity(i, Math.max(1, (items.value[i]?.quantity ?? 1) - 1))
const remove = (i:number) => cart.removeItem(i)

definePageMeta({ layout: 'default' })
</script>