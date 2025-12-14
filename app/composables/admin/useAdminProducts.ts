export interface AdminProduct {
  id: string
  name: string
  pet_type: string
  product_type: string
  retail_price: number | null
  wholesale_price: number | null
  stock_quantity: number
  created_at: string
}

export interface AdminProductInput {
  name: string
  pet_type: string
  product_type: string
  retail_price?: number | null
  wholesale_price?: number | null
  stock_quantity?: number
}

export const useAdminProducts = () => {
  const supabase = useSupabaseClient()
  const pending = ref(false)
  const error = ref<string | null>(null)

  const list = async (params: {
    search?: string
    petType?: string
    productType?: string
    status?: 'active' | 'inactive'
    sortBy?: keyof AdminProduct
    ascending?: boolean
    page?: number
    pageSize?: number
  }) => {
    pending.value = true
    error.value = null
    try {
      let q = supabase.from('products').select('*', { count: 'exact' })
      if (params.search) q = q.ilike('name', `%${params.search}%`)
      if (params.petType) q = q.eq('pet_type', params.petType)
      if (params.productType) q = q.eq('product_type', params.productType)
      if (params.status === 'active') q = q.gt('stock_quantity', 0)
      if (params.status === 'inactive') q = q.eq('stock_quantity', 0)
      if (params.sortBy) q = q.order(params.sortBy as string, { ascending: params.ascending ?? true })
      const page = params.page ?? 1
      const pageSize = params.pageSize ?? 10
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      q = q.range(from, to)
      const { data, error: e, count } = await q
      if (e) throw e
      const rows = (data as unknown as AdminProduct[]) || []
      return { rows, count: count ?? rows.length }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch products'
      error.value = msg
      throw e
    } finally {
      pending.value = false
    }
  }

  const create = async (input: AdminProductInput): Promise<AdminProduct> => {
    const { data, error: e } = await supabase
      .from('products')
      .insert([input as unknown as never])
      .select()
      .single()
    if (e) throw e
    return data as unknown as AdminProduct
  }

  const update = async (id: string, input: Partial<AdminProductInput>): Promise<AdminProduct> => {
    const { data, error: e } = await supabase
      .from('products')
      .update(input as unknown as never)
      .eq('id', id)
      .select()
      .single()
    if (e) throw e
    return data as unknown as AdminProduct
  }

  const remove = async (id: string): Promise<void> => {
    const { error: e } = await supabase.from('products').delete().eq('id', id)
    if (e) throw e
  }

  return { pending: readonly(pending), error: readonly(error), list, create, update, remove }
}
