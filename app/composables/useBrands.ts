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
    return data as unknown as Brand
  }

  async function updateBrand(id: string, payload: Record<string, unknown>): Promise<Brand> {
    const { data, error } = await supabase
      .from('brands')
      .update(payload as unknown as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as unknown as Brand
  }

  async function deleteBrand(id: string) {
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) throw error
  }

  async function uploadLogo(file: File, brandSlug: string): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `${brandSlug}-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('brand-logos')
      .upload(path, file, { upsert: true })
    if (error) throw error
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
