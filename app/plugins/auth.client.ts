import { refreshNuxtData } from '#imports'

export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()
  const { syncGuestToServer, refreshCart } = useCart()
  let didSync = false

  // Restore session (this is OK to await)
  await supabase.auth.getSession()

  supabase.auth.onAuthStateChange((event) => {
    if (
      ['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED', 'TOKEN_REFRESHED', 'SIGNED_OUT']
        .includes(event)
    ) {
      // ✅ NON-BLOCKING
      queueMicrotask(async () => {
        if (event === 'SIGNED_OUT') didSync = false
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !didSync) {
          try {
            const { data } = await supabase.auth.getSession()
            if (!data.session) {
              refreshNuxtData()
              return
            }
            await syncGuestToServer()
            await refreshCart()
          } finally {
            didSync = true
          }
        }
        refreshNuxtData()
      })
    }
  })
})
