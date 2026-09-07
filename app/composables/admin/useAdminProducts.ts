export interface AdminProduct {
  id: string
  name: string
  pet_type: string[]
  product_type: string
  brand?: string | null
  brand_id?: string | null
  age?: string | null
  unit?: string | null
  size?: string | null
  flavour?: string | null
  colour?: string | null
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
  brands?: { name: string } | null
}

export interface AdminProductInput {
  name: string
  pet_type: string[]
  product_type: string
  brand?: string | null
  brand_id?: string | null
  age?: string | null
  unit?: string | null
  size?: string | null
  flavour?: string | null
  colour?: string | null
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

/** Files that have been through compression and are ready for Storage. */
export interface PreparedProductImages {
  thumbnail: File | null
  gallery: File[]
}

export const useAdminProducts = () => {
  const supabase = useSupabaseClient()
  const { release, releasePrefix, sweep } = useStorageCleanup()
  const pending = ref(false)
  const error = ref<string | null>(null)

  /** Old image values straight from the row. The form is not a reliable source —
   *  it only knows what it was handed when the sheet opened. */
  const currentImages = async (id: string): Promise<string[]> => {
    const { data } = await supabase
      .from('products')
      .select('thumbnail_url, image_urls')
      .eq('id', id)
      .maybeSingle<{ thumbnail_url: string | null; image_urls: string[] | null }>()
    if (!data) return []
    return [data.thumbnail_url, ...(data.image_urls ?? [])].filter((u): u is string => !!u)
  }

  const list = async (params: {
    search?: string
    petType?: string
    productType?: string
    brand?: string
    brandId?: string
    status?: 'active' | 'inactive'
    sortBy?: keyof AdminProduct
    ascending?: boolean
    page?: number
    pageSize?: number
  }) => {
    pending.value = true
    error.value = null
    try {
      let q = supabase.from('products').select('*, brands(name)', { count: 'exact' })
      if (params.search) q = q.ilike('name', `%${params.search}%`)
      if (params.petType) q = q.contains('pet_type', [params.petType])
      if (params.productType) q = q.eq('product_type', params.productType)
      if (params.brand) q = q.eq('brand', params.brand)
      if (params.brandId) q = q.eq('brand_id', params.brandId)
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
    sweep()
    return data as unknown as AdminProduct
  }

  const update = async (id: string, input: Partial<AdminProductInput>): Promise<AdminProduct> => {
    // Only diff when the caller is actually rewriting the images.
    const touchesImages = Object.hasOwn(input, 'thumbnail_url') || Object.hasOwn(input, 'image_urls')
    const before = touchesImages ? await currentImages(id) : []

    const { data, error: e } = await supabase
      .from('products')
      .update(input as unknown as never)
      .eq('id', id)
      .select()
      .single()
    if (e) throw e

    // Only after the write succeeded — a failed update must leave the files alone.
    const product = data as unknown as AdminProduct
    if (before.length) {
      const after = new Set([product.thumbnail_url, ...(product.image_urls ?? [])].filter(Boolean))
      const dropped = before.filter(u => !after.has(u))
      if (dropped.length) await release(dropped)
    }
    sweep()
    return product
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
    const before = await currentImages(id)
    const { error: e } = await supabase.from('products').delete().eq('id', id)
    if (e) throw e
    // The folder, not just image_urls — gallery files are not always all listed
    // there. The server still skips anything an order_item snapshotted.
    await releasePrefix(`products/${id}`)
    if (before.length) await release(before)
    sweep()
  }

  /**
   * Resize and re-encode the picked files. Kept separate from the upload so a
   * caller can run it *before* the product row is written: a file that turns
   * out not to be a readable image then fails the save with nothing written at
   * all — no row, no objects — instead of leaving a product behind with no
   * images. Compression is here rather than in the form so no form can skip it.
   */
  const prepareProductImages = async (
    files: { thumbnail?: File | null; gallery?: File[] | null }
  ): Promise<PreparedProductImages> => ({
    thumbnail: files.thumbnail
      ? await prepareUpload(files.thumbnail, UPLOAD_PRESETS.product, 'product-thumbnail')
      : null,
    // One at a time — decoding a dozen full-resolution photos at once is what
    // exhausts the tab's memory.
    gallery: files.gallery?.length
      ? await prepareUploads(files.gallery, UPLOAD_PRESETS.product, 'product-gallery')
      : [],
  })

  /**
   * Upload files already through `prepareProductImages`. Names are carried over
   * untouched, so the products/<id>/ path the storage classifier reads holds.
   */
  const uploadProductImages = async (
    productId: string,
    prepared: PreparedProductImages
  ): Promise<{ thumbnail_url?: string; image_urls?: string[] }> => {
    const storage = supabase.storage.from('product-images')

    const urls: { thumbnail_url?: string; image_urls?: string[] } = {}
    const { thumbnail, gallery } = prepared

    if (thumbnail) {
      const ext = thumbnail.name.includes('.') ? thumbnail.name.substring(thumbnail.name.lastIndexOf('.')) : ''
      const path = `products/${productId}/thumbnail-${Date.now()}${ext}`
      const { error: upErr } = await storage.upload(path, thumbnail, {
        upsert: true,
        contentType: thumbnail.type,
        cacheControl: UPLOAD_CACHE_CONTROL,
      })
      if (upErr) throw storageUploadError(upErr)
      const { data } = storage.getPublicUrl(path)
      urls.thumbnail_url = data.publicUrl
    }

    if (gallery.length) {
      const galleryUrls: string[] = []
      await Promise.all(
        gallery.map(async (file, idx) => {
          const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : ''
          const key = Math.random().toString(36).slice(2)
          const path = `products/${productId}/gallery-${key}-${idx}${ext}`
          const { error: gErr } = await storage.upload(path, file, {
            upsert: true,
            contentType: file.type,
            cacheControl: UPLOAD_CACHE_CONTROL,
          })
          if (gErr) throw storageUploadError(gErr)
          const { data } = storage.getPublicUrl(path)
          galleryUrls.push(data.publicUrl)
        })
      )
      urls.image_urls = galleryUrls
    }

    return urls
  }

  return { pending: readonly(pending), error: readonly(error), list, create, update, remove, prepareProductImages, uploadProductImages, countFeatured }
}
