/**
 * Server-rendered HTML is personalised: it carries the signed-in user's role,
 * and therefore their prices. Wholesale and retail see different numbers for the
 * same product, so a shared cache holding one visitor's HTML and replaying it to
 * another is a pricing leak, not a stale page.
 *
 * Nitro's default for a rendered route is `public, max-age=0, must-revalidate`.
 * `must-revalidate` means a correct cache will not serve it stale, but `public`
 * still permits storing it. This closes that off explicitly.
 *
 * It hooks the render response rather than using a `routeRules` header, because
 * a rule broad enough to cover every page (`/**`) would also match `/_nuxt/**`
 * and strip the immutable caching off every hashed asset. This hook only ever
 * sees documents the Vue renderer produced.
 */
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:response', (response) => {
    response.headers = {
      ...response.headers,
      'cache-control': 'private, no-store, max-age=0, must-revalidate',
    }
  })
})
