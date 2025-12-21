export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  const role = (user.user_metadata as Record<string, unknown>)?.role as string | undefined
  const roles = (user.app_metadata as Record<string, unknown>)?.roles as string[] | undefined
  const isAdmin = role === 'admin' || (Array.isArray(roles) && roles.includes('admin'))
  if (!isAdmin) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
