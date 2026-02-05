<script setup lang="ts">
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
    pet_type: string[]
    product_type: string
    age?: string
    unit?: string
    size?: string
    flavour?: string
    retail_price: number
    wholesale_price?: number | null
    stock_quantity: number
    description?: string
    default_rating: number | null
    is_base_product: boolean
    base_product_id?: string | null
    thumbnailFile?: File | null
    galleryFiles?: File[]
    existingThumbnailUrl?: string | null
    existingGalleryUrls?: string[]
    brand?: string | null
  }): void
}

const props = defineProps<{ open?: boolean; initial?: AdminProduct | null }>()
const emit = defineEmits<Emits>()
const supabase = useSupabaseClient()

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
      description: z.string().optional(),
      pet: z.array(z.string()).min(1),
      type: z.string().min(1),
      age: z.string().optional(),
      unit: z.string().optional(),
      size: z.number().min(0).optional(),
      flavour: z.string().optional(),
      price: z.number().min(0),
      wholesale_price: z.number().min(0).optional(),
      offer_percentage: z.number().min(0).max(90).optional(),
      stock_quantity: z.number().min(0).default(1000),
      default_rating: z.number().min(0).max(5).default(4.5),
      product_kind: z.enum(['base','variant']).default('base'),
      base_product_id: z.string().optional(),
    })
    .superRefine((val, ctx) => {
      const catCtx: CategoryContext = {
        pet: val.pet,
        type: val.type,
        age: val.age,
        unit: val.unit,
        size: undefined,
        flavour: val.flavour,
      }
      for (const key of ['pet', 'type', 'age', 'unit', 'size', 'flavour'] as const) {
        if (isCategoryRequired(key, catCtx) && !catCtx[key]) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${getCategoryLabel(key)} is required`, path: [key] })
        }
      }
      if (val.product_kind === 'variant' && !val.base_product_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Base product is required', path: ['base_product_id'] })
      }
    })
)

const { handleSubmit, isSubmitting, setValues, submitCount, resetForm } = useForm({
  validationSchema: schema,
  initialValues: {
    name: '', description: '', pet: [], type: '', age: undefined, unit: undefined, size: undefined, flavour: undefined,
    price: 0, wholesale_price: undefined, offer_percentage: undefined, stock_quantity: 1000, default_rating: 4.5, product_kind: 'base', base_product_id: undefined,
  },
})

const { value: name, errorMessage: nameError, meta: nameMeta } = useField<string>('name')
const { value: description, errorMessage: descriptionError, meta: descriptionMeta } = useField<string | undefined>('description')
const { value: pet, errorMessage: petError, meta: petMeta } = useField<string[]>('pet')
const { value: type, errorMessage: typeError, meta: typeMeta } = useField<string>('type')
const { value: age, errorMessage: ageError, meta: ageMeta } = useField<string | undefined>('age')
const { value: unit, errorMessage: unitError, meta: unitMeta } = useField<string | undefined>('unit')
const { value: size, errorMessage: sizeError, meta: sizeMeta } = useField<number | undefined>('size')
const { value: flavour, errorMessage: flavourError, meta: flavourMeta } = useField<string | undefined>('flavour')
const { value: price, errorMessage: priceError, meta: priceMeta } = useField<number>('price')
const { value: wholesalePrice, errorMessage: wholesalePriceError, meta: wholesalePriceMeta } = useField<number | undefined>('wholesale_price')
const { value: offerPct, errorMessage: offerPctError, meta: offerPctMeta } = useField<number | undefined>('offer_percentage')
const { value: stockQty, errorMessage: stockQtyError, meta: stockQtyMeta } = useField<number>('stock_quantity')
const { value: defaultRating, errorMessage: defaultRatingError, meta: defaultRatingMeta } = useField<number>('default_rating')
const { value: productKind, errorMessage: productKindError, meta: productKindMeta } = useField<'base' | 'variant'>('product_kind')
const { value: baseProductId, errorMessage: baseProductIdError, meta: baseProductIdMeta } = useField<string | undefined>('base_product_id')

const initializing = ref(false)

const brand = ref<string>(props.initial?.brand ?? '')
const newBrand = ref('')
const brandsState = await useLazyAsyncData(
  'admin-product-brands',
  async () => {
    const { data, error } = await supabase
      .from('products')
      .select('brand')
      .not('brand', 'is', null)
    if (error) throw error
    const arr = ((data || []) as Array<{ brand: string | null }>)
      .map(r => String(r.brand || '').trim())
      .filter(Boolean)
    const unique = Array.from(new Set(arr)).sort()
    return unique
  },
  { server: true }
)
const brandList = computed(() => (brandsState.data.value || []) as string[])
const brandValue = computed<string>({
  get() { return brand.value && brand.value.length ? brand.value : '__none__' },
  set(v: string) { brand.value = v === '__none__' ? '' : v }
})

watch(() => props.open, async (open) => {
  if (open) {
    initializing.value = true
    const initialPetArray = Array.isArray(props.initial?.pet_type) ? (props.initial!.pet_type as string[]) : ([])
    const initialType = props.initial?.product_type ?? ''
    const initialUnit = props.initial?.unit ?? undefined
    const initialSize = props.initial?.size ?? undefined
    const initialFlavour = props.initial?.flavour ?? undefined
    const initialAge = props.initial?.age ?? undefined
    if (initialPetArray && initialPetArray.length) setCategory('pet', initialPetArray); else clearCategory('pet')
    await nextTick()
    if (initialType) setCategory('type', initialType); else clearCategory('type')
    if (initialUnit) setCategory('unit', initialUnit); else clearCategory('unit')
    if (initialAge) setCategory('age', initialAge); else clearCategory('age')
    if (initialFlavour) setCategory('flavour', initialFlavour); else clearCategory('flavour')

    setValues({
      name: props.initial?.name ?? '',
      description: props.initial?.description ?? '',
      pet: initialPetArray,
      type: initialType,
      age: initialAge ?? undefined,
      unit: initialUnit ?? undefined,
      size: parseSizeToNumber(initialSize) ?? undefined,
      flavour: initialFlavour ?? undefined,
      price: Number(props.initial?.retail_price ?? 0),
      wholesale_price: props.initial?.wholesale_price != null ? Number(props.initial.wholesale_price) : undefined,
      offer_percentage: undefined,
      stock_quantity: 1000,
      default_rating: 4.5,
      product_kind: props.initial?.id ? (props.initial?.base_product_id === props.initial.id ? 'base' : 'variant') : 'base',
      base_product_id: props.initial?.id && props.initial.base_product_id !== props.initial.id
        ? (props.initial.base_product_id ?? undefined)
        : undefined,
    }, false)
    await nextTick()
    brand.value = props.initial?.brand ?? ''
    valueMap.pet.value = initialPetArray || undefined
    valueMap.type.value = initialType || undefined
    valueMap.unit.value = initialUnit || undefined
    valueMap.age.value = initialAge || undefined
    
    valueMap.flavour.value = initialFlavour || undefined
    existingThumbnailUrl.value = props.initial?.thumbnail_url ?? null
    hasThumbnailRef.value = !!(existingThumbnailUrl.value || thumbnailFile.value)
    existingGalleryUrls.value = Array.isArray(props.initial?.image_urls) ? (props.initial!.image_urls as string[]) : []
    initializing.value = false
  } else {
    initializing.value = true
    resetForm({
      values: {
        name: '', description: '', pet: [], type: '', age: undefined, unit: undefined, size: undefined, flavour: undefined,
        price: 0, wholesale_price: undefined, offer_percentage: undefined, stock_quantity: 1000, default_rating: 4.5, product_kind: 'base', base_product_id: undefined,
      },
    })
    brand.value = ''
    existingThumbnailUrl.value = null
    thumbnailFile.value = null
    thumbnailPreview.value = null
    galleryFiles.value = []
    galleryPreviews.value = []
    existingGalleryUrls.value = []
    hasThumbnailRef.value = false
    clearCategory('pet')
    clearCategory('type')
    clearCategory('age')
    clearCategory('unit')
    
    clearCategory('flavour')
    initializing.value = false
  }
})

const categoryKeys = ['pet','type','age','unit','flavour'] as const
const sizeStr = ref<string | undefined>(undefined)
const valueMap: Record<CategoryKey, Ref<string[] | string | undefined>> = {
  pet: pet as unknown as Ref<string[] | undefined>,
  type: type as unknown as Ref<string | undefined>,
  age, unit, size: sizeStr, flavour,
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

watch(pet, async (v) => {
  if (v && v.length) setCategory('pet', v)
  if (!initializing.value) {
    for (const dep of getDependents('pet')) {
      clearCategory(dep)
      clearField(dep)
    }
  }
  await nextTick()
  const ageOptions = optionMap.age.value
  const single = ageOptions[0]
  if (ageOptions.length === 1 && single && !valueMap.age.value) {
    valueMap.age.value = single.id
  }
})
attachWatcher('type')
attachWatcher('unit')
attachWatcher('age')

attachWatcher('flavour')

const visibleKeys = computed(() => getVisibleKeysFromCtx())
const otherCategoryKeys = computed(() => visibleKeys.value.filter(k => k !== 'pet'))

watch(() => optionMap.age.value, (opts) => {
  const list = opts || []
  if (!initializing.value) {
    const current = valueMap.age.value as string | undefined
    if (current && !list.some(o => o.id === current)) {
      valueMap.age.value = undefined
    }
    if (!valueMap.age.value) {
      const initialAgeVal = props.initial?.age
      if (initialAgeVal && list.some(o => o.id === initialAgeVal)) {
        valueMap.age.value = initialAgeVal
      } else if (list.length === 1) {
        const only = list[0]
        if (only) valueMap.age.value = only.id
      }
    }
  }
})

watch(productKind, (v) => {
  if (v === 'base') baseProductId.value = undefined
})

const onSubmit = async () => {
  await handleSubmit(async (values) => {
    emit('submit', {
      name: values.name,
      description: values.description,
      pet_type: values.pet,
      product_type: values.type,
      age: values.age,
      unit: values.unit,
      size: formatSizeToString(values.size),
      flavour: values.flavour,
      retail_price: values.price,
      wholesale_price: values.wholesale_price ?? null,
      stock_quantity: 1000,
      default_rating: values.default_rating,
      is_base_product: values.product_kind === 'base',
      base_product_id: values.product_kind === 'base' ? undefined : (values.base_product_id || undefined),
      thumbnailFile: thumbnailFile.value,
      galleryFiles: galleryFiles.value,
      existingThumbnailUrl: existingThumbnailUrl.value,
      existingGalleryUrls: existingGalleryUrls.value,
      brand: brand.value.trim() || undefined,
    })
  })()
}

const parseSizeToNumber = (s?: string | null) => {
  if (!s) return undefined
  const m = String(s).match(/\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : undefined
}
const formatSizeToString = (n?: number) => {
  return typeof n === 'number' ? n.toFixed(2) : undefined
}

const thumbnailFile = ref<File | null>(null)
const thumbnailPreview = ref<string | null>(null)
const existingThumbnailUrl = ref<string | null>(null)
const hasThumbnailRef = ref(false)


const galleryFiles = ref<File[]>([])
const galleryPreviews = ref<string[]>([])
const existingGalleryUrls = ref<string[]>([])

const onThumbChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] || null
  if (file) {
    thumbnailFile.value = file
    thumbnailPreview.value = URL.createObjectURL(file)
    existingThumbnailUrl.value = null
  } else {
    thumbnailFile.value = null
    thumbnailPreview.value = null
  }
  hasThumbnailRef.value = !!(thumbnailFile.value || existingThumbnailUrl.value)
}

const clearThumbnail = () => {
  thumbnailFile.value = null
  thumbnailPreview.value = null
  hasThumbnailRef.value = !!(existingThumbnailUrl.value)
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
const baseProductsState = await useLazyAsyncData(
  'admin-base-products',
  async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,base_product_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as { id: string; name: string; base_product_id: string | null }[]
  },
  { server: true }
)
const baseProducts = computed(() => {
  const list = (baseProductsState.data.value || []) as { id: string; name: string; base_product_id: string | null }[]
  return list.filter(p => p.base_product_id === p.id)
})
const baseProductsLoading = computed(() => !!baseProductsState.pending.value)
const baseProductsErrored = computed(() => !!baseProductsState.error.value)
const baseSearch = ref('')
const filteredBaseProducts = computed(() => {
  const q = baseSearch.value.trim().toLowerCase()
  const list = (baseProducts.value || []) as { id: string; name: string }[]
  if (!q) return list
  return list.filter(p => p.name.toLowerCase().includes(q))
})
</script>

<template>
  <Sheet :open="props.open" @update:open="(v) => emit('update:open', v)">
    <SheetContent class="sm:max-w-xl p-0 h-full gap-0" :showCloseButton="false">
      <SheetHeader class="sticky top-0 z-10 bg-secondary/10 border-b px-6 py-4 shadow-sm">
        <div class="flex items-center justify-between">
          <SheetTitle>{{ props.initial?.id ? 'Edit Product' : 'Add Product' }}</SheetTitle>
          <SheetClose as-child>
            <Button variant="ghost" size="icon" aria-label="Close">
              <Icon name="lucide:x" class="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <SheetDescription />
      </SheetHeader>
  <div class="flex-1 overflow-y-auto px-6 py-6 pb-0">
    <form class="flex flex-col space-y-4 h-full" @submit.prevent="onSubmit">
      <div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 flex-1 justify-start">
              <div class="flex flex-col gap-1.5 md:col-span-2">
                <Label for="name">Name</Label>
                <Input id="name" v-model="name" placeholder="Product name" class="w-full" />
                <p v-if="nameError && nameMeta.touched" class="text-destructive text-xs">{{ nameError }}</p>
              </div>
              <div class="flex flex-col gap-1.5 md:col-span-2">
                <Label for="thumbnail">Thumbnail</Label>
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
                
              </div>
              <div class="flex flex-col gap-1.5 md:col-span-2">
                <Label for="brand">Brand</Label>
                <Select v-model="brandValue">
                  <SelectTrigger id="brand" class="w-full"><SelectValue placeholder="Select brand or add new" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Brand</SelectItem>
                    <SelectItem v-for="b in brandList" :key="b" :value="b">{{ b }}</SelectItem>
                  </SelectContent>
                </Select>
                <div class="flex gap-2 mt-2">
                  <Input v-model="newBrand" placeholder="Add new brand" class="w-full" />
                  <Button type="button" @click="() => { const b = newBrand.trim(); brandValue = b || '__none__'; const list = (brandsState.data.value || []); if (b && !list.includes(b)) brandsState.data.value = Array.from(new Set([...list, b])).sort(); newBrand = '' }">Add</Button>
                </div>
              </div>
              <div class="flex flex-col gap-1.5 md:col-span-2">
                <Label for="description">Description</Label>
                <Textarea id="description" v-model="description" placeholder="Product description" class="w-full min-h-24" />
                <p v-if="descriptionError && descriptionMeta.touched" class="text-destructive text-xs">{{ descriptionError }}</p>
              </div>

          <!-- Pet Type (multi-select) -->
          <div v-if="visibleKeys.includes('pet')" class="flex flex-col gap-1.5 md:col-span-2">
            <Label for="pet">{{ getCategoryLabel('pet') }}</Label>
            <Select v-model="valueMap.pet.value" multiple>
              <SelectTrigger id="pet" class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in (optsFor('pet') ?? [])" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="petError && petMeta.touched" class="text-destructive text-xs">{{ petError }}</p>
          </div>

          <!-- Other categories (single-select) -->
          <div v-for="k in otherCategoryKeys" :key="k" class="flex flex-col gap-1.5">
            <Label :for="k">{{ getCategoryLabel(k) }}</Label>
            <Select v-model="valueMap[k].value">
              <SelectTrigger :id="k" class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in (optsFor(k) ?? [])" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errorMap[k]?.value && (k === 'type' ? typeMeta.touched : k === 'age' ? ageMeta.touched : k === 'unit' ? unitMeta.touched : flavourMeta.touched)" class="text-destructive text-xs">{{ errorMap[k]?.value }}</p>
          </div>
              <div class="flex flex-col gap-1.5">
                <Label for="size">Size</Label>
                <div class="flex items-center gap-2">
                  <Input id="size" type="number" step="0.01" min="0" v-model.number="size" placeholder="0.00" class="w-full" />
                  <span class="text-xs text-muted-foreground">{{ unit || 'unit' }}</span>
                </div>
                <p v-if="sizeError && sizeMeta.touched" class="text-destructive text-xs">{{ sizeError }}</p>
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="price">Price</Label>
                <Input id="price" type="number" step="0.01" v-model.number="price" class="w-full" />
                <p v-if="priceError && priceMeta.touched" class="text-destructive text-xs">{{ priceError }}</p>
              </div>
              <div class="flex flex-col gap-1.5">
                <Label for="wholesale-price">Wholesale Price</Label>
                <Input id="wholesale-price" type="number" step="0.01" v-model.number="wholesalePrice" class="w-full" />
                <p v-if="wholesalePriceError && wholesalePriceMeta.touched" class="text-destructive text-xs">{{ wholesalePriceError }}</p>
              </div>
              <!-- <div class="flex flex-col gap-1.5">
                <Label for="offer">Offer %</Label>
                <Input id="offer" type="number" step="1" min="0" max="90" v-model.number="offerPct" class="w-full" />
                <p v-if="offerPctError && offerPctMeta.touched" class="text-destructive text-xs">{{ offerPctError }}</p>
              </div> -->
              <div class="flex flex-col gap-1.5">
                <Label for="default-rating">Default Rating</Label>
                <Input id="default-rating" type="number" step="0.1" v-model.number="defaultRating" class="w-full" />
                <p v-if="defaultRatingError && defaultRatingMeta.touched" class="text-destructive text-xs">{{ defaultRatingError }}</p>
              </div>
              <div class="flex flex-col gap-1.5 md:col-span-2">
                <Label>Product Form</Label>
                <RadioGroup v-model="productKind" class="flex gap-4">
                  <div class="flex items-center gap-2">
                    <RadioGroupItem id="product-base" value="base" />
                    <Label for="product-base">Base Product</Label>
                  </div>
                  <div class="flex items-center gap-2">
                    <RadioGroupItem id="product-variant" value="variant" />
                    <Label for="product-variant">Variant of Base Product</Label>
                  </div>
                </RadioGroup>
                <p v-if="productKindError && productKindMeta.touched" class="text-destructive text-xs">{{ productKindError }}</p>
              </div>
              <div v-if="productKind === 'variant'" class="flex flex-col gap-1.5 md:col-span-2">
                <Label for="baseProduct">Select Base Product</Label>
                <Select v-model="baseProductId">
                  <SelectTrigger id="baseProduct" class="w-full"><SelectValue placeholder="Select base product" /></SelectTrigger>
                  <SelectContent>
                    <div class="sticky top-0 z-10 bg-background p-2 border-b">
                      <Input v-model="baseSearch" placeholder="Search base products..." class="w-full" @click.stop @keydown.stop />
                    </div>
                    <SelectItem v-if="baseProductsLoading" value="__loading__" disabled>Loading...</SelectItem>
                    <SelectItem v-else-if="baseProductsErrored" value="__error__" disabled>Error loading</SelectItem>
                    <SelectItem v-for="p in filteredBaseProducts" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
                  </SelectContent>
                </Select>
                <p v-if="baseProductIdError && (baseProductIdMeta.touched || submitCount > 0)" class="text-destructive text-xs">{{ baseProductIdError }}</p>
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
              <Button type="submit" :disabled="isSubmitting" size="lg" class="bg-secondary text-white flex-1">
                <Icon v-if="isSubmitting" name="lucide:loader-2" class="h-4 w-4 mr-2 animate-spin" />
                {{ props.initial?.id ? (isSubmitting ? 'Updating...' : 'Update') : (isSubmitting ? 'Creating...' : 'Create') }}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </div>
    </SheetContent>
  </Sheet>
</template>
