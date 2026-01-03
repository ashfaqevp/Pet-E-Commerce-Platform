<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/composables/useCart";
const user = useSupabaseUser()
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import Logo from "@/components/common/Logo.vue";

const route = useRoute();
const router = useRouter();
const searchQuery = ref("");
const isSearchFocused = ref(false);
const pageTitle = useState<string>('pageTitle', () => '')

// SSR-safe mobile breakpoint tracking
const isMobile = ref(false);
let updateMobile: (() => void) | undefined;
const headerHidden = ref(false);
let lastScrollY = 0;
let onScroll: (() => void) | undefined;
onMounted(() => {
  updateMobile = () => {
    isMobile.value = window.innerWidth <= 768;
  };
  updateMobile();
  window.addEventListener("resize", updateMobile);

  // Desktop-only: hide header on scroll down, show on scroll up
  onScroll = () => {
    const y = window.scrollY;
    const scrollingDown = y > lastScrollY;
    const nearTop = y < 16;
    headerHidden.value = !isMobile.value && scrollingDown && y > 64;
    if (!scrollingDown || nearTop) headerHidden.value = false;
    lastScrollY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  // Refresh cart badge count on mount
  refreshCart()
});
onBeforeUnmount(() => {
  if (updateMobile) window.removeEventListener("resize", updateMobile);
  if (onScroll) window.removeEventListener("scroll", onScroll);
});

const navItems = [
  { path: "/", label: "Home", icon: "lucide:home" },
  { path: "/cart", label: "Cart", icon: "lucide:shopping-cart" },
  // { path: "/wishlist", label: "Wishlist", icon: "lucide:heart" },
  { path: "/profile", label: "Profile", icon: "lucide:user-round" },
];

const isActive = (path: string) => {
  if (path === "/") return route.path === "/";
  return route.path.startsWith(path);
};

const isProductDetail = computed(() => route.path.startsWith('/product/'));
const isHome = computed(() => route.path === '/')

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/products', query: { q: searchQuery.value.trim() } })
    isSearchFocused.value = false
  }
}

