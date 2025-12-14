<script setup lang="ts">
import { toast } from 'vue-sonner'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useField } from 'vee-validate'
import { z } from 'zod'
import type { AdminProduct } from '@/composables/admin/useAdminProducts'
import type { Ref, ComputedRef } from 'vue'
import type { CategoryKey, CategoryContext, CategoryOption } from '@/domain/categories'
import { useCategories, isCategoryRequired, getCategoryLabel } from '@/domain/categories'

interface Emits {
  (e: 'update:open', v: boolean): void
  (e: 'submit', payload: {
    name: string
    pet_type: string
    product_type: string
    age?: string
    unit?: string
    size?: string
    flavour?: string
    retail_price: number
    stock_quantity: number
    thumbnailFile?: File | null
    galleryFiles?: File[]
    existingThumbnailUrl?: string | null
    existingGalleryUrls?: string[]
  }): void
}

const props = defineProps<{ open?: boolean; initial?: AdminProduct | null }>()
const emit = defineEmits<Emits>()

const { options, setCategory, clearCategory, getVisibleKeys: getVisibleKeysFromCtx, getDependents, context } = useCategories()
const optionMap: Record<CategoryKey, ComputedRef<CategoryOption[]>> = {
  pet: options('pet'),
  type: options('type'),
  age: options('age'),
  unit: options('unit'),
  size: options('size'),
  flavour: options('flavour'),
}
const optsFor = (key: CategoryKey) => optionMap[key].value

