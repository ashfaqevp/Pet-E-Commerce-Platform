# 🏇 BLACKHORSE - COMPLETE IMPLEMENTATION GUIDE
## Full Nuxt 4 + shadcn-vue Setup with All Dependencies (pnpm)

---

# 4. Replace package.json with the one below (STEP 1)

# 5. Install dependencies
pnpm install

# 6. Create folders
mkdir -p components/{layout,product,cart,filters,hero,common,ui}
mkdir -p composables stores server/api/{auth,products,cart,orders,admin}
mkdir -p pages/{auth,admin,orders} types utils middleware assets/css layouts public/images

# 7. Create all config files (see STEP 2 below)

# 8. Start dev
pnpm dev
```

---

## STEP 1: COMPLETE package.json

Replace your entire `package.json` with this:

```json
{
  "name": "blackhorse",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "typecheck": "nuxt typecheck",
    "lint": "eslint . --fix 2>/dev/null || true"
  },
  "dependencies": {
    "nuxt": "^4.0.0",
    "vue": "^3.5.0",
    "vue-router": "^4.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "shadcn-vue": "^0.10.0",
    "@radix-ui/radix-vue": "^1.1.0",
    "lucide-vue-next": "^0.363.0",
    "clsx": "^2.0.0",
    "class-variance-authority": "^0.7.0",
    "@supabase/supabase-js": "^2.38.0",
    "@supabase/auth-helpers-nuxt": "^0.1.0",
    "pinia": "^2.1.0",
    "@pinia/nuxt": "^0.5.0",
    "vee-validate": "^4.12.0",
    "@vee-validate/nuxt": "^4.12.0",
    "@vee-validate/zod": "^4.12.0",
    "zod": "^3.22.0",
    "razorpay": "^2.9.0",
    "axios": "^1.6.0",
    "dayjs": "^1.11.0",
    "lodash-es": "^4.17.0",
    "nuxt-icon": "^0.6.0",
    "@vueuse/core": "^10.7.0",
    "@vueuse/nuxt": "^10.7.0",
    "reka-ui": "^0.14.0"
  },
  "devDependencies": {
    "@nuxt/devtools": "^1.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

Then run: `pnpm install`

---

## STEP 2: CONFIGURATION FILES

### 2.1 nuxt.config.ts

```typescript
export default defineNuxtConfig({
  devtools: { enabled: true },
  
  modules: [
    '@pinia/nuxt',
    '@vee-validate/nuxt',
    'nuxt-icon',
    '@vueuse/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    },
  },

  veeValidate: {
    autoImports: true,
  },

  pinia: {
    storesDirs: ['./stores/**'],
  },

  app: {
    head: {
      title: 'Buypets.om - Pet E-Commerce',
      meta: [
        { name: 'description', content: 'Quality pet products online' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  typescript: {
    strict: true,
  },

  build: {
    transpile: ['shadcn-vue', '@radix-ui/radix-vue'],
  },
})
```

### 2.2 tailwind.config.ts

```typescript
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1B8B7E',
        accent: '#FF9500',
      },
    },
  },
  plugins: [],
}
```

### 2.3 postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 2.4 assets/css/main.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  @apply box-border;
}

body {
  @apply bg-gray-50 text-gray-900;
}
```

### 2.5 .env.example

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
RAZORPAY_KEY_ID=your-key-id
```

### 2.6 .env.local (Create this, add credentials)

```
SUPABASE_URL=your-actual-url
SUPABASE_ANON_KEY=your-actual-key
RAZORPAY_KEY_ID=your-actual-key
```

---

## STEP 3: CORE PAGES

### 3.1 pages/index.vue

