import { refreshNuxtData } from '#imports'
import { AUTH_RETURN_KEY } from '@/composables/useAuth'

// A Google sign-in started from checkout comes back to the site URL; this sends
// the user on to where they were. Older than this, the attempt was abandoned.
const RETURN_TTL_MS = 15 * 60 * 1000
const takeAuthReturn = (): string | null => {
  try {
    const raw = localStorage.getItem(AUTH_RETURN_KEY)
    if (!raw) return null
    localStorage.removeItem(AUTH_RETURN_KEY)
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number }
    if (!path || !path.startsWith('/') || path.startsWith('//')) return null
    if (!at || Date.now() - at > RETURN_TTL_MS) return null
    return path
  } catch {
    return null
  }
}

export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()
  const { syncGuestToServer, refreshCart } = useCart()
  // Role drives the price every product card shows, so it is resolved here, once
  // per auth change, rather than by each card. See useUserRole.
  const loadUserRole = useLoadUserRole()
  let didSync = false
  // Captured here: the auth callback runs outside the Nuxt context.
  const router = useRouter()

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
          const returnTo = takeAuthReturn()
          if (returnTo && returnTo !== router.currentRoute.value.fullPath) {
            await router.push(returnTo)
            return
          }
        }
        refreshNuxtData()
      })
    }
  })
})
