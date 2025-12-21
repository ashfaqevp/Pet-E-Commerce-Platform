import { useSupabaseClient, useSupabaseUser } from '#imports'

export interface ProfileRow {
  id: string
  phone?: string | null
  role?: string | null
  created_at?: string
  updated_at?: string
}

export const useProfile = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const ensureUserId = async (): Promise<string> => {
    if (user.value?.id) return user.value.id
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    const id = data.session?.user?.id
    if (!id) throw new Error('LOGIN_REQUIRED')
    return id
  }

  const getProfile = async (): Promise<ProfileRow | null> => {
    const userId = await ensureUserId()
    const { data, error } = await supabase
      .from('profiles')
      .select('id,phone,role,created_at,updated_at')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as unknown as ProfileRow | null
  }

  const updatePhone = async (phone: string): Promise<void> => {
    const userId = await ensureUserId()
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, phone } as unknown as never)
    if (error) throw error
  }

  return { getProfile, updatePhone }
}
