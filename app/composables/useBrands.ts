export interface Brand {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  is_active: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BrandSummary {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_featured: boolean
  sort_order: number
}

export function useBrands() {
  const supabase = useSupabaseClient()
  const { release, sweep } = useStorageCleanup()

  async function fetchActiveBrands(): Promise<BrandSummary[]> {
    const { data, error } = await supabase
      .from('brands')
      .select('id, name, slug, logo_url, is_featured, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as BrandSummary[]
  }

  async function fetchBrandBySlug(slug: string): Promise<Brand> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    if (error) throw error
    return data as unknown as Brand
  }

  async function fetchAllBrandsAdmin(): Promise<Brand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as Brand[]
  }

  async function createBrand(payload: {
    name: string
    slug: string
    logo_url?: string | null
    description?: string | null
    sort_order?: number
    is_active?: boolean
    is_featured?: boolean
  }): Promise<Brand> {
    const { data, error } = await supabase
      .from('brands')
      .insert(payload as unknown as never)
      .select()
      .single()
    if (error) throw error
    sweep()
    return data as unknown as Brand
  }

  async function updateBrand(id: string, payload: Record<string, unknown>): Promise<Brand> {
    // Read the old logo from the row, not from the form — the form may be stale.
    // Only when the caller is actually changing the logo; toggling is_active is not.
    const replacesLogo = Object.hasOwn(payload, 'logo_url')
    const previousLogo = replacesLogo ? await currentLogo(id) : null

    const { data, error } = await supabase
      .from('brands')
      .update(payload as unknown as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // Only after the write succeeded — a failed update must leave the file alone.
    const brand = data as unknown as Brand
    if (previousLogo && previousLogo !== brand.logo_url) await release([previousLogo])
    sweep()
    return brand
  }

  async function deleteBrand(id: string) {
    const previousLogo = await currentLogo(id)
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) throw error
    if (previousLogo) await release([previousLogo])
    sweep()
  }

  async function currentLogo(id: string): Promise<string | null> {
    const { data } = await supabase
      .from('brands')
      .select('logo_url')
      .eq('id', id)
      .maybeSingle<{ logo_url: string | null }>()
    return data?.logo_url ?? null
  }

  async function uploadLogo(file: File, brandSlug: string): Promise<string> {
    // SVG logos come back untouched — they are already tiny and rasterising one
    // would throw away the only reason to use it.
    const logo = await prepareUpload(file, UPLOAD_PRESETS.brandLogo, 'brand-logo')
    const ext = logo.name.split('.').pop()
    const path = `${brandSlug}-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('brand-logos')
      .upload(path, logo, {
        upsert: true,
        contentType: logo.type,
        cacheControl: UPLOAD_CACHE_CONTROL,
      })
    if (error) throw storageUploadError(error)
    const { data } = supabase.storage.from('brand-logos').getPublicUrl(path)
    return data.publicUrl
  }

  return {
    fetchActiveBrands,
    fetchBrandBySlug,
    fetchAllBrandsAdmin,
    createBrand,
    updateBrand,
    deleteBrand,
    uploadLogo,
  }
}
