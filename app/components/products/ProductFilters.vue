<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { CategoryKey, CategoryOption } from '@/domain/categories/category.types'
import { CATEGORY_CONFIG } from '~/domain/categories/category.config'

type FilterKey = 'pet' | 'type' | 'age' | 'flavour'

interface Props {
  filters: Record<FilterKey, string>
  typeOpts: CategoryOption[]
  ageOpts: CategoryOption[]
  flavourOpts: CategoryOption[]
  onSelect: (key: CategoryKey, id: string) => void
  onApply: () => void
  onClear: () => void
  layout?: 'grid' | 'column'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'column'
})

const containerClass = computed(() => 
  props.layout === 'grid' 
    ? 'grid grid-cols-2 gap-3' 
    : 'flex flex-col gap-3'
)

const openKeys = ref<string[]>(['pet'])

watchEffect(() => {
  const selectedKeys: FilterKey[] = []
  if (props.filters.pet) selectedKeys.push('pet')
  if (props.filters.type) selectedKeys.push('type')
  if (props.filters.age) selectedKeys.push('age')
  if (props.filters.flavour) selectedKeys.push('flavour')

  const next = new Set<string>()
  next.add('pet')

  if (selectedKeys.length === 0) {
    if (props.typeOpts.length > 0) next.add('type')
    if (props.ageOpts.length > 0) next.add('age')
    if (props.flavourOpts.length > 0) next.add('flavour')
  }
  else {
    for (const k of selectedKeys) next.add(k)
  }

  openKeys.value = Array.from(next)
})

function selectAndOpen(key: FilterKey, id: string) {
  props.onSelect(key, id)
  const nextFilters = {
    pet: key === 'pet' ? id : props.filters.pet,
    type: key === 'type' ? id : props.filters.type,
    age: key === 'age' ? id : props.filters.age,
    flavour: key === 'flavour' ? id : props.filters.flavour,
  }
  const selectedKeys: FilterKey[] = []
  if (nextFilters.pet) selectedKeys.push('pet')
  if (nextFilters.type) selectedKeys.push('type')
  if (nextFilters.age) selectedKeys.push('age')
  if (nextFilters.flavour) selectedKeys.push('flavour')
  const next = new Set<string>()
  next.add('pet')
  if (selectedKeys.length === 0) {
    if (props.typeOpts.length > 0) next.add('type')
    if (props.ageOpts.length > 0) next.add('age')
    if (props.flavourOpts.length > 0) next.add('flavour')
  }
  else {
    for (const k of selectedKeys) next.add(k)
  }
  openKeys.value = Array.from(next)
}
</script>

<template>
  <div class="space-y-4">
    <Accordion type="multiple" class="space-y-2" :default-value="['pet']" v-model:value="openKeys">
      <!-- Pet Filter -->
      <AccordionItem value="pet">
        <AccordionTrigger class="text-sm font-medium">
          Pet Type
        </AccordionTrigger>
        <AccordionContent>
          <RadioGroup :model-value="filters.pet" @update:modelValue="v => selectAndOpen('pet', String(v))">
            <div :class="containerClass">
              <Label :for="'pet-all'" class="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem id="pet-all" value="" />
                <span class="text-sm">All</span>
              </Label>
              <Label
                v-for="option in CATEGORY_CONFIG.pet.options"
                :key="option.id"
                class="flex items-center gap-2 cursor-pointer"
                :for="`pet-${option.id}`"
              >
                <RadioGroupItem :id="`pet-${option.id}`" :value="option.id" />
                <span class="text-sm">{{ option.label }}</span>
              </Label>
            </div>
          </RadioGroup>
        </AccordionContent>
      </AccordionItem>

      <!-- Type Filter -->
      <AccordionItem value="type" :disabled="typeOpts.length === 0">
        <AccordionTrigger class="text-sm font-medium">
          Product Type
        </AccordionTrigger>
        <AccordionContent>
          <div v-if="typeOpts.length === 0" class="text-sm text-muted-foreground py-2">
            Select a pet type first
          </div>
          <div v-else>
            <RadioGroup :model-value="filters.type" @update:modelValue="v => selectAndOpen('type', String(v))">
              <div :class="containerClass">
                <Label :for="'type-all'" class="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem id="type-all" value="" />
                  <span class="text-sm">All</span>
                </Label>
                <Label
                  v-for="option in typeOpts"
                  :key="option.id"
                  class="flex items-center gap-2 cursor-pointer"
                  :for="`type-${option.id}`"
                >
                  <RadioGroupItem :id="`type-${option.id}`" :value="option.id" />
                  <span class="text-sm">{{ option.label }}</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </AccordionContent>
      </AccordionItem>

      <!-- Age Filter -->
      <AccordionItem v-if="ageOpts.length > 0" value="age">
        <AccordionTrigger class="text-sm font-medium">
          Age Group
        </AccordionTrigger>
        <AccordionContent>
          <RadioGroup :model-value="filters.age" @update:modelValue="v => selectAndOpen('age', String(v))">
            <div :class="containerClass">
              <Label :for="'age-all'" class="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem id="age-all" value="" />
                <span class="text-sm">All</span>
              </Label>
              <Label
                v-for="option in ageOpts"
                :key="option.id"
                class="flex items-center gap-2 cursor-pointer"
                :for="`age-${option.id}`"
              >
                <RadioGroupItem :id="`age-${option.id}`" :value="option.id" />
                <span class="text-sm">{{ option.label }}</span>
              </Label>
            </div>
          </RadioGroup>
        </AccordionContent>
      </AccordionItem>

      <!-- Flavour Filter -->
      <AccordionItem v-if="flavourOpts.length > 0" value="flavour">
        <AccordionTrigger class="text-sm font-medium">
          Flavour
        </AccordionTrigger>
        <AccordionContent>
          <RadioGroup :model-value="filters.flavour" @update:modelValue="v => selectAndOpen('flavour', String(v))">
            <div :class="containerClass">
              <Label :for="'flavour-all'" class="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem id="flavour-all" value="" />
                <span class="text-sm">All</span>
              </Label>
              <Label
                v-for="option in flavourOpts"
                :key="option.id"
                class="flex items-center gap-2 cursor-pointer"
                :for="`flavour-${option.id}`"
              >
                <RadioGroupItem :id="`flavour-${option.id}`" :value="option.id" />
                <span class="text-sm">{{ option.label }}</span>
              </Label>
            </div>
          </RadioGroup>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <!-- Action Buttons (only show in mobile) -->
    <div v-if="layout === 'grid'" class="flex items-center gap-2 pt-2">
      <Button @click="onApply" class="flex-1">
        Apply Filters
      </Button>
      <Button variant="outline" @click="onClear" class="flex-1">
        Clear All
      </Button>
    </div>
  </div>
</template>

<style scoped></style>
