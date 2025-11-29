<template>
  <Card class="overflow-hidden hover:shadow-md transition-shadow">
    <div class="relative">
      <img :src="product.image || placeholder" alt="" class="w-full h-48 object-cover" />
      <span
        v-if="product.discount && product.discount > 0"
        class="absolute left-3 top-3 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded"
      >
        {{ product.discount }}% OFF
      </span>
    </div>
    <CardContent class="p-4">
      <CardTitle class="text-base font-semibold">{{ product.name }}</CardTitle>
      <CardDescription class="text-xs">{{ product.brand }}</CardDescription>
      <div class="flex items-center gap-1 mt-2 text-yellow-500 text-sm">
        <Icon name="lucide:star" />
        <span class="text-gray-700">{{ product.rating }}</span>
      </div>
      <div class="flex items-center justify-between mt-3">
        <span class="font-bold text-lg text-secondary">${{ product.price.toFixed(2) }}</span>
        <Button class="w-9 h-9 p-0 rounded-full" @click="$emit('add', product)">
          <Icon name="lucide:plus" />
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
const props = defineProps<{ product: any }>()
const placeholder = '/images/placeholder.svg'
</script>