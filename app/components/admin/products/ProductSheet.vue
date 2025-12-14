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
  (e: 'submit', payload: { name: string; pet_type: string; product_type: string; retail_price: number; stock_quantity: number }): void
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
    for (const dep of getDependents(k)) {
      clearCategory(dep)
      clearField(dep)
    }
  })
}

attachWatcher('pet')
attachWatcher('type')
attachWatcher('unit')

const visibleKeys = computed(() => getVisibleKeysFromCtx())

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
                <div v-for="k in visibleKeys" :key="k" class="flex flex-col gap-1.5">
                  <Label :for="k">{{ getCategoryLabel(k) }}</Label>
                  <Select :model-value="valueMap[k]?.value" @update:modelValue="(v) => (valueMap[k].value = v as string)">
                    <SelectTrigger :id="k" class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="opt in (optsFor(k) ?? [])" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p v-if="errorMap[k]?.value" class="text-destructive text-xs">{{ errorMap[k]?.value }}</p>
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
