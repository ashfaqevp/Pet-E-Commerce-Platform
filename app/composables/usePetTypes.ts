export interface PetType {
  id: string
  name: string
  slug: string
  image_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PetTypeSummary {
  id: string
  name: string
  slug: string
  image_url: string | null
  sort_order: number
}

export function usePetTypes() {
  const supabase = useSupabaseClient()

  async function fetchActivePetTypes(): Promise<PetTypeSummary[]> {
    const { data, error } = await supabase
      .from('pet_types')
      .select('id, name, slug, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as PetTypeSummary[]
  }

  async function fetchAllPetTypesAdmin(): Promise<PetType[]> {
    const { data, error } = await supabase
      .from('pet_types')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as PetType[]
  }

  async function createPetType(payload: {
    name: string
    slug: string
    image_url?: string | null
    sort_order?: number
    is_active?: boolean
  }): Promise<PetType> {
    const { data, error } = await supabase
      .from('pet_types')
      .insert(payload as unknown as never)
      .select()
      .single()
    if (error) throw error
    return data as unknown as PetType
  }

  async function updatePetType(id: string, payload: Record<string, unknown>): Promise<PetType> {
    const { data, error } = await supabase
      .from('pet_types')
      .update(payload as unknown as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as unknown as PetType
  }

  async function deletePetType(id: string): Promise<void> {
    const { error } = await supabase.from('pet_types').delete().eq('id', id)
    if (error) throw error
  }

  async function uploadImage(file: File, slug: string): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `${slug}-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('pet-type-images')
      .upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('pet-type-images').getPublicUrl(path)
    return data.publicUrl
  }

  return {
    fetchActivePetTypes,
    fetchAllPetTypesAdmin,
    createPetType,
    updatePetType,
    deletePetType,
    uploadImage,
  }
}