function goBack() {
  if (process.client && window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

// Cart badge state
const { cartCount, refreshCart } = useCart()
watch(user, () => {
  refreshCart()
})
// (removed non-SSR-safe window access at setup time)
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header
      class="sticky top-0 z-40 w-full border-b bg-background transition-transform duration-300"
      :class="!isMobile && headerHidden ? '-translate-y-full' : 'translate-y-0'"
    >
      <div
        class="container mx-auto px-2 md:px-4 flex h-16 items-center justify-between gap-6"
      >
        <!-- Mobile: Logo + optional search input (shown on the right) -->
        <div v-if="isMobile && (isHome || (!isProductDetail && !pageTitle))" class="md:hidden flex-1 flex items-center gap-2 w-full">
          <!-- <Logo /> -->
           <img src="/images/logo-name.png" alt="Logo" class="h-11 w-auto" />
        </div>

        <!-- Mobile: page header with back and title -->
        <div v-if="isMobile && pageTitle && !isHome" class="md:hidden flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="icon" class="rounded-full border bg-background shadow-sm" @click="goBack">
              <Icon name="lucide:arrow-left" class="h-5 w-5 text-foreground" />
            </Button>
            <h2 class="text-lg font-semibold text-foreground truncate">{{ pageTitle }}</h2>
          </div>
        </div>

        <!-- Mobile searchbar: rounded pill with inline icon and Cancel button -->
        <div v-show="isSearchFocused && !isProductDetail" class="md:hidden flex items-center gap-2 w-full">
          <div class="relative flex-1">
            <Input
              v-model="searchQuery"
              class="w-full rounded-full bg-muted border-none pl-4 pr-10"
              placeholder="Search"
              @keyup.enter="handleSearch"
            />
            <Icon
              name="lucide:search"
              class="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/80"
            />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            class="text-foreground px-1"
            @click="isSearchFocused = false"
            ><Icon name="lucide:x" class="h-5 w-5"
          /></Button>
        </div>

        <!-- Desktop: Logo -->
        <div v-if="!isMobile" class="hidden md:flex md:items-center w-fit">
          <img src="/images/logo-name.png" alt="Logo" class="h-12 w-auto" />
        </div>

        <!-- Desktop: Search -->
        <div v-if="!isMobile" class="hidden md:flex flex-1 items-center justify-center mx-auto w-full">
          <div class="w-full max-w-xl relative">
            <Input
              v-model="searchQuery"
              class="w-full rounded-full border-none pl-4 pr-10 border bg-background/80 shadow-sm"
              placeholder="Search for food, toys, etc."
              @keyup.enter="handleSearch"
            />
            <Icon name="lucide:search" class="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/80" />
          </div>
        </div>

        <Button
          v-if="(!isProductDetail && !isSearchFocused && !pageTitle) || isHome"
          variant="ghost"
          size="icon"
          class="md:hidden rounded-full border bg-background/80 shadow-sm hover:bg-secondary/10 text-foreground"
          @click="isSearchFocused = true"
        >
          <Icon name="lucide:search" class="h-5 w-5" />
        </Button>

        <!-- Actions -->
        <div v-if="!isMobile" class="flex items-center gap-2">
          <!-- Mobile: only search trigger -->

          <!-- Desktop: actions -->
          <div class="hidden md:flex items-center gap-2">
            <!-- Wishlist button commented out -->
            <!--
            <Button
              variant="ghost"
              size="icon"
              class="rounded-full border bg-background shadow-sm hover:bg-secondary/10 text-foreground"
            >
              <Icon name="lucide:heart" class="h-5 w-5" />
            </Button>
            -->
            <NuxtLink to="/cart">
              <div class="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  class="rounded-full border bg-background shadow-sm hover:bg-secondary/10 text-foreground"
                >
                  <Icon name="lucide:shopping-cart" class="h-5 w-5" />
                </Button>
                <Badge
                  v-if="cartCount > 0"
                  variant="secondary"
                  class="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 text-[10px]"
                >{{ cartCount }}</Badge>
              </div>
            </NuxtLink>
            <NuxtLink to="/profile">
              <Button
                variant="ghost"
                size="icon"
                class="rounded-full border bg-background shadow-sm hover:bg-secondary/10 text-foreground"
              >
                <Icon name="lucide:user-round" class="h-5 w-5" />
              </Button>
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Page Content -->
    <main class="pb:10 md:pb-20 bg-gray-50">
      <slot />
    </main>

    <NuxtLink
      to="https://wa.me/96879188368"
      external
      target="_blank"
      aria-label="Chat on WhatsApp"
      class="fixed z-50 right-4 bottom-20 md:right-6 md:bottom-6"
    >
      <Button
        size="icon"
        class="h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white shadow-xl shadow-black/25"
      >
        <Icon name="logos:whatsapp-icon" class="size-8" />
      </Button>
    </NuxtLink>

    <!-- Mobile Bottom Navigation -->
    <nav
      class="md:hidden fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <div class="grid grid-cols-3 gap-1 py-2">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center gap-1 text-xs"
          :class="isActive(item.path) ? 'text-secondary' : 'text-muted-foreground'"
        >
          <div class="relative">
            <Icon :name="item.icon" class="h-6 w-6" />
            <Badge
              v-if="item.path === '/cart' && cartCount > 0"
              variant="secondary"
              class="absolute -top-1 -right-2 h-4 min-w-[1rem] px-1 text-[10px]"
            >{{ cartCount }}</Badge>
          </div>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <!-- Footer -->
    <footer class="py-10 border-t">
      <div class="container mx-auto px-4">
        <div
          class="flex flex-col md:flex-row justify-between items-start md:items-center gap-8"
        >
          <div class="max-w-sm">
            <img src="/images/logo-name.png" alt="Logo" class="h-14 w-auto" />
            <p class=" text-sm text-muted-foreground">
              Your one-stop shop for all pet needs. High-quality food, toys, and
              accessories.
            </p>
          </div>

          <!-- Mobile: collapsible sections -->
          <div class="w-full md:hidden">
            <Accordion type="single" collapsible class="w-full">
              <AccordionItem value="shop">
                <AccordionTrigger class="text-base font-medium text-foreground"
                  >Shop</AccordionTrigger
                >
                <AccordionContent>
                  <ul class="mt-2 space-y-2 text-sm">
                    <li>
                      <NuxtLink
                        :to="{ path: '/products', query: { pet: 'dog' } }"
                        class="text-muted-foreground hover:text-secondary"
                        >Dogs</NuxtLink
                      >
                    </li>
                    <li>
                      <NuxtLink
                        :to="{ path: '/products', query: { pet: 'cat' } }"
                        class="text-muted-foreground hover:text-secondary"
                        >Cats</NuxtLink
                      >
                    </li>
                    <li>
                      <NuxtLink
                        :to="{ path: '/products', query: { pet: 'bird' } }"
                        class="text-muted-foreground hover:text-secondary"
                        >Birds</NuxtLink
                      >
                    </li>
                    <li>
                      <NuxtLink
                        :to="{ path: '/products', query: { pet: 'fish' } }"
                        class="text-muted-foreground hover:text-secondary"
                        >Fish</NuxtLink
                      >
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="about">
                <AccordionTrigger class="text-base font-medium text-foreground"
                  >About</AccordionTrigger
                >
                <AccordionContent>
                  <ul class="mt-2 space-y-2 text-sm">
                    <li>
                      <NuxtLink
                        to="/about"
                        class="text-muted-foreground hover:text-secondary"
                        >About Us</NuxtLink
                      >
                    </li>
                    <li>
                      <NuxtLink
                        to="https://www.instagram.com/black_horse_authentic/?"
                        external
                        target="_blank"
                        class="text-muted-foreground hover:text-secondary"
                        >Instagram</NuxtLink
                      >
                    </li>
                    <li>
                      <NuxtLink
                        to="https://www.facebook.com/p/Black-Horse-Authentic-100071719360687/"
                        external
                        target="_blank"
                        class="text-muted-foreground hover:text-secondary"
                        >Facebook</NuxtLink
                      >
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="support">
                <AccordionTrigger class="text-base font-medium text-foreground"
                  >Support</AccordionTrigger
                >
                <AccordionContent>
                  <ul class="mt-2 space-y-2 text-sm">
                    <li>
                      <NuxtLink
                        to="/support"
                        class="text-muted-foreground hover:text-secondary"
                        >Support Center</NuxtLink
                      >
                    </li>
                    <li>
                      <NuxtLink
                        to="/contact"
                        class="text-muted-foreground hover:text-secondary"
                        >Contact</NuxtLink
                      >
                    </li>
                    <li>
                      <NuxtLink
                        to="/faq"
                        class="text-muted-foreground hover:text-secondary"
                        >FAQ</NuxtLink
                      >
                    </li>
                    <li>
                      <NuxtLink
                        to="/shipping"
                        class="text-muted-foreground hover:text-secondary"
                        >Shipping</NuxtLink
                      >
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="legal">
                <AccordionTrigger class="text-base font-medium text-foreground"
                  >Legal</AccordionTrigger
                >
                <AccordionContent>
                  <ul class="mt-2 space-y-2 text-sm">
                    <li>
                      <NuxtLink
                        to="/legal"
                        class="text-muted-foreground hover:text-secondary"
                        >Legal Overview</NuxtLink
                      >
                    </li>
                    <li>
                      <NuxtLink
                        to="/terms"
                        class="text-muted-foreground hover:text-secondary"
                        >Terms of Service</NuxtLink
                      >
                    </li>
                    <li>
                      <NuxtLink
                        to="/privacy"
                        class="text-muted-foreground hover:text-secondary"
                        >Privacy Policy</NuxtLink
                      >
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <!-- Desktop: 4 columns -->
          <div class="hidden md:grid grid-cols-4 gap-8">
            <div>
              <h3 class="font-medium text-foreground">Shop</h3>
              <ul class="mt-4 space-y-2 text-sm">
                <li>
                  <NuxtLink
                    :to="{ path: '/products', query: { pet: 'dog' } }"
                    class="text-muted-foreground hover:text-secondary"
                    >Dogs</NuxtLink
                  >
                </li>
                <li>
                  <NuxtLink
                    :to="{ path: '/products', query: { pet: 'cat' } }"
                    class="text-muted-foreground hover:text-secondary"
                    >Cats</NuxtLink
                  >
                </li>
                <li>
                  <NuxtLink
                    :to="{ path: '/products', query: { pet: 'bird' } }"
                    class="text-muted-foreground hover:text-secondary"
                    >Birds</NuxtLink
                  >
                </li>
                <li>
                  <NuxtLink
                    :to="{ path: '/products', query: { pet: 'fish' } }"
                    class="text-muted-foreground hover:text-secondary"
                    >Fish</NuxtLink
                  >
                </li>
              </ul>
            </div>
            <div>
              <h3 class="font-medium text-foreground">About</h3>
              <ul class="mt-4 space-y-2 text-sm">
                <li>
                  <NuxtLink to="/about" class="text-muted-foreground hover:text-secondary"
                    >About Us</NuxtLink
                  >
                </li>
                <li>
                  <NuxtLink
                    to="https://www.instagram.com/black_horse_authentic/?"
                    external
                    target="_blank"
                    class="text-muted-foreground hover:text-secondary"
                    >Instagram</NuxtLink
                  >
                </li>
                <li>
                  <NuxtLink to="https://www.facebook.com/p/Black-Horse-Authentic-100071719360687/" external target="_blank" class="text-muted-foreground hover:text-secondary"
                    >Facebook</NuxtLink
                  >
                </li>
              </ul>
            </div>
            <div>
              <h3 class="font-medium text-foreground">Support</h3>
              <ul class="mt-4 space-y-2 text-sm">
                <!-- <li>
                  <NuxtLink
                    to="/support"
                    class="text-muted-foreground hover:text-secondary"
                    >Support Center</NuxtLink
                  >
                </li> -->
                <li>
                  <NuxtLink
                    to="/contact"
                    class="text-muted-foreground hover:text-secondary"
                    >Contact</NuxtLink
                  >
                </li>
                <li>
                  <NuxtLink to="/faq" class="text-muted-foreground hover:text-secondary"
                    >FAQ</NuxtLink
                  >
                </li>
                <li>
                  <NuxtLink
                    to="/shipping"
                    class="text-muted-foreground hover:text-secondary"
                    >Shipping</NuxtLink
                  >
                </li>
              </ul>
            </div>
            <div>
              <h3 class="font-medium text-foreground">Legal</h3>
              <ul class="mt-4 space-y-2 text-sm">
                <!-- <li>
                  <NuxtLink to="/legal" class="text-muted-foreground hover:text-secondary"
                    >Legal Overview</NuxtLink
                  >
                </li> -->
                <li>
                  <NuxtLink to="/terms" class="text-muted-foreground hover:text-secondary"
                    >Terms of Service</NuxtLink
                  >
                </li>
                <li>
                  <NuxtLink
                    to="/privacy"
                    class="text-muted-foreground hover:text-secondary"
                    >Privacy Policy</NuxtLink
                  >
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="my-8 md:mb-0 pt-8 border-t text-center text-sm text-muted-foreground">
          © {{ new Date().getFullYear() }} BlackHorse. All Rights Reserved.
        </div>
      </div>
    </footer>
  </div>
</template>
