import { refreshNuxtData } from '#imports'

export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()

  // Restore session (this is OK to await)
  await supabase.auth.getSession()

  supabase.auth.onAuthStateChange((event) => {
    if (
      ['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED', 'TOKEN_REFRESHED', 'SIGNED_OUT']
        .includes(event)
    ) {
      // ✅ NON-BLOCKING
      queueMicrotask(() => {
        refreshNuxtData()
      })
    }
  })
})
