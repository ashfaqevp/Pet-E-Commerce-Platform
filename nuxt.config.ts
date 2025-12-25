// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,

    // app: {
    // head: {
    //   link: [
    //     { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    //     { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    //     { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
    //     { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
    //   ]
    // },

  modules: [
    '@pinia/nuxt',
    '@vee-validate/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
    'shadcn-nuxt',
  ],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
    redirect: false,
  },


  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      supabaseFunctionUrl: process.env.SUPABASE_FUNCTION_URL,
    },
    paytabsBaseUrl: process.env.PAYTABS_BASE_URL || 'https://secure-global.paytabs.com',
    paytabsServerKey: process.env.PAYTABS_SERVER_KEY,
    paytabsProfileId: process.env.PAYTABS_PROFILE_ID,
    paytabsCallbackUrl: process.env.PAYTABS_CALLBACK_URL,
    paytabsReturnUrl: process.env.PAYTABS_RETURN_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  veeValidate: {
    autoImports: true,
  },

  pinia: {
    storesDirs: ['./app/stores/**'],
  },

  imports: {
    dirs: ['./app/utils'],
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
      link: [
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },

        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  typescript: {
    strict: true,
  },

  build: {
    transpile: ['shadcn-vue', 'radix-vue'],
  },

  // Nitro bundling tweaks to avoid ESM subpath resolution issues during preview
  nitro: {
    externals: {
      inline: ['@supabase/supabase-js', '@supabase/ssr'],
    },
  },

  // Tailwind v4 PostCSS adapter for Nuxt
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
})