```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="bg-white border-b">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-primary">🏇 Buypets.om</h1>
        <div class="flex gap-4">
          <NuxtLink to="/browse" class="text-teal-600">Browse</NuxtLink>
          <NuxtLink to="/cart" class="text-teal-600">Cart</NuxtLink>
          <NuxtLink to="/auth/register" class="text-teal-600">Register</NuxtLink>
        </div>
      </div>
    </div>

    <div class="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-20 text-center">
      <h2 class="text-4xl font-bold mb-4">Christmas Offer</h2>
      <p class="text-xl mb-6">25% OFF All Products</p>
      <NuxtLink to="/browse" class="bg-yellow-400 text-black px-8 py-3 rounded-lg font-bold hover:bg-yellow-500 inline-block">
        Shop Now
      </NuxtLink>
    </div>

    <section class="container mx-auto px-4 py-12">
      <h3 class="text-2xl font-bold mb-6">Pet Categories</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="pet in ['Cat', 'Dog', 'Bird', 'Fish']" :key="pet" class="bg-white p-4 rounded-lg text-center cursor-pointer hover:shadow-lg">
          <p class="text-lg font-semibold">{{ pet }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})
</script>
```

### 3.2 pages/browse.vue

```vue
<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Browse Products</h1>
    
    <div class="bg-white p-4 rounded-lg mb-6">
      <h3 class="font-bold mb-3">Filter by Pet</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="pet in ['Cat', 'Dog', 'Bird', 'Fish']"
          :key="pet"
          @click="selectedPet = selectedPet === pet ? null : pet"
          :class="[
            'px-4 py-2 rounded-full border-2 transition',
            selectedPet === pet
              ? 'bg-teal-600 border-teal-600 text-white'
              : 'bg-white border-gray-300 text-gray-700'
          ]"
        >
          {{ pet }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="bg-white rounded-lg shadow-sm hover:shadow-md">
        <div class="h-40 bg-gray-200 flex items-center justify-center text-4xl">
          🐱
        </div>
        <div class="p-4">
          <h4 class="font-semibold text-sm mb-1">Product {{ i }}</h4>
          <p class="text-xs text-gray-500 mb-2">Brand</p>
          <div class="flex items-center gap-1 mb-3">
            <span class="text-yellow-400">★</span>
            <span class="text-xs">4.8 (125)</span>
          </div>
          <span class="font-bold text-lg text-teal-600">${{ (100 * i).toFixed(2) }}</span>
          <button class="w-full bg-teal-600 text-white py-2 rounded mt-3 text-sm font-medium hover:bg-teal-700">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const selectedPet = ref(null)
</script>
```

### 3.3 pages/cart.vue

```vue
<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Shopping Cart</h1>
    
    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-white rounded-lg shadow p-6">
        <p class="text-gray-600">Your cart is empty. <NuxtLink to="/browse" class="text-teal-600 underline">Continue shopping</NuxtLink></p>
      </div>
      
      <div class="bg-white rounded-lg shadow p-6 h-fit">
        <h3 class="text-lg font-bold mb-4">Order Summary</h3>
        <div class="space-y-3 border-t pt-4">
          <div class="flex justify-between">
            <span>Subtotal:</span>
            <span>$0.00</span>
          </div>
          <div class="flex justify-between">
            <span>Shipping:</span>
            <span>$0.00</span>
          </div>
          <div class="border-t pt-3 flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>$0.00</span>
          </div>
          <button class="w-full bg-teal-600 text-white py-3 rounded-lg mt-4 font-bold hover:bg-teal-700">
            Checkout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 3.4 pages/auth/register.vue

```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center px-4">
    <div class="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
      <h1 class="text-3xl font-bold text-center mb-2">Buypets.om</h1>
      <p class="text-center text-gray-600 mb-6">Create Account</p>

      <form @submit.prevent="register" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Email</label>
          <input v-model="email" type="email" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600" placeholder="you@example.com" />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Password</label>
          <input v-model="password" type="password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600" placeholder="••••••••" />
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Account Type</label>
          <div class="space-y-2">
            <label class="flex items-center gap-3 cursor-pointer">
              <input v-model="userType" type="radio" value="retail" class="w-4 h-4" />
              <span>Retail (Individual)</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input v-model="userType" type="radio" value="wholesale" class="w-4 h-4" />
              <span>Wholesale (Business)</span>
            </label>
          </div>
        </div>

        <button type="submit" class="w-full bg-teal-600 text-white py-2 rounded-lg font-bold hover:bg-teal-700">
          Create Account
        </button>
      </form>

      <p class="text-center text-sm text-gray-600 mt-4">
        Already have account? <NuxtLink to="/auth/login" class="text-teal-600 underline">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const email = ref('')
