Overview

- Nuxt 3 + Vue 3 app for a pet shop storefront with cart and checkout.
- Uses Pinia for state ( cart , products , auth ), Tailwind UI wrappers, and client‑side persistence for the cart.
- Home, product detail, cart, checkout, and wishlist pages are implemented; layout and navigation are responsive and mobile‑friendly.
Key Pages

- app/pages/index.vue : Home with banners, categories, and a static product grid.
  - Static catalog array renders ProductCard components app/pages/index.vue:21-30 .
  - Clicking the product “add” action navigates to the product detail instead of adding directly to cart app/pages/index.vue:33-34 , wired via @add="addToCart" app/pages/index.vue:103-108 .
  - Carousel with autoplay app/pages/index.vue:55-61 .
- app/pages/product/[id].vue : Product detail with variant selection and carousel.
  - Static sample product with variants (Flavor, Size, Age) app/pages/product/[id].vue:64-93 .
  - Image carousel with dots and API sync app/pages/product/[id].vue:233-257 .
  - Price, compare-at price, rating, and brand display app/pages/product/[id].vue:276-283, 261-268 .
  - Quantity controls and “Add to Cart” that persists selection to cart and navigates to cart app/pages/product/[id].vue:366-392, 190-200 .
- app/pages/cart.vue : Cart with quantity update, remove, and order summary.
  - Quantity inc/dec actions and item removal app/pages/cart.vue:19-22, 58-60 .
  - Subtotal, shipping, total computed and displayed app/pages/cart.vue:55-57, 35-37 .
  - Checkout link app/pages/cart.vue:38 .
- app/pages/checkout.vue : Validated checkout form and Razorpay client checkout.
  - Form schema using vee-validate + zod app/pages/checkout.vue:62-68 .
  - Computes totals from cart app/pages/checkout.vue:58-60 .
  - Creates an order via POST /api/payments/create-order then opens Razorpay with runtime config key app/pages/checkout.vue:75-99, 82 .
  - Toasts for success/error and navigation to home on success app/pages/checkout.vue:91-93, 100-102 .
- app/pages/wishlist.vue : Placeholder page app/pages/wishlist.vue:1-6 .
Layout & Navigation

- app/layouts/default.vue :
  - Sticky header with responsive search and action buttons; hides on downward scroll for desktop app/layouts/default.vue:19-38 .
  - Mobile bottom navigation for Home, Cart, Wishlist, Profile app/layouts/default.vue:35-42, 203 .
  - Special mobile header on product detail pages app/layouts/default.vue:31, 87 .
  - Search pushes to /search route (results page not present) app/layouts/default.vue:60-65 .
- app/components/common/Logo.vue : Brand logo linking to home app/components/common/Logo.vue:2-6 .
- Router debug plugin logs navigations in dev app/plugins/router-debug.client.ts:4-11 .
Components

- app/components/product/ProductCard.vue :
  - Shows image, name, rating, current price, and discount badge app/components/product/ProductCard.vue:4-10, 13, 16-19, 23-26 .
  - Emits add on plus button for parent handling app/components/product/ProductCard.vue:26-28 .
  - Computes original price from discount for strike‑through app/components/product/ProductCard.vue:51-56 .
- Tailwind shadcn‑style UI components under app/components/ui/* (Card, Button, Carousel, Breadcrumb, etc.), using cn utility for class merging app/lib/utils.ts:5-6 . Global toaster mounted in app/app.vue:6, 10 .
State & Data

- Cart store: Pinia store with localStorage persistence ( @vueuse/core ) and helpers.
  - Add/merge items by id /variant, update quantity, remove, and compute total app/stores/cart.ts:3-27 .
- Products store and composable:
  - useProductsStore fetches products from /api/products and stores in list app/stores/products.ts:16-29 .
  - useProducts composable provides products , loading , and fetchProducts helper app/composables/useProducts.ts:14-28 .
  - Home currently uses static products rather than the store/composable app/pages/index.vue:21-30 .
- Auth store: placeholder register/login/logout and isAuthenticated without backend integration app/stores/auth.ts:7-27 .
- Cart composable: thin wrapper over the cart store app/composables/useCart.ts:3-6 .
Checkout & Payments

- Client-side Razorpay checkout flow:
  - Creates an order via /api/payments/create-order and opens Razorpay app/pages/checkout.vue:75-99 .
  - Uses runtime config public.razorpayKeyId for the Razorpay key app/pages/checkout.vue:82 .
  - Success handler shows toast and navigates home app/pages/checkout.vue:90-93 .
- Server-side order creation endpoint and SDK script inclusion are not shown in the repo; comments reference a Supabase edge function.
Development Stage

- Completed
  - Core layout: responsive header, mobile bottom nav, brand, search wire‑up app/layouts/default.vue .
  - Home: banners, categories, product grid rendered via ProductCard app/pages/index.vue:52-83, 96-110 .
  - Product detail: gallery carousel, variant selection (Flavor/Size/Age), quantity, add to cart app/pages/product/[id].vue:233-257, 306-364, 366-392 .
  - Cart: list rendering from persisted localStorage, quantity updates, removal, order summary, checkout link app/pages/cart.vue:12-27, 33-39, 58-60 .
  - Checkout: validated form and client Razorpay checkout with toasts app/pages/checkout.vue:62-68, 72-103 .
  - UI foundation: Tailwind + shadcn‑style components, class merging util, global Toaster app/lib/utils.ts:5-6, app/app.vue:6, 10 .
  - Dev tooling: router navigation logs app/plugins/router-debug.client.ts:4-11 .
- Partially Completed / In Progress
  - Product data: Fetch helpers exist ( /api/products ), but pages rely on static data; server endpoint not included app/composables/useProducts.ts:18-22, app/stores/products.ts:21-25, app/pages/index.vue:21-30 .
  - Payments: Razorpay integration skeleton is present; backend order creation ( /api/payments/create-order ) and SDK script loading are not in this repo app/pages/checkout.vue:75-88 .
  - Auth: Store is stubbed with placeholder register/login; no UI wired to it app/stores/auth.ts:11-17, 19-27 .
  - Wishlist: Placeholder page with no functionality app/pages/wishlist.vue:1-6 .
  - Search: Header pushes to /search , but no search page is present app/layouts/default.vue:60-65 .
  - Currency consistency: Product pages show OMR (pet shop likely Oman), while checkout uses $ and USD app/pages/product/[id].vue:276-283, app/components/product/ProductCard.vue:23-25, app/pages/checkout.vue:77, 35-37 .
  - UX detail: Home “add” routes to product detail instead of adding to cart directly app/pages/index.vue:33-34 , which may be intentional pending final UX.
This summarizes the implemented functionality and what’s completed versus still pending across the referenced files and the app directory.