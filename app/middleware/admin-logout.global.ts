export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return
  const { role } = await $fetch<{ role: string | null }>(`/api/auth/get-role`)
  const isAdmin = role === 'admin'
  if (!isAdmin) return
  if (to.path.startsWith('/admin')) return
  if (process.client) {
    try { await supabase.auth.signOut() } catch {}
  }
})
