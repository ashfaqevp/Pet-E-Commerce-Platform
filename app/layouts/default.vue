<script setup lang="ts">
import { ref } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Logo from '@/components/common/Logo.vue'

const route = useRoute()
const router = useRouter()
const searchQuery = ref('')
const isSearchFocused = ref(false)

// SSR-safe mobile breakpoint tracking
const isMobile = ref(false)
let updateMobile: (() => void) | undefined
onMounted(() => {
  updateMobile = () => {
    isMobile.value = window.innerWidth <= 768
  }
  updateMobile()
  window.addEventListener('resize', updateMobile)
})
onBeforeUnmount(() => {
  if (updateMobile) window.removeEventListener('resize', updateMobile)
})

const navItems = [
  { path: '/', label: 'Home', icon: 'lucide:home' },
  { path: '/cart', label: 'Cart', icon: 'lucide:shopping-cart' },
  { path: '/wishlist', label: 'Wishlist', icon: 'lucide:heart' },
  { path: '/profile', label: 'Profile', icon: 'lucide:user-round' },
]

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push(`/search?q=${searchQuery.value}`)
  }
}

// (removed non-SSR-safe window access at setup time)
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="sticky top-0 z-40 w-full border-b bg-background">
      <div class="container mx-auto px-2 md:px-4 flex h-16 items-center justify-between gap-6">
        <!-- Mobile: Logo + optional search input (shown on the right) -->
        <div class="md:hidden flex-1 flex items-center gap-2 w-full ">
          <Logo />
        </div>

          <div v-show="isSearchFocused" class=" relative">
            <Input
              v-model="searchQuery"
              class="w-full"
              placeholder="Search"
              @keyup.enter="handleSearch"
            />
            <Button variant="ghost" size="icon" class="absolute right-2 top-1/2 -translate-y-1/2" @click="isSearchFocused = false">
              <Icon name="lucide:x" class="h-4 w-4" />
            </Button>
          </div>

        <!-- Desktop: Logo -->
        <div v-if="!isMobile" class="hidden md:flex md:flex-1 md:items-center">
          <Logo />
        </div>

        <!-- Desktop: Search -->
        <div v-if="!isMobile" class="hidden md:flex flex-1 items-center justify-center ">
          <div class="w-full max-w-xl">
          <Input
            v-model="searchQuery"
            class="w-full"
            placeholder="Search for food, toys, etc."
            @keyup.enter="handleSearch"
          />
          </div>
        </div>

          <Button v-if="!isSearchFocused" variant="ghost" size="icon" class="md:hidden" @click="isSearchFocused = true">
            <Icon name="lucide:search" class="h-5 w-5" />
          </Button>

        <!-- Actions -->
        <div v-if="!isMobile"  class="flex items-center gap-2">
          <!-- Mobile: only search trigger -->

          <!-- Desktop: actions -->
          <div class="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Icon name="lucide:bell" class="h-5 w-5" />
            </Button>
            <NuxtLink to="/cart">
              <Button variant="ghost" size="icon">
                <Icon name="lucide:shopping-cart" class="h-5 w-5" />
              </Button>
            </NuxtLink>
            <NuxtLink to="/profile">
              <Button variant="ghost" size="icon">
                <Icon name="lucide:user-round" class="h-5 w-5" />
              </Button>
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Page Content -->
    <main class="pb-20 md:pb-0 bg-gray-50">
      <slot />
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div class="grid grid-cols-4 gap-1 py-2">
        <NuxtLink v-for="item in navItems" :key="item.path" :to="item.path" class="flex flex-col items-center gap-1 text-xs" :class="isActive(item.path) ? 'text-secondary' : 'text-muted-foreground'">
          <Icon :name="item.icon" class="h-6 w-6" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <!-- Footer (Desktop) -->
    <footer class="hidden md:block mt-16 py-10 border-t">
      <div class="container mx-auto px-4">
        <div class="flex flex-col md:flex-row justify-between items-center gap-8">
          <div class="max-w-sm">
            <Logo />
            <p class="mt-4 text-sm text-muted-foreground">
              Your one-stop shop for all pet needs. High-quality food, toys, and accessories.
            </p>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 class="font-semibold text-foreground">Shop</h3>
              <ul class="mt-4 space-y-2 text-sm">
                <li><NuxtLink to="/products/dogs" class="text-muted-foreground hover:text-secondary">Dogs</NuxtLink></li>
                <li><NuxtLink to="/products/cats" class="text-muted-foreground hover:text-secondary">Cats</NuxtLink></li>
                <li><NuxtLink to="/products/birds" class="text-muted-foreground hover:text-secondary">Birds</NuxtLink></li>
                <li><NuxtLink to="/products/fish" class="text-muted-foreground hover:text-secondary">Fish</NuxtLink></li>
              </ul>
            </div>
            <div>
              <h3 class="font-semibold text-foreground">About</h3>
              <ul class="mt-4 space-y-2 text-sm">
                <li><NuxtLink to="/about" class="text-muted-foreground hover:text-secondary">About Us</NuxtLink></li>
                <li><NuxtLink to="/careers" class="text-muted-foreground hover:text-secondary">Careers</NuxtLink></li>
                <li><NuxtLink to="/press" class="text-muted-foreground hover:text-secondary">Press</NuxtLink></li>
              </ul>
            </div>
            <div>
              <h3 class="font-semibold text-foreground">Support</h3>
              <ul class="mt-4 space-y-2 text-sm">
                <li><NuxtLink to="/contact" class="text-muted-foreground hover:text-secondary">Contact</NuxtLink></li>
                <li><NuxtLink to="/faq" class="text-muted-foreground hover:text-secondary">FAQ</NuxtLink></li>
                <li><NuxtLink to="/shipping" class="text-muted-foreground hover:text-secondary">Shipping</NuxtLink></li>
              </ul>
            </div>
            <div>
              <h3 class="font-semibold text-foreground">Legal</h3>
              <ul class="mt-4 space-y-2 text-sm">
                <li><NuxtLink to="/terms" class="text-muted-foreground hover:text-secondary">Terms of Service</NuxtLink></li>
                <li><NuxtLink to="/privacy" class="text-muted-foreground hover:text-secondary">Privacy Policy</NuxtLink></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          © {{ new Date().getFullYear() }} PetShop. All Rights Reserved.
        </div>
      </div>
    </footer>
  </div>
</template>