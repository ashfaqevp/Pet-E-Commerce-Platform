// https://nuxt.com/docs/api/configuration/nuxt-config

/** Origin only — a `preconnect` href must not carry a path. */
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.SUPABASE_URL ?? '').origin
  } catch {
    return ''
  }
})()

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
    'nuxt-gtag',
    '@vercel/analytics'
  ],

  gtag: {
    id: 'G-P3SHMPJ78M',
  },

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
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
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

  // components: [
  //   { path: './app/components', pathPrefix: false },
  // ],

  shadcn: {
    // Auto-import shadcn-vue components into this directory
    componentDir: './app/components/ui',
    // No prefix for components (e.g., <Button />)
    prefix: '',
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Buypets.om - Pet E-Commerce',
      meta: [
        { name: 'description', content: 'Quality pet products online' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'index,follow' },
        { name: 'theme-color', content: '#000000' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Buypets.om' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },

        // Every first paint needs Supabase twice over — the API call that fetches
        // the page's data, then the images that call points at. Opening the
        // connection alongside the entry bundle takes DNS + TLS off that chain.
        ...(supabaseOrigin
          ? [{ rel: 'preconnect', href: supabaseOrigin, crossorigin: '' }]
          : []),

        // Poppins is self-hosted (see app/assets/css/main.css). Body text is 400
        // and it is inside the CSS, so the browser only discovers it after the
        // stylesheet parses — preloading the one weight that always renders
        // starts it in parallel instead.
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: '/fonts/poppins-400-latin.woff2',
          crossorigin: 'anonymous',
        },

        // The header logo is the first image on every route, and with `ssr: false`
        // the `<img>` does not exist until Vue has mounted — so the request cannot
        // start from the markup. Preloading it from the static head runs it
        // alongside the entry bundle instead of after it.
        { rel: 'preload', as: 'image', href: '/images/logo-name.webp' },
      ],
    },
  },

  /**
   * Files under `public/` were going out with `max-age=14400, must-revalidate`,
   * so a returning visitor re-validated the logo and every static image twice a
   * day. Nitro's Vercel preset compiles these into `.vercel/output/config.json`,
   * ahead of the filesystem handler, so they reach the CDN-served files too.
   *
   * The font filenames encode weight and subset and are replaced by adding a
   * file, never by editing one — those can be immutable. `/images/**` keeps
   * stable names an admin may overwrite (the logo, the placeholder), so it gets
   * a month of freshness plus a year of stale-while-revalidate instead: a
   * replaced file is picked up on the next visit rather than being frozen.
   */
  routeRules: {
    '/fonts/**': {
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
    },
    '/images/**': {
      headers: { 'cache-control': 'public, max-age=2592000, stale-while-revalidate=31536000' },
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
