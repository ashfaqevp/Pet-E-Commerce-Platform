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
  const { release, sweep } = useStorageCleanup()

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
    sweep()
    return data as unknown as PetType
  }

  async function updatePetType(id: string, payload: Record<string, unknown>): Promise<PetType> {
    // Read the old image from the row, not from the form — the form may be stale.
    // Only when the caller is actually changing it; toggling is_active is not.
    const replacesImage = Object.hasOwn(payload, 'image_url')
    const previousImage = replacesImage ? await currentImage(id) : null

    const { data, error } = await supabase
      .from('pet_types')
      .update(payload as unknown as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // Only after the write succeeded — a failed update must leave the file alone.
    const petType = data as unknown as PetType
    if (previousImage && previousImage !== petType.image_url) await release([previousImage])
    sweep()
    return petType
  }

  async function deletePetType(id: string): Promise<void> {
    const previousImage = await currentImage(id)
    const { error } = await supabase.from('pet_types').delete().eq('id', id)
    if (error) throw error
    if (previousImage) await release([previousImage])
    sweep()
  }

  async function currentImage(id: string): Promise<string | null> {
    const { data } = await supabase
      .from('pet_types')
      .select('image_url')
      .eq('id', id)
      .maybeSingle<{ image_url: string | null }>()
    return data?.image_url ?? null
  }

  async function uploadImage(file: File, slug: string): Promise<string> {
    const tile = await prepareUpload(file, UPLOAD_PRESETS.petType, 'pet-type-image')
    const ext = tile.name.split('.').pop()
    const path = `${slug}-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('pet-type-images')
      .upload(path, tile, {
        upsert: true,
        contentType: tile.type,
        cacheControl: UPLOAD_CACHE_CONTROL,
      })
    if (error) throw storageUploadError(error)
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