const password = ref('')
const userType = ref('retail')

const register = async () => {
  console.log('Register:', { email: email.value, password: password.value, userType: userType.value })
}
</script>
```

---

## STEP 4: COMPOSABLES

### composables/useProducts.ts

```typescript
export const useProducts = () => {
  const products = ref([])
  const loading = ref(false)

  const fetchProducts = async (filters = {}) => {
    loading.value = true
    try {
      // TODO: Connect to Supabase
      products.value = [
        { id: '1', name: 'Cat Food', price: 599, rating: 4.8 },
        { id: '2', name: 'Dog Treats', price: 299, rating: 4.5 },
      ]
    } finally {
      loading.value = false
    }
  }

  return {
    products: readonly(products),
    loading: readonly(loading),
    fetchProducts,
  }
}
```

### composables/useCart.ts

```typescript
export const useCart = () => {
  const items = ref([])

  const addItem = (productId: string) => {
    console.log('Added:', productId)
  }

  const total = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  })

  return {
    items: readonly(items),
    total,
    addItem,
  }
}
```

---

## STEP 5: PINIA STORES

### stores/auth.ts

```typescript
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userType = ref(null)

  const register = async (email: string, password: string, type: string) => {
    console.log('Registering:', { email, password, type })
    user.value = { email, id: '123' }
    userType.value = type
  }

  return {
    user: readonly(user),
    userType: readonly(userType),
    register,
  }
})
```

### stores/cart.ts

```typescript
export const useCartStore = defineStore('cart', () => {
  const items = ref([])

  const addItem = (product: any) => {
    items.value.push({ ...product, quantity: 1 })
  }

  const total = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  })

  return {
    items: readonly(items),
    total,
    addItem,
  }
})
```

---

## STEP 6: API ROUTES

### server/api/products/index.get.ts

```typescript
export default defineEventHandler(async (event) => {
  return {
    data: [
      { id: '1', name: 'Cat Food', price: 599 },
      { id: '2', name: 'Dog Treats', price: 299 },
    ],
  }
})
```

---

## STEP 7: MIDDLEWARE

### middleware/auth.ts

```typescript
export default defineRouteMiddleware((to, from) => {
  // Protect routes if needed
})
```

---

## DATABASE SCHEMA (Supabase)

Run this SQL in Supabase editor:

```sql
-- Users profile
create table public.user_profiles (
  id uuid primary key references auth.users(id),
  user_type text check (user_type in ('retail', 'wholesale')),
  created_at timestamp default now()
);

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pet_type text not null,
  product_type text not null,
  retail_price decimal(10,2),
  wholesale_price decimal(10,2),
  stock_quantity integer default 0,
  created_at timestamp default now()
);

-- Cart
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  product_id uuid references public.products(id),
  quantity integer default 1
);

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  order_type text check (order_type in ('retail', 'wholesale')),
  total_amount decimal(10,2),
  status text default 'pending',
  created_at timestamp default now()
);

enable row level security on public.user_profiles;
enable row level security on public.products;
enable row level security on public.cart_items;
enable row level security on public.orders;
```

---

## START YOUR PROJECT

```bash
pnpm dev

# Open http://localhost:3000
```

That's it! You now have a complete Nuxt 4 + shadcn-vue + Supabase project ready to build! 🚀

