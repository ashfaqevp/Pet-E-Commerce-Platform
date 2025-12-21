import { useSupabaseClient, useSupabaseUser } from '#imports'

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const loginWithGoogle = async () => {
    const supabase = useSupabaseClient()

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
