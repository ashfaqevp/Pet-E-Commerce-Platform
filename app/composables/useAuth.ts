import { useSupabaseClient, useSupabaseUser } from '#imports'

export const AUTH_RETURN_KEY = 'bh-auth-return'

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  /**
   * `returnTo` survives the round trip to Google in localStorage rather than in
   * `redirectTo`: Supabase only honours redirect URLs on its allowlist and
   * silently falls back to the site URL otherwise. `auth.client.ts` reads it
   * back on SIGNED_IN.
   */
  const loginWithGoogle = async (returnTo?: string | null) => {
    const supabase = useSupabaseClient()
    try {
      if (returnTo) localStorage.setItem(AUTH_RETURN_KEY, JSON.stringify({ path: returnTo, at: Date.now() }))
      else localStorage.removeItem(AUTH_RETURN_KEY)
    } catch {
      // Without storage the user simply lands on the home page, as before.
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`
      }
    })
}

  const loginWithEmailPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.user ?? null
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return {
    user,
    loginWithGoogle,
    loginWithEmailPassword,
    logout,
  }
}
