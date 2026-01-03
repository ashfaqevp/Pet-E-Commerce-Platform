export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string | null }>()
  const isAdmin = !error && profile?.role === 'admin'
  if (!isAdmin) return
  if (to.path.startsWith('/admin')) return
  if (process.client) {
    try { await supabase.auth.signOut() } catch {}
  }
})
