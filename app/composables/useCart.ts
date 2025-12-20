import { useSupabaseClient, useSupabaseUser } from '#imports'

export interface CartItemRow {
  id: string
  user_id: string
  product_id: string
  variant_id: string
  quantity: number
  created_at?: string
}

export const useCart = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const requireAuth = () => {
    if (!user.value) {
      throw new Error('LOGIN_REQUIRED')
    }
  }

  const loadCart = async (): Promise<CartItemRow[]> => {
    requireAuth()

    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as CartItemRow[]
  }

  const addToCart = async ({
    productId,
    variantId,
    quantity = 1,
  }: {
    productId: string
    variantId?: string
    quantity?: number
  }): Promise<void> => {
    requireAuth()

    const uid = user.value!.id
    const vid = variantId ?? ''

    let q = supabase
      .from('cart_items')
      .select('id,quantity')
      .eq('user_id', uid)
      .eq('product_id', productId)
      .eq('variant_id', vid)
      .limit(1)

    const { data: existingData, error: selErr } = await q.maybeSingle()
    if (selErr && selErr.code !== 'PGRST116') throw selErr

    const existing = existingData as unknown as { id: string; quantity: number } | null
    if (existing?.id) {
      const nextQty = (existing.quantity ?? 1) + quantity
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: nextQty } as unknown as never)
        .eq('id', existing.id)
      if (error) throw error
      return
    }

    const { error } = await supabase
      .from('cart_items')
      .upsert(
        {
          user_id: uid,
          product_id: productId,
          variant_id: vid,
          quantity,
        } as unknown as never,
        { onConflict: 'user_id,product_id,variant_id' }
      )
    if (error) throw error
  }

  const updateQty = async (id: string, quantity: number): Promise<void> => {
    requireAuth()

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity } as unknown as never)
      .eq('id', id)

    if (error) throw error
  }

  const removeFromCart = async (id: string): Promise<void> => {
    requireAuth()

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  return {
    loadCart,
    addToCart,
    updateQty,
    removeFromCart,
  }
}
