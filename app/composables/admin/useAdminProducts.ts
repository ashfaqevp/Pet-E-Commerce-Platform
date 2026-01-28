export interface AdminProduct {
  id: string
  name: string
  pet_type: string[]
  product_type: string
  brand?: string | null
  age?: string | null
  unit?: string | null
  size?: string | null
  flavour?: string | null
  retail_price: number | null
  wholesale_price?: number | null
  stock_quantity: number
  created_at: string
  is_active: boolean
  thumbnail_url?: string | null
  image_urls?: string[] | null
  description?: string | null
  default_rating?: number | null
  base_product_id?: string | null
  is_featured?: boolean
}

export interface AdminProductInput {
  name: string
  pet_type: string[]
  product_type: string
  brand?: string | null
  age?: string | null
  unit?: string | null
  size?: string | null
  flavour?: string | null
  retail_price?: number | null
  wholesale_price?: number | null
  stock_quantity?: number
  is_active?: boolean
  thumbnail_url?: string | null
  image_urls?: string[] | null
  description?: string | null
  default_rating?: number | null
  base_product_id?: string | null
  is_featured?: boolean
}

export const useAdminProducts = () => {
  const supabase = useSupabaseClient()
  const pending = ref(false)
  const error = ref<string | null>(null)

  const list = async (params: {
    search?: string
    petType?: string
    productType?: string
    brand?: string
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
      if (params.petType) q = q.contains('pet_type', [params.petType])
      if (params.productType) q = q.eq('product_type', params.productType)
      if (params.brand) q = q.eq('brand', params.brand)
      if (params.status === 'active') q = q.eq('is_active', true)
      if (params.status === 'inactive') q = q.eq('is_active', false)
      q = q.order('is_featured', { ascending: false, nullsFirst: false })
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

  const countFeatured = async (): Promise<number> => {
    const { count, error: e } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_featured', true)
    if (e) throw e
    return count ?? 0
  }

  const remove = async (id: string): Promise<void> => {
    const { error: e } = await supabase.from('products').delete().eq('id', id)
    if (e) throw e
  }

  const uploadProductImages = async (
    productId: string,
    files: { thumbnail?: File | null; gallery?: File[] | null }
  ): Promise<{ thumbnail_url?: string; image_urls?: string[] }> => {
    const storage = supabase.storage.from('product-images')

    const urls: { thumbnail_url?: string; image_urls?: string[] } = {}

    if (files.thumbnail) {
      const ext = files.thumbnail.name.includes('.') ? files.thumbnail.name.substring(files.thumbnail.name.lastIndexOf('.')) : ''
      const path = `products/${productId}/thumbnail-${Date.now()}${ext}`
      const { error: upErr } = await storage.upload(path, files.thumbnail, { upsert: true, contentType: files.thumbnail.type })
      if (upErr) throw upErr
      const { data } = storage.getPublicUrl(path)
      urls.thumbnail_url = data.publicUrl
    }

    if (files.gallery && files.gallery.length) {
      const galleryUrls: string[] = []
      await Promise.all(
        files.gallery.map(async (file, idx) => {
          const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : ''
          const key = Math.random().toString(36).slice(2)
          const path = `products/${productId}/gallery-${key}-${idx}${ext}`
          const { error: gErr } = await storage.upload(path, file, { upsert: true, contentType: file.type })
          if (gErr) throw gErr
          const { data } = storage.getPublicUrl(path)
          galleryUrls.push(data.publicUrl)
        })
      )
      urls.image_urls = galleryUrls
    }

    return urls
  }

  return { pending: readonly(pending), error: readonly(error), list, create, update, remove, uploadProductImages, countFeatured }
}
