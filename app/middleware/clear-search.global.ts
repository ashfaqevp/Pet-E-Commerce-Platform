export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith('/products')) return
  const hasQ = typeof to.query.q !== 'undefined'
  if (!hasQ) return
  const { q: _q, ...rest } = to.query as Record<string, string | string[]>
  return navigateTo({ path: to.path, query: rest, hash: to.hash }, { replace: true })
})
