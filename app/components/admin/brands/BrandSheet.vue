<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Brand } from '@/composables/useBrands'

interface Emits {
  (e: 'update:open', v: boolean): void
  (e: 'saved'): void
}

const props = defineProps<{
  open: boolean
  brand: Brand | null
}>()

const emit = defineEmits<Emits>()

const { createBrand, updateBrand, uploadLogo } = useBrands()

const isNew = computed(() => !props.brand)
const name = ref('')
const slug = ref('')
const description = ref('')
const sortOrder = ref(0)
const isFeatured = ref(false)
const isActive = ref(true)
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const existingLogoUrl = ref<string | null>(null)
const submitting = ref(false)
const slugManuallyEdited = ref(false)
const fileInputKey = ref(0)

function resetForm() {
  name.value = ''
  slug.value = ''
  description.value = ''
  sortOrder.value = 0
  isFeatured.value = false
  isActive.value = true
  logoFile.value = null
  logoPreview.value = null
  existingLogoUrl.value = null
  slugManuallyEdited.value = false
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    fileInputKey.value++
    if (props.brand) {
      name.value = props.brand.name ?? ''
      slug.value = props.brand.slug ?? ''
      description.value = props.brand.description ?? ''
      sortOrder.value = props.brand.sort_order ?? 0
      isFeatured.value = props.brand.is_featured ?? false
      isActive.value = props.brand.is_active ?? true
      existingLogoUrl.value = props.brand.logo_url ?? null
      logoFile.value = null
      logoPreview.value = null
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

const onLogoChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null
  logoFile.value = file
  logoPreview.value = file ? URL.createObjectURL(file) : null
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
    let logoUrl = existingLogoUrl.value
    if (logoFile.value) {
      logoUrl = await uploadLogo(logoFile.value, slug.value)
    }
    const payload = {
      name: name.value.trim(),
      slug: slug.value.trim(),
      description: description.value.trim() || null,
      sort_order: sortOrder.value,
      is_featured: isFeatured.value,
      is_active: isActive.value,
      logo_url: logoUrl,
    }
    if (isNew.value) {
      await createBrand(payload)
      toast.success('Brand created')
    } else {
      await updateBrand(props.brand!.id, payload)
      toast.success('Brand updated')
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
          <SheetTitle>{{ isNew ? 'New Brand' : 'Edit Brand' }}</SheetTitle>
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
            <Label for="brand-name">Name <span class="text-destructive">*</span></Label>
            <Input id="brand-name" v-model="name" placeholder="e.g. Royal Canin" />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="brand-slug">Slug <span class="text-destructive">*</span></Label>
            <Input
              id="brand-slug"
              v-model="slug"
              placeholder="e.g. royal-canin"
              @input="slugManuallyEdited = true"
            />
            <p v-if="slugError && slug" class="text-xs text-destructive">{{ slugError }}</p>
            <p v-else class="text-xs text-muted-foreground">Used in URLs: /brands/{{ slug || 'your-slug' }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="brand-logo">Logo</Label>
            <div class="flex items-center gap-3">
              <div class="h-16 w-16 rounded border bg-muted grid place-items-center overflow-hidden shrink-0">
                <img v-if="logoPreview" :src="logoPreview" alt="preview" class="h-full w-full object-contain" />
                <img v-else-if="existingLogoUrl" :src="existingLogoUrl" alt="logo" class="h-full w-full object-contain" />
                <Icon v-else name="lucide:image" class="h-6 w-6 text-muted-foreground" />
              </div>
              <Input :key="fileInputKey" type="file" accept="image/*" class="flex-1" @change="onLogoChange" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="brand-desc">Description</Label>
            <Textarea id="brand-desc" v-model="description" placeholder="Optional brand description" class="min-h-20" />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="brand-sort">Sort Order</Label>
            <Input id="brand-sort" type="number" v-model.number="sortOrder" class="w-32" />
            <p class="text-xs text-muted-foreground">Lower number appears first</p>
          </div>

          <div class="flex items-center justify-between py-1">
            <Label for="brand-featured" class="cursor-pointer">Featured on homepage</Label>
            <Switch id="brand-featured" v-model="isFeatured" />
          </div>

          <div class="flex items-center justify-between py-1">
            <Label for="brand-active" class="cursor-pointer">Active</Label>
            <Switch id="brand-active" v-model="isActive" />
          </div>
        </div>
      </div>

      <div class="mt-auto border-t p-6 bg-muted/20">
        <div class="flex gap-3">
          <Button variant="outline" class="flex-1" @click="emit('update:open', false)">Cancel</Button>
          <Button class="flex-1 bg-secondary text-white" :disabled="submitting" @click="onSubmit">
            <Icon v-if="submitting" name="lucide:loader-2" class="h-4 w-4 mr-2 animate-spin" />
            {{ isNew ? (submitting ? 'Creating…' : 'Create Brand') : (submitting ? 'Saving…' : 'Save Changes') }}
          </Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
