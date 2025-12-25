export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '') || 'http://localhost:3000'
  const content = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ].join('\n')
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return content
})
