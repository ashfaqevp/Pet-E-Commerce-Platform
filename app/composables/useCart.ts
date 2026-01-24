import { useSupabaseClient, useSupabaseUser, useState } from '#imports'
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
  thumbnail_url?: string | null
  retail_price?: number | null
  wholesale_price?: number | null
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
  const cartCount = useState<number>('cart-count', () => 0)
  const syncing = useState<boolean>('cart-syncing', () => false)
  const cartLocks = new Set<string>()

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

  const refreshCart = async (): Promise<void> => {
    if (!user.value) {
      const items = guestItems.value || []
      cartCount.value = items.reduce((sum, i) => sum + (i.quantity ?? 1), 0)
      return
    }
    const { data, error } = await supabase
      .from('cart_items')
      .select('quantity')
    if (error) throw error
    const rows = (data ?? []) as unknown as { quantity: number }[]
    cartCount.value = rows.reduce((sum, r) => sum + (r.quantity ?? 1), 0)
  }

  const loadCartWithProducts = async (): Promise<CartItemWithProduct[]> => {
    if (!user.value) {
      const items = guestItems.value || []
      if (!items.length) return []
      const ids = items.map(i => i.product_id)
      const { data: products, error } = await supabase
        .from('products')
        .select('id,name,thumbnail_url,retail_price,wholesale_price,default_rating,base_product_id')
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
      .select('id,name,thumbnail_url,retail_price,wholesale_price,default_rating,base_product_id')
      .in('id', ids)
    if (error) throw error
    const map = new Map<string, ProductRow>()
    for (const p of (products ?? []) as unknown as ProductRow[]) map.set(p.id, p)
    return rows
      .filter(r => map.has(r.product_id))
      .map<CartItemWithProduct>(r => ({ id: r.id, product_id: r.product_id, quantity: r.quantity ?? 1, product: map.get(r.product_id)! }))
  }

const addToCart = async ({
  productId,
  quantity = 1,
}: {
  productId: string
  quantity?: number
}) => {
  if (!user.value) {
    const idx = guestItems.value.findIndex(i => i.product_id === productId)
    if (idx >= 0) {
      guestItems.value[idx]!.quantity += Math.max(1, quantity)
    } else {
      guestItems.value.push({ product_id: productId, quantity: Math.max(1, quantity) })
    }
    await refreshCart()
    return
  }

  const qty = Math.max(1, quantity)

  const { data: rows, error: selErr } = await supabase
    .from('cart_items')
    .select('id,quantity')
    .eq('product_id', productId)
    .limit(1)

  if (selErr) throw selErr

  const existing = ((rows ?? []) as unknown as { id: string; quantity: number }[])[0]

  if (existing) {
    const nextQty = Math.max(1, Number(existing.quantity || 0) + qty)
    const { error: updErr } = await supabase
      .from('cart_items')
      .update({ quantity: nextQty } as unknown as never)
      .eq('id', existing.id)
    if (updErr) throw updErr
  } else {
    const { error: insErr } = await supabase
      .from('cart_items')
      .insert({ product_id: productId, quantity: qty } as unknown as never)
    if (insErr) throw insErr
  }

  await refreshCart()
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

const syncGuestToServer = async () => {
  if (!user.value) return
  if (syncing.value) return

  const items = guestItems.value || []
  if (!items.length) return
  syncing.value = true

  const ids = Array.from(new Set(items.map(i => i.product_id)))
  const { data: existing, error: selErr } = await supabase
    .from('cart_items')
    .select('id,product_id,quantity')
    .in('product_id', ids)

  if (selErr) throw selErr

  const map = new Map<string, { id: string; quantity: number }>()
  for (const r of (existing ?? []) as unknown as { id: string; product_id: string; quantity: number }[]) {
    map.set(r.product_id, { id: r.id, quantity: r.quantity })
  }

  for (const i of items) {
    const cur = map.get(i.product_id)
    const addQty = Math.max(1, i.quantity ?? 1)
    if (cur) {
      const nextQty = Math.max(1, Number(cur.quantity || 0) + addQty)
      const { error: updErr } = await supabase
        .from('cart_items')
        .update({ quantity: nextQty } as unknown as never)
        .eq('id', cur.id)
      if (updErr) throw updErr
    } else {
      const { error: insErr } = await supabase
        .from('cart_items')
        .insert({ product_id: i.product_id, quantity: addQty } as unknown as never)
      if (insErr) throw insErr
    }
  }

  guestItems.value = []
  await refreshCart()
  syncing.value = false
}


  return {
    loadCart,
    loadCartWithProducts,
    addToCart,
    updateQty,
    removeFromCart,
    requireAuth,
    syncGuestToServer,
    refreshCart,
    cartCount,
  }
}
