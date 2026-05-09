<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { PetType } from '@/composables/usePetTypes'

interface Emits {
  (e: 'update:open', v: boolean): void
  (e: 'saved'): void
}

const props = defineProps<{
  open: boolean
  petType: PetType | null
}>()

const emit = defineEmits<Emits>()

const { createPetType, updatePetType, uploadImage } = usePetTypes()

const isNew = computed(() => !props.petType)
const name = ref('')
const slug = ref('')
const sortOrder = ref(0)
const isActive = ref(true)
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const existingImageUrl = ref<string | null>(null)
const submitting = ref(false)
const slugManuallyEdited = ref(false)

function resetForm() {
  name.value = ''
  slug.value = ''
  sortOrder.value = 0
  isActive.value = true
  imageFile.value = null
  imagePreview.value = null
  existingImageUrl.value = null
  slugManuallyEdited.value = false
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.petType) {
      name.value = props.petType.name ?? ''
      slug.value = props.petType.slug ?? ''
      sortOrder.value = props.petType.sort_order ?? 0
      isActive.value = props.petType.is_active ?? true
      existingImageUrl.value = props.petType.image_url ?? null
      slugManuallyEdited.value = true
    } else {
      resetForm()
    }
  }
})

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
      await updatePetType(props.petType!.id, payload)
      toast.success('Pet type updated')
    }
    emit('saved')
    emit('update:open', false)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Save failed')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Sheet :open="props.open" @update:open="(v) => emit('update:open', v)">
    <SheetContent class="sm:max-w-md p-0 h-full gap-0 flex flex-col" :showCloseButton="false">
      <SheetHeader class="sticky top-0 z-10 bg-secondary/10 border-b px-6 py-4 shadow-sm">
        <div class="flex items-center justify-between">
          <SheetTitle>{{ isNew ? 'New Pet Type' : 'Edit Pet Type' }}</SheetTitle>
          <SheetClose as-child>
            <Button variant="ghost" size="icon" aria-label="Close">
              <Icon name="lucide:x" class="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <SheetDescription />
      </SheetHeader>

      <div class="flex-1 overflow-y-auto px-6 py-6">
        <div class="space-y-4">
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
              Must exactly match the values in <code class="font-mono text-[10px]">products.pet_type[]</code>
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
              <Input type="file" accept="image/*" class="flex-1" @change="onImageChange" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="pt-sort">Sort Order</Label>
            <Input id="pt-sort" type="number" v-model.number="sortOrder" class="w-32" />
            <p class="text-xs text-muted-foreground">Lower number appears first</p>
          </div>

          <div class="flex items-center justify-between py-1">
            <Label for="pt-active" class="cursor-pointer">Active</Label>
            <Switch id="pt-active" v-model="isActive" />
          </div>
        </div>
      </div>

      <div class="mt-auto border-t p-6 bg-muted/20">
        <div class="flex gap-3">
          <Button variant="outline" class="flex-1" @click="emit('update:open', false)">Cancel</Button>
          <Button class="flex-1 bg-secondary text-white" :disabled="submitting" @click="onSubmit">
            <Icon v-if="submitting" name="lucide:loader-2" class="h-4 w-4 mr-2 animate-spin" />
            {{ isNew ? (submitting ? 'Creating…' : 'Create Pet Type') : (submitting ? 'Saving…' : 'Save Changes') }}
          </Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
