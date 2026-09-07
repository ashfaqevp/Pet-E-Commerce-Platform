export default defineNuxtRouteMiddleware(async (to) => {
  /**
   * Client-only, for two reasons.
   *
   * The action this middleware exists for — signing an admin out when they wander
   * onto the storefront — is already client-only, so a server pass could never do
   * anything but waste work.
   *
   * And it would not merely waste it: the `$fetch` below is a relative call, which
   * during SSR does not carry the incoming request's cookies. `/api/auth/get-role`
   * answers 401 to an anonymous caller, so this would throw on the server for
   * every signed-in visitor and render an error page instead of the storefront.
   */
  if (import.meta.server) return

  const supabase = useSupabaseClient()
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return
  const { role } = await $fetch<{ role: string | null }>(`/api/auth/get-role`)
  const isAdmin = role === 'admin'
  if (!isAdmin) return
  if (to.path.startsWith('/admin')) return
  try { await supabase.auth.signOut() } catch {}
})
