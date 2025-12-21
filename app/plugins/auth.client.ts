export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()
  const authStore = useAuthStore()

  await supabase.auth.getSession()

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) return
    if (!['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) return
    const { data, error } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', session.user.id)
      .single()
    if (error) return
    const profile = data as unknown as { phone?: string | null } | null
    if (!profile?.phone) authStore.showPhoneDialog = true
  })
})
