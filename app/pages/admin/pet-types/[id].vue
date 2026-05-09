<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { PetType } from '@/composables/usePetTypes'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const route = useRoute()
const isNew = computed(() => route.params.id === 'new')
const petTypeId = computed(() => isNew.value ? null : String(route.params.id))

const { createPetType, updatePetType, uploadImage } = usePetTypes()

const { data: existing, pending: loadPending } = await useLazyAsyncData<PetType | null>(
  `admin-pet-type-${route.params.id}`,
  async () => {
    if (isNew.value) return null
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('pet_types')
      .select('*')
      .eq('id', petTypeId.value as string)
      .single()
    if (error) throw error
    return data as unknown as PetType
  },
  { server: true }
)

useHead({ title: computed(() => isNew.value ? 'New Pet Type' : 'Edit Pet Type') })

const name = ref('')
const slug = ref('')
const sortOrder = ref(0)
const isActive = ref(true)
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const existingImageUrl = ref<string | null>(null)
const submitting = ref(false)
const slugManuallyEdited = ref(false)

watch(existing, (val) => {
  if (!val) return
  name.value = val.name ?? ''
  slug.value = val.slug ?? ''
  sortOrder.value = val.sort_order ?? 0
  isActive.value = val.is_active ?? true
  existingImageUrl.value = val.image_url ?? null
  slugManuallyEdited.value = true
}, { immediate: true })

function toSlug(n: string): string {
  return n.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

watch(name, (n) => {
  if (!slugManuallyEdited.value || !slug.value) {
    slug.value = toSlug(n)
  }
})

const onImageChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null
  imageFile.value = file
  imagePreview.value = file ? URL.createObjectURL(file) : null
}

const slugError = computed(() => {
  if (!slug.value) return 'Slug is required'
  if (!/^[a-z0-9-]+$/.test(slug.value)) return 'Only lowercase letters, numbers and hyphens'
  return null
})

const onSubmit = async () => {
  if (!name.value.trim()) { toast.error('Name is required'); return }
  if (slugError.value) { toast.error(slugError.value); return }
  submitting.value = true
  try {
    let imageUrl = existingImageUrl.value
    if (imageFile.value) {
      imageUrl = await uploadImage(imageFile.value, slug.value)
    }
    const payload = {
      name: name.value.trim(),
      slug: slug.value.trim(),
      sort_order: sortOrder.value,
      is_active: isActive.value,
      image_url: imageUrl,
    }
    if (isNew.value) {
      await createPetType(payload)
      toast.success('Pet type created')
    } else {
      await updatePetType(petTypeId.value as string, payload)
      toast.success('Pet type updated')
    }
    await navigateTo('/admin/pet-types')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Save failed')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-xl space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink to="/admin/pet-types">
        <Button variant="ghost" size="icon">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
        </Button>
      </NuxtLink>
      <h1 class="text-2xl font-semibold">{{ isNew ? 'New Pet Type' : 'Edit Pet Type' }}</h1>
    </div>

    <Card>
      <CardContent class="pt-6 space-y-4">
        <div v-if="loadPending" class="space-y-3">
          <Skeleton v-for="i in 4" :key="i" class="h-10 w-full" />
        </div>

        <template v-else>
          <div class="flex flex-col gap-1.5">
            <Label for="pt-name">Name <span class="text-destructive">*</span></Label>
            <Input id="pt-name" v-model="name" placeholder="e.g. Rabbit" />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="pt-slug">Slug <span class="text-destructive">*</span></Label>
            <Input
              id="pt-slug"
              v-model="slug"
              placeholder="e.g. rabbit"
              @input="slugManuallyEdited = true"
            />
            <p v-if="slugError && slug" class="text-xs text-destructive">{{ slugError }}</p>
            <p v-else class="text-xs text-muted-foreground">
              Must exactly match the values in <code class="font-mono">products.pet_type[]</code>
              (e.g. <code class="font-mono">rabbit</code>, <code class="font-mono">small-animal</code>).
            </p>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="pt-image">Image</Label>
            <div class="flex items-center gap-3">
              <div class="h-16 w-16 rounded-full border bg-muted grid place-items-center overflow-hidden shrink-0">
                <img v-if="imagePreview" :src="imagePreview" alt="preview" class="h-full w-full object-cover rounded-full" />
                <img v-else-if="existingImageUrl" :src="existingImageUrl" alt="image" class="h-full w-full object-cover rounded-full" />
                <Icon v-else name="lucide:paw-print" class="h-6 w-6 text-muted-foreground" />
              </div>
              <Input id="pt-image" type="file" accept="image/*" class="flex-1" @change="onImageChange" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="pt-sort">Sort Order</Label>
            <Input id="pt-sort" type="number" v-model.number="sortOrder" class="w-32" />
            <p class="text-xs text-muted-foreground">Lower number appears first on the homepage</p>
          </div>

          <div class="flex items-center justify-between py-1">
            <Label for="pt-active" class="cursor-pointer">Active</Label>
            <Switch id="pt-active" v-model:checked="isActive" />
          </div>

          <div class="flex gap-2 pt-2">
            <NuxtLink to="/admin/pet-types" class="flex-1">
              <Button variant="outline" class="w-full">Cancel</Button>
            </NuxtLink>
            <Button class="flex-1 bg-secondary text-white" :disabled="submitting" @click="onSubmit">
              <Icon v-if="submitting" name="lucide:loader-2" class="h-4 w-4 mr-2 animate-spin" />
              {{ isNew ? (submitting ? 'Creating…' : 'Create Pet Type') : (submitting ? 'Saving…' : 'Save Changes') }}
            </Button>
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
