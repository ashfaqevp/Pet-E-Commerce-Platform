export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()
  const authStore = useAuthStore()

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) return

    const { data } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', session.user.id)
      .single()

    const profile = data as unknown as { phone?: string | null } | null
    if (!profile?.phone) {
      authStore.showPhoneDialog = true
    }
  })
})
