import { useSupabaseClient, useSupabaseUser } from '#imports'

export interface AddressRow {
  id: string
  user_id: string
  full_name: string
  phone: string
  address_line_1: string
  address_line_2?: string | null
  city: string
  state: string
  postal_code: string
  country: string
  is_default: boolean
  created_at?: string
}

export interface AddressInput {
  full_name: string
  phone: string
  address_line_1: string
  address_line_2?: string
  city: string
  state: string
  postal_code: string
  country: string
  is_default?: boolean
}

export const useAddresses = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const requireAuth = () => {
    if (!user.value) throw new Error('LOGIN_REQUIRED')
  }

  const listAddresses = async (): Promise<AddressRow[]> => {
    requireAuth()
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.value!.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as AddressRow[]
  }

  const createAddress = async (input: AddressInput): Promise<AddressRow> => {
    requireAuth()
    if (input.is_default) {
      const { error: e1 } = await supabase
        .from('addresses')
        .update({ is_default: false } as unknown as never)
        .eq('user_id', user.value!.id)
      if (e1) throw e1
    }
    const payload = { ...input, user_id: user.value!.id, is_default: !!input.is_default }
    const { data, error } = await supabase
      .from('addresses')
      .insert([payload as unknown as never])
      .select()
      .single()
    if (error) throw error
    return data as unknown as AddressRow
  }

  const updateAddress = async (id: string, input: AddressInput): Promise<AddressRow> => {
    requireAuth()
    if (input.is_default) {
      const { error: e1 } = await supabase
        .from('addresses')
        .update({ is_default: false } as unknown as never)
        .eq('user_id', user.value!.id)
      if (e1) throw e1
    }
    const { data, error } = await supabase
      .from('addresses')
      .update({ ...input, is_default: !!input.is_default } as unknown as never)
      .eq('id', id)
      .eq('user_id', user.value!.id)
      .select()
      .single()
    if (error) throw error
    return data as unknown as AddressRow
  }

  const deleteAddress = async (id: string): Promise<void> => {
    requireAuth()
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.value!.id)
    if (error) throw error
  }

  const setDefault = async (id: string): Promise<void> => {
    requireAuth()
    const { error: e1 } = await supabase
      .from('addresses')
      .update({ is_default: false } as unknown as never)
      .eq('user_id', user.value!.id)
    if (e1) throw e1
    const { error: e2 } = await supabase
      .from('addresses')
      .update({ is_default: true } as unknown as never)
      .eq('id', id)
      .eq('user_id', user.value!.id)
    if (e2) throw e2
  }

  return { listAddresses, createAddress, updateAddress, deleteAddress, setDefault }
}
