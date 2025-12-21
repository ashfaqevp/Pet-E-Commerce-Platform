import { useSupabaseClient, useSupabaseUser } from '#imports'
import { useLocalStorage } from '@vueuse/core'

export interface CartItemRow {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at?: string
}

export interface ProductRow {
  id: string
  name: string
  brand?: string | null
  thumbnail_url?: string | null
  retail_price?: number | null
  default_rating?: number | null
  base_product_id?: string | null
}

export interface CartItemWithProduct {
  id: string
  product_id: string
  quantity: number
  product: ProductRow
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
      .select('id,product_id,quantity,created_at')
      .order('created_at', { ascending: true })
    if (error) throw error
    const rows = (data ?? []) as unknown as CartItemRow[]
    return rows
  }

  const guestItems = useLocalStorage<{ product_id: string; quantity: number }[]>('bh-cart', [])

  const loadCartWithProducts = async (): Promise<CartItemWithProduct[]> => {
    if (!user.value) {
      const items = guestItems.value || []
      if (!items.length) return []
      const ids = items.map(i => i.product_id)
      const { data: products, error } = await supabase
        .from('products')
        .select('id,name,brand,thumbnail_url,retail_price,default_rating,base_product_id')
        .in('id', ids)
      if (error) throw error
      const map = new Map<string, ProductRow>()
      for (const p of (products ?? []) as unknown as ProductRow[]) map.set(p.id, p)
      return items
        .filter(i => map.has(i.product_id))
        .map<CartItemWithProduct>(i => ({ id: i.product_id, product_id: i.product_id, quantity: i.quantity ?? 1, product: map.get(i.product_id)! }))
    }
    const rows = await loadCart()
    if (!rows.length) return []
    const ids = rows.map(r => r.product_id)
    const { data: products, error } = await supabase
      .from('products')
      .select('id,name,brand,thumbnail_url,retail_price,default_rating,base_product_id')
      .in('id', ids)
    if (error) throw error
    const map = new Map<string, ProductRow>()
    for (const p of (products ?? []) as unknown as ProductRow[]) map.set(p.id, p)
    return rows
      .filter(r => map.has(r.product_id))
      .map<CartItemWithProduct>(r => ({ id: r.id, product_id: r.product_id, quantity: r.quantity ?? 1, product: map.get(r.product_id)! }))
  }

  const addToCart = async ({ productId, quantity = 1 }: { productId: string; quantity?: number }): Promise<void> => {
    if (!user.value) {
      const idx = guestItems.value.findIndex(i => i.product_id === productId)
      if (idx >= 0) guestItems.value[idx]!.quantity = (guestItems.value[idx]!.quantity ?? 1) + quantity
      else guestItems.value.push({ product_id: productId, quantity })
      return
    }
    const { data: existingData, error: selErr } = await supabase
      .from('cart_items')
      .select('id,quantity')
      .eq('product_id', productId)
      .maybeSingle()
    if (selErr) throw selErr
    const existing = existingData as unknown as { id: string; quantity: number } | null
    if (existing?.id) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: (existing.quantity ?? 1) + quantity } as unknown as never)
        .eq('id', existing.id)
      if (error) throw error
      return
    }
    const { error } = await supabase
      .from('cart_items')
      .insert({ product_id: productId, quantity } as unknown as never)
    if (error) throw error
  }

  const updateQty = async (id: string, quantity: number): Promise<void> => {
    if (!user.value) {
      const idx = guestItems.value.findIndex(i => i.product_id === id)
      if (idx >= 0) guestItems.value[idx]!.quantity = quantity
      return
    }
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity } as unknown as never)
      .eq('id', id)
    if (error) throw error
  }

  const removeFromCart = async (id: string): Promise<void> => {
    if (!user.value) {
      const idx = guestItems.value.findIndex(i => i.product_id === id)
      if (idx >= 0) guestItems.value.splice(idx, 1)
      return
    }
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  const syncGuestToServer = async (): Promise<void> => {
    if (!user.value) return
    const items = guestItems.value || []
    if (!items.length) return
    for (const i of items) {
      const { data: existingData, error: selErr } = await supabase
        .from('cart_items')
        .select('id,quantity')
        .eq('product_id', i.product_id)
        .maybeSingle()
      if (selErr) throw selErr
      const existing = existingData as unknown as { id: string; quantity: number } | null
      if (existing?.id) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: (existing.quantity ?? 1) + (i.quantity ?? 1) } as unknown as never)
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({ product_id: i.product_id, quantity: i.quantity ?? 1 } as unknown as never)
        if (error) throw error
      }
    }
    guestItems.value = []
  }

  return {
    loadCart,
    loadCartWithProducts,
    addToCart,
    updateQty,
    removeFromCart,
    requireAuth,
    syncGuestToServer,
  }
}
