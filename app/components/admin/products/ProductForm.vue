<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useField } from 'vee-validate'
import { z } from 'zod'

interface Props {
  initial?: {
    id?: string
    name?: string
    brand?: string | null
    pet_type?: string
    product_type?: string
    retail_price?: number | null
    stock_quantity?: number
  }
  submitText?: string
}

const props = withDefaults(defineProps<Props>(), {
  initial: undefined,
  submitText: 'Save',
})

const schema = toTypedSchema(
  z.object({
    name: z.string().min(1),
    pet_type: z.string().min(1),
    product_type: z.string().min(1),
    retail_price: z.number().min(0).optional(),
    stock_quantity: z.number().min(0).default(0),
  })
)

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
  initialValues: {
    name: props.initial?.name ?? '',
    brand: undefined,
    pet_type: props.initial?.pet_type ?? '',
    product_type: props.initial?.product_type ?? '',
    retail_price: props.initial?.retail_price ?? undefined,
    stock_quantity: props.initial?.stock_quantity ?? 0,
  },
})

const { value: name, errorMessage: nameError } = useField<string>('name')
const { value: petType, errorMessage: petTypeError } = useField<string>('pet_type')
const { value: productType, errorMessage: productTypeError } = useField<string>('product_type')
const { value: retailPrice, errorMessage: retailPriceError } = useField<number | undefined>('retail_price')
const { value: stockQty, errorMessage: stockQtyError } = useField<number>('stock_quantity')

const supabase = useSupabaseClient()
const brand = ref<string>(props.initial?.brand ?? '')
const brandValue = computed<string>({
  get() { return brand.value && brand.value.length ? brand.value : '__none__' },
  set(v: string) { brand.value = v === '__none__' ? '' : v }
})
const newBrand = ref('')
const { data: brandData } = await useLazyAsyncData<string[]>(
  'admin-form-brands',
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
const brandList = computed(() => (brandData.value || []) as string[])

const emit = defineEmits<{ submit: [{
  name: string
  brand?: string | null
  pet_type: string
  product_type: string
  retail_price?: number | null
  stock_quantity?: number
}] }>()

const onSubmit = handleSubmit(async (values) => {
  emit('submit', { ...values, brand: brand.value || null })
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label for="name">Name</Label>
        <Input id="name" v-model="name" placeholder="Product name" />
        <p v-if="nameError" class="text-destructive text-xs mt-1">{{ nameError }}</p>
      </div>
      <div>
        <Label for="brand">Brand</Label>
        <Select v-model="brandValue">
          <SelectTrigger id="brand">
            <SelectValue placeholder="Select brand or add new" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No Brand</SelectItem>
            <SelectItem v-for="b in brandList" :key="b" :value="b">{{ b }}</SelectItem>
          </SelectContent>
        </Select>
        <div class="flex gap-2 mt-2">
          <Input v-model="newBrand" placeholder="Add new brand" />
          <Button type="button" @click="() => { const b = newBrand.trim(); brandValue = b || '__none__'; const list = (brandData.value || []) as string[]; if (b && !list.includes(b)) brandData.value = Array.from(new Set([...list, b])).sort(); newBrand = '' }">Add</Button>
        </div>
      </div>
      <div>
        <Label for="pet">Pet Type</Label>
        <Select v-model="petType">
          <SelectTrigger id="pet">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dogs">Dogs</SelectItem>
            <SelectItem value="cats">Cats</SelectItem>
            <SelectItem value="birds">Birds</SelectItem>
            <SelectItem value="fish">Fish</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <p v-if="petTypeError" class="text-destructive text-xs mt-1">{{ petTypeError }}</p>
      </div>

      <div>
        <Label for="ptype">Product Type</Label>
        <Input id="ptype" v-model="productType" placeholder="e.g., Food, Toys" />
        <p v-if="productTypeError" class="text-destructive text-xs mt-1">{{ productTypeError }}</p>
      </div>

      <div>
        <Label for="retail">Retail Price</Label>
        <Input id="retail" type="number" step="0.01" v-model.number="retailPrice" />
        <p v-if="retailPriceError" class="text-destructive text-xs mt-1">{{ retailPriceError }}</p>
      </div>

      <div>
        <Label for="stock">Stock</Label>
        <Input id="stock" type="number" v-model.number="stockQty" />
        <p v-if="stockQtyError" class="text-destructive text-xs mt-1">{{ stockQtyError }}</p>
      </div>
    </div>

    <div class="flex justify-end gap-2">
      <Button type="submit" :disabled="isSubmitting">{{ props.submitText }}</Button>
    </div>
  </form>
</template>
