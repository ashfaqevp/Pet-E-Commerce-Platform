export default defineNuxtPlugin(() => {
  const route = useRoute()
  const config = useRuntimeConfig()
  const appConfig = useAppConfig()

  const applySeo = () => {
    const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '')
    const path = String(route.fullPath || '/').split('?')[0]
    const canonical = siteUrl ? `${siteUrl}${path}` : path

    useHead({
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'canonical', href: canonical, key: 'canonical' },
      ],
      meta: [
        { name: 'robots', content: 'index,follow', key: 'robots' },
        { name: 'theme-color', content: '#000000', key: 'theme-color' },
      ],
      script: [
        {
          type: 'application/ld+json',
          key: 'ld-website',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: appConfig.site?.name || 'Buypets.om',
            url: siteUrl || 'https://buypets.om',
          }),
        },
      ],
    })

    useSeoMeta({
      description: appConfig.site?.description || 'Quality pet products online',
      ogType: 'website',
      ogSiteName: appConfig.site?.name || 'Buypets.om',
      ogImage: appConfig.site?.defaultOgImage || '/favicon-96x96.png',
      twitterCard: 'summary_large_image',
    })
  }

  applySeo()
  watch(() => route.fullPath, applySeo)
})
