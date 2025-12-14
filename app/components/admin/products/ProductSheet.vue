<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useField } from 'vee-validate'
import { z } from 'zod'
import type { AdminProduct } from '@/composables/admin/useAdminProducts'
import { useCategories } from '@/domain/categories'

interface Emits {
  (e: 'update:open', v: boolean): void
  (e: 'submit', payload: { name: string; pet_type: string; product_type: string; retail_price: number; stock_quantity: number }): void
}

const props = defineProps<{ open?: boolean; initial?: AdminProduct | null }>()
const emit = defineEmits<Emits>()

const { options, setCategory, clearCategory, getCategoryLabel } = useCategories()
const petOptions = options('pet')
const typeOptions = options('type')
const ageOptions = options('age')
const unitOptions = options('unit')
const sizeOptions = options('size')
const flavourOptions = options('flavour')

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
      if (['cat', 'dog'].includes(val.pet) && !val.age) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Age is required', path: ['age'] })
      }
      if (['food', 'treats'].includes(val.type) && !val.flavour) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Flavour is required', path: ['flavour'] })
      }
      if (val.unit && !val.size) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Size is required for selected unit', path: ['size'] })
      }
    })
)

const { handleSubmit, isSubmitting, setValues } = useForm({
  validationSchema: schema,
  initialValues: {
    name: '', pet: '', type: '', age: undefined, unit: undefined, size: undefined, flavour: undefined,
    price: 0, offer_percentage: undefined, stock_quantity: 0,
  },
})

const { value: name, errorMessage: nameError } = useField<string>('name')
const { value: pet, errorMessage: petError } = useField<string>('pet')
const { value: type, errorMessage: typeError } = useField<string>('type')
const { value: age, errorMessage: ageError } = useField<string | undefined>('age')
const { value: unit, errorMessage: unitError } = useField<string | undefined>('unit')
const { value: size, errorMessage: sizeError } = useField<string | undefined>('size')
const { value: flavour, errorMessage: flavourError } = useField<string | undefined>('flavour')
const { value: price, errorMessage: priceError } = useField<number>('price')
const { value: offerPct, errorMessage: offerPctError } = useField<number | undefined>('offer_percentage')
const { value: stockQty, errorMessage: stockQtyError } = useField<number>('stock_quantity')

watch(() => props.open, (open) => {
  if (open) {
    setValues({
      name: props.initial?.name ?? '',
      pet: props.initial?.pet_type ?? '',
      type: props.initial?.product_type ?? '',
      age: undefined,
      unit: undefined,
      size: undefined,
      flavour: undefined,
      price: Number(props.initial?.retail_price ?? 0),
      offer_percentage: undefined,
      stock_quantity: Number(props.initial?.stock_quantity ?? 0),
    }, false)
    if (props.initial?.pet_type) setCategory('pet', props.initial.pet_type)
    else clearCategory('pet')
    if (props.initial?.product_type) setCategory('type', props.initial.product_type)
    else clearCategory('type')
    clearCategory('unit'); clearCategory('size'); clearCategory('flavour'); clearCategory('age')
  }
})

watch(pet, (v) => { if (v) setCategory('pet', v); clearCategory('age') })
watch(type, (v) => { if (v) setCategory('type', v); clearCategory('flavour') })
watch(unit, (v) => { if (v) setCategory('unit', v); clearCategory('size') })

const onSubmit = handleSubmit(async (values) => {
  emit('submit', {
    name: values.name,
    pet_type: values.pet,
    product_type: values.type,
    retail_price: values.price,
    stock_quantity: values.stock_quantity ?? 0,
  })
})
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
                <p v-if="nameError" class="text-destructive text-xs">{{ nameError }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                <Label for="pet">{{ getCategoryLabel('pet') }}</Label>
                <Select v-model="pet">
                    <SelectTrigger id="pet" class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem v-for="opt in petOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
                    </SelectContent>
                </Select>
                <p v-if="petError" class="text-destructive text-xs">{{ petError }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                <Label for="type">{{ getCategoryLabel('type') }}</Label>
                <Select v-model="type">
                    <SelectTrigger id="type" class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem v-for="opt in typeOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
                    </SelectContent>
                </Select>
                <p v-if="typeError" class="text-destructive text-xs">{{ typeError }}</p>
                </div>
                <div v-if="['cat','dog'].includes(pet || '')" class="flex flex-col gap-1.5">
                <Label for="age">{{ getCategoryLabel('age') }}</Label>
                <Select v-model="age">
                    <SelectTrigger id="age" class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem v-for="opt in ageOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
                    </SelectContent>
                </Select>
                <p v-if="ageError" class="text-destructive text-xs">{{ ageError }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                <Label for="unit">{{ getCategoryLabel('unit') }}</Label>
                <Select v-model="unit">
                    <SelectTrigger id="unit" class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem v-for="opt in unitOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
                    </SelectContent>
                </Select>
                <p v-if="unitError" class="text-destructive text-xs">{{ unitError }}</p>
                </div>
                <div v-if="!!unit" class="flex flex-col gap-1.5">
                <Label for="size">{{ getCategoryLabel('size') }}</Label>
                <Select v-model="size">
                    <SelectTrigger id="size" class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem v-for="opt in sizeOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
                    </SelectContent>
                </Select>
                <p v-if="sizeError" class="text-destructive text-xs">{{ sizeError }}</p>
                </div>
                <div v-if="['food','treats'].includes(type || '')" class="flex flex-col gap-1.5">
                <Label for="flavour">{{ getCategoryLabel('flavour') }}</Label>
                <Select v-model="flavour">
                    <SelectTrigger id="flavour" class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem v-for="opt in flavourOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
                    </SelectContent>
                </Select>
                <p v-if="flavourError" class="text-destructive text-xs">{{ flavourError }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                <Label for="price">Price</Label>
                <Input id="price" type="number" step="0.01" v-model.number="price" class="w-full" />
                <p v-if="priceError" class="text-destructive text-xs">{{ priceError }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                <Label for="offer">Offer %</Label>
                <Input id="offer" type="number" step="1" min="0" max="90" v-model.number="offerPct" class="w-full" />
                <p v-if="offerPctError" class="text-destructive text-xs">{{ offerPctError }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                <Label for="stock">Stock</Label>
                <Input id="stock" type="number" v-model.number="stockQty" class="w-full" />
                <p v-if="stockQtyError" class="text-destructive text-xs">{{ stockQtyError }}</p>
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
