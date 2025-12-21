import { refreshNuxtData } from '#imports'

export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()

  await supabase.auth.getSession()

  supabase.auth.onAuthStateChange(async (event) => {
    if (!['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED', 'TOKEN_REFRESHED', 'SIGNED_OUT'].includes(event)) return
    await refreshNuxtData()
  })
})