const schema = toTypedSchema(
  z
    .object({
      name: z.string().min(1),
      pet: z.string().min(1),
      type: z.string().min(1),
      age: z.string().optional(),
      unit: z.string().optional(),
      size: z.string().optional(),
      flavour: z.string().optional(),
      price: z.number().min(0),
      offer_percentage: z.number().min(0).max(90).optional(),
      stock_quantity: z.number().min(0).default(0),
    })
    .superRefine((val, ctx) => {
      const catCtx: CategoryContext = {
        pet: val.pet,
        type: val.type,
        age: val.age,
        unit: val.unit,
        size: val.size,
        flavour: val.flavour,
      }
      for (const key of ['pet', 'type', 'age', 'unit', 'size', 'flavour'] as const) {
        if (isCategoryRequired(key, catCtx) && !catCtx[key]) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${getCategoryLabel(key)} is required`, path: [key] })
        }
      }
    })
)

const { handleSubmit, isSubmitting, setValues, submitCount } = useForm({
  validationSchema: schema,
  initialValues: {
    name: '', pet: '', type: '', age: undefined, unit: undefined, size: undefined, flavour: undefined,
    price: 0, offer_percentage: undefined, stock_quantity: 0,
  },
})

const { value: name, errorMessage: nameError, meta: nameMeta } = useField<string>('name')
const { value: pet, errorMessage: petError, meta: petMeta } = useField<string>('pet')
const { value: type, errorMessage: typeError, meta: typeMeta } = useField<string>('type')
const { value: age, errorMessage: ageError, meta: ageMeta } = useField<string | undefined>('age')
const { value: unit, errorMessage: unitError, meta: unitMeta } = useField<string | undefined>('unit')
const { value: size, errorMessage: sizeError, meta: sizeMeta } = useField<string | undefined>('size')
const { value: flavour, errorMessage: flavourError, meta: flavourMeta } = useField<string | undefined>('flavour')
const { value: price, errorMessage: priceError, meta: priceMeta } = useField<number>('price')
const { value: offerPct, errorMessage: offerPctError, meta: offerPctMeta } = useField<number | undefined>('offer_percentage')
const { value: stockQty, errorMessage: stockQtyError, meta: stockQtyMeta } = useField<number>('stock_quantity')

const initializing = ref(false)

watch(() => props.open, (open) => {
  if (open) {
    initializing.value = true
    setValues({
      name: props.initial?.name ?? '',
      pet: props.initial?.pet_type ?? '',
      type: props.initial?.product_type ?? '',
      age: (props.initial as any)?.age ?? undefined,
      unit: (props.initial as any)?.unit ?? undefined,
      size: (props.initial as any)?.size ?? undefined,
      flavour: (props.initial as any)?.flavour ?? undefined,
      price: Number(props.initial?.retail_price ?? 0),
      offer_percentage: undefined,
      stock_quantity: Number(props.initial?.stock_quantity ?? 0),
    }, false)
    existingThumbnailUrl.value = props.initial?.thumbnail_url ?? null
    existingGalleryUrls.value = Array.isArray(props.initial?.image_urls) ? (props.initial!.image_urls as string[]) : []
    if (props.initial?.pet_type) setCategory('pet', props.initial.pet_type)
    else clearCategory('pet')
    if (props.initial?.product_type) setCategory('type', props.initial.product_type)
    else clearCategory('type')
    const initialUnit = (props.initial as any)?.unit as string | undefined
    const initialSize = (props.initial as any)?.size as string | undefined
    const initialFlavour = (props.initial as any)?.flavour as string | undefined
    const initialAge = (props.initial as any)?.age as string | undefined
    if (initialUnit) setCategory('unit', initialUnit); else clearCategory('unit')
    if (initialSize) setCategory('size', initialSize); else clearCategory('size')
    if (initialFlavour) setCategory('flavour', initialFlavour); else clearCategory('flavour')
    if (initialAge) setCategory('age', initialAge); else clearCategory('age')
    initializing.value = false
  }
})

const categoryKeys = ['pet','type','age','unit','size','flavour'] as const
const valueMap: Record<CategoryKey, Ref<string | undefined>> = {
  pet: pet as unknown as Ref<string | undefined>,
  type: type as unknown as Ref<string | undefined>,
  age, unit, size, flavour,
}
const errorMap: Record<CategoryKey, Ref<string | undefined>> = {
  pet: petError as Ref<string | undefined>,
  type: typeError as Ref<string | undefined>,
  age: ageError, unit: unitError, size: sizeError, flavour: flavourError,
}

const clearField = (k: CategoryKey) => { valueMap[k].value = undefined }

const attachWatcher = (k: CategoryKey) => {
  watch(valueMap[k], (v) => {
    if (v) setCategory(k, v)
    if (!initializing.value) {
      for (const dep of getDependents(k)) {
        clearCategory(dep)
        clearField(dep)
      }
    }
  })
}

attachWatcher('pet')
attachWatcher('type')
attachWatcher('unit')

const visibleKeys = computed(() => getVisibleKeysFromCtx())

const onSubmit = handleSubmit(async (values) => {
  const hasThumb = thumbnailFile.value || existingThumbnailUrl.value
  if (!hasThumb) {
    toast.error('Thumbnail image is required')
    return
  }
  console.log(values)
  emit('submit', {
    name: values.name,
    pet_type: values.pet,
    product_type: values.type,
    age: values.age,
    unit: values.unit,
    size: values.size,
    flavour: values.flavour,
    retail_price: values.price,
    stock_quantity: values.stock_quantity ?? 0,
    thumbnailFile: thumbnailFile.value,
    galleryFiles: galleryFiles.value,
    existingThumbnailUrl: existingThumbnailUrl.value,
    existingGalleryUrls: existingGalleryUrls.value,
  })
})

const thumbnailFile = ref<File | null>(null)
const thumbnailPreview = ref<string | null>(null)
const existingThumbnailUrl = ref<string | null>(null)

const { errorMessage: thumbnailError, meta: thumbnailMeta, validate: validateThumbnail } = useField('thumbnail', () => {
  return (thumbnailFile.value || existingThumbnailUrl.value) ? true : 'Thumbnail image is required'
})

const galleryFiles = ref<File[]>([])
const galleryPreviews = ref<string[]>([])
const existingGalleryUrls = ref<string[]>([])

const onThumbChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] || null
  thumbnailFile.value = file
  if (file) {
    thumbnailPreview.value = URL.createObjectURL(file)
    existingThumbnailUrl.value = null
  } else {
    thumbnailPreview.value = null
  }
  validateThumbnail()
}

const clearThumbnail = () => {
  thumbnailFile.value = null
  thumbnailPreview.value = null
  validateThumbnail()
}

const onGalleryChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  galleryFiles.value = [...galleryFiles.value, ...files]
  galleryPreviews.value = [...galleryPreviews.value, ...files.map(f => URL.createObjectURL(f))]
}

const removeNewGalleryAt = (idx: number) => {
  galleryFiles.value.splice(idx, 1)
  galleryPreviews.value.splice(idx, 1)
}

const removeExistingGalleryAt = (idx: number) => {
  existingGalleryUrls.value.splice(idx, 1)
}
</script>

<template>
  <Sheet :open="props.open" @update:open="(v) => emit('update:open', v)">
    <SheetContent class="sm:max-w-xl p-0 h-full gap-0">
      <SheetHeader class="sticky top-0 z-10 bg-secondary/10 border-b px-6 py-4 shadow-sm">
        <SheetTitle>{{ props.initial?.id ? 'Edit Product' : 'Add Product' }}</SheetTitle>
        <SheetDescription />
      </SheetHeader>
      <div class="flex-1 overflow-y-auto px-6 py-6 pb-0">
        <form class="flex flex-col space-y-4 h-full" @submit.prevent="onSubmit">
          <div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 flex-1 justify-start">
                <div class="flex flex-col gap-1.5">
                <Label for="name">Name</Label>
                <Input id="name" v-model="name" placeholder="Product name" class="w-full" />
                <p v-if="nameError && nameMeta.touched" class="text-destructive text-xs">{{ nameError }}</p>
                </div>
                <div v-for="k in visibleKeys" :key="k" class="flex flex-col gap-1.5">
                  <Label :for="k">{{ getCategoryLabel(k) }}</Label>
                  <Select v-model="valueMap[k].value">
                    <SelectTrigger :id="k" class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="opt in (optsFor(k) ?? [])" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p v-if="errorMap[k]?.value && (k === 'pet' ? petMeta.touched : k === 'type' ? typeMeta.touched : k === 'age' ? ageMeta.touched : k === 'unit' ? unitMeta.touched : k === 'size' ? sizeMeta.touched : flavourMeta.touched)" class="text-destructive text-xs">{{ errorMap[k]?.value }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                <Label for="price">Price</Label>
                <Input id="price" type="number" step="0.01" v-model.number="price" class="w-full" />
                <p v-if="priceError && priceMeta.touched" class="text-destructive text-xs">{{ priceError }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                <Label for="offer">Offer %</Label>
                <Input id="offer" type="number" step="1" min="0" max="90" v-model.number="offerPct" class="w-full" />
                <p v-if="offerPctError && offerPctMeta.touched" class="text-destructive text-xs">{{ offerPctError }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                <Label for="stock">Stock</Label>
                <Input id="stock" type="number" v-model.number="stockQty" class="w-full" />
                <p v-if="stockQtyError && stockQtyMeta.touched" class="text-destructive text-xs">{{ stockQtyError }}</p>
                </div>
                <div class="flex flex-col gap-1.5 md:col-span-2">
                  <Label for="thumbnail">Thumbnail (required)</Label>
                  <div class="flex items-center gap-3">
                    <Avatar class="size-20">
                      <AvatarImage v-if="thumbnailPreview" :src="thumbnailPreview" alt="thumbnail" />
                      <AvatarImage v-else-if="existingThumbnailUrl" :src="existingThumbnailUrl" alt="thumbnail" />
                      <AvatarFallback>IMG</AvatarFallback>
                    </Avatar>
                    <div class="flex items-center gap-2">
                      <Input id="thumbnail" type="file" accept="image/*" class="w-56" @change="onThumbChange" />
                      <Button variant="outline" @click.prevent="clearThumbnail">Remove</Button>
                    </div>
                  </div>
                  <p v-if="thumbnailError && (thumbnailMeta.touched || submitCount > 0)" class="text-destructive text-xs">{{ thumbnailError }}</p>
                </div>
                <div class="flex flex-col gap-1.5 md:col-span-2">
                  <Label for="gallery">Gallery (optional)</Label>
                  <div class="flex items-center gap-2">
                    <Input id="gallery" type="file" multiple accept="image/*" class="w-64" @change="onGalleryChange" />
                  </div>
                  <div class="flex flex-wrap gap-3 mt-2">
                    <div v-for="(url, i) in existingGalleryUrls" :key="`existing-${i}`" class="flex items-center gap-2">
                      <Avatar class="size-16">
                        <AvatarImage :src="url" alt="gallery" />
                        <AvatarFallback>IMG</AvatarFallback>
                      </Avatar>
                      <Button variant="ghost" size="sm" class="text-destructive" @click.prevent="removeExistingGalleryAt(i)">Remove</Button>
                    </div>
                    <div v-for="(url, i) in galleryPreviews" :key="`new-${i}`" class="flex items-center gap-2">
                      <Avatar class="size-16">
                        <AvatarImage :src="url" alt="gallery" />
                        <AvatarFallback>IMG</AvatarFallback>
                      </Avatar>
                      <Button variant="ghost" size="sm" class="text-destructive" @click.prevent="removeNewGalleryAt(i)">Remove</Button>
                    </div>
                  </div>
                </div>
            </div>
          </div>

          <SheetFooter class="sticky bottom-0 bg-background border-t px-0">
            <div class="w-full flex justify-end gap-2">
              <SheetClose as-child class="flex-1">
                <Button variant="outline" size="lg">Cancel</Button>
              </SheetClose>
              <Button type="submit" :disabled="isSubmitting" size="lg" class="bg-secondary text-white flex-1">{{ props.initial?.id ? 'Update' : 'Create' }}</Button>
            </div>
          </SheetFooter>
        </form>
      </div>
    </SheetContent>
  </Sheet>
</template>
