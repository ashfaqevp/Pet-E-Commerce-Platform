import { serverSupabaseClient } from '#supabase/server'

interface ProductSitemapRow { id: string; updated_at?: string | null; created_at?: string | null }

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '') || 'http://localhost:3000'
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('products')
    .select('id,updated_at,created_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[sitemap] supabase error', error)
  }

  const rows = (data || []) as ProductSitemapRow[]

  const urls: { loc: string; lastmod?: string }[] = []
  const staticPaths = ['/', '/products', '/cart', '/checkout', '/profile']
  for (const p of staticPaths) urls.push({ loc: `${siteUrl}${p}` })

  for (const r of rows) {
    const last = r.updated_at || r.created_at || null
    urls.push({ loc: `${siteUrl}/product/${r.id}`, lastmod: last ? new Date(last).toISOString() : undefined })
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls.map(u => {
      const lastmod = u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''
      return `<url><loc>${u.loc}</loc>${lastmod}</url>`
    }).join('') +
    `</urlset>`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return xml
})
