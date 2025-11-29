// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@vee-validate/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
    'shadcn-nuxt',
  ],

  supabase: {
    redirect: false, // This disables the default redirect
  },


  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      supabaseFunctionUrl: process.env.SUPABASE_FUNCTION_URL,
    },
  },

  veeValidate: {
    autoImports: true,
  },

  pinia: {
    storesDirs: ['./app/stores/**'],
  },

  shadcn: {
    // Auto-import shadcn-vue components into this directory
    componentDir: './app/components/ui',
    // No prefix for components (e.g., <Button />)
    prefix: '',
  },

  app: {
    head: {
      title: 'Blackhorse - Pet E-Commerce',
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
    transpile: ['shadcn-vue', 'radix-vue'],
  },

  supabase: {
    redirect: false,
  },

  // Tailwind v4 PostCSS adapter for Nuxt
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
})
