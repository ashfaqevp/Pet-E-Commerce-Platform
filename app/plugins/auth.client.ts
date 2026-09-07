import { refreshNuxtData } from '#imports'

export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()
  const { syncGuestToServer, refreshCart } = useCart()
  // Role drives the price every product card shows, so it is resolved here, once
  // per auth change, rather than by each card. See useUserRole.
  const loadUserRole = useLoadUserRole()
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
        void loadUserRole()
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
