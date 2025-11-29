<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Top Navbar -->
    <header class="bg-white/90 backdrop-blur border-b">
      <div class="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <Icon name="lucide:map-pin" class="text-secondary" />
          <div class="text-sm">
            <p class="font-semibold">Zurich, love road</p>
            <p class="text-gray-500">Switzerland</p>
          </div>
        </div>

        <div class="flex-1 max-w-xl">
          <div class="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <Icon name="lucide:search" class="text-gray-500" />
            <Input class="bg-transparent border-0 focus:ring-0 w-full text-sm" placeholder="Search for food, toys, etc." />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink to="/cart" class="relative">
            <Icon name="lucide:shopping-cart" class="text-foreground" />
          </NuxtLink>
          <NuxtLink to="/profile">
            <Icon name="lucide:user-round" class="text-foreground" />
          </NuxtLink>
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="mt-16 py-10 border-t bg-white">
      <div class="container mx-auto px-4 text-center text-sm text-gray-600">
        © {{ new Date().getFullYear() }} <span class="text-secondary">Blackhorse PetShop</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
</script>