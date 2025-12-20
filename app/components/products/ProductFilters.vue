<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import type { CategoryKey, CategoryOption } from '@/domain/categories/category.types'
import { CATEGORY_CONFIG } from '~/domain/categories/category.config'

interface Props {
  filters: Record<CategoryKey, string[]>
  typeOpts: CategoryOption[]
  ageOpts: CategoryOption[]
  sizeOpts: CategoryOption[]
  flavourOpts: CategoryOption[]
  toggleFilter: (key: CategoryKey, id: string, checked: boolean) => void
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

// Helper to check if filter is active
function isFilterActive(key: CategoryKey, id: string): boolean {
  return props.filters[key]?.includes(id) ?? false
}

// Helper to handle checkbox change
function handleCheckboxChange(key: CategoryKey, id: string, checked: boolean | 'indeterminate') {
  if (checked === 'indeterminate') return
  props.toggleFilter(key, id, checked)
}
</script>

<template>
  <div class="space-y-4">
    <Accordion type="multiple" class="space-y-2" :default-value="['pet']">
      <!-- Pet Filter -->
      <AccordionItem value="pet">
        <AccordionTrigger class="text-sm font-medium">
          Pet Type
          <Badge v-if="filters.pet.length > 0" variant="secondary" class="ml-2">
            {{ filters.pet.length }}
          </Badge>
        </AccordionTrigger>
        <AccordionContent>
          <div :class="containerClass">
            <Label
              v-for="option in CATEGORY_CONFIG.pet.options"
              :key="option.id"
              class="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                :id="`pet-${option.id}`"
                :checked="isFilterActive('pet', option.id)"
                @update:checked="(checked) => handleCheckboxChange('pet', option.id, checked)"
              />
              <span class="text-sm">{{ option.label }}</span>
            </Label>
          </div>
        </AccordionContent>
      </AccordionItem>

      <!-- Type Filter -->
      <AccordionItem value="type" :disabled="typeOpts.length === 0">
        <AccordionTrigger class="text-sm font-medium">
          Product Type
          <Badge v-if="filters.type.length > 0" variant="secondary" class="ml-2">
            {{ filters.type.length }}
          </Badge>
        </AccordionTrigger>
        <AccordionContent>
          <div v-if="typeOpts.length === 0" class="text-sm text-muted-foreground py-2">
            Select a pet type first
          </div>
          <div v-else :class="containerClass">
            <Label
              v-for="option in typeOpts"
              :key="option.id"
              class="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                :id="`type-${option.id}`"
                :checked="isFilterActive('type', option.id)"
                @update:checked="(checked) => handleCheckboxChange('type', option.id, checked)"
              />
              <span class="text-sm">{{ option.label }}</span>
            </Label>
          </div>
        </AccordionContent>
      </AccordionItem>

      <!-- Age Filter -->
      <AccordionItem value="age" :disabled="ageOpts.length === 0">
        <AccordionTrigger class="text-sm font-medium">
          Age Group
          <Badge v-if="filters.age.length > 0" variant="secondary" class="ml-2">
            {{ filters.age.length }}
          </Badge>
        </AccordionTrigger>
        <AccordionContent>
          <div v-if="ageOpts.length === 0" class="text-sm text-muted-foreground py-2">
            Select a pet type first
          </div>
          <div v-else :class="containerClass">
            <Label
              v-for="option in ageOpts"
              :key="option.id"
              class="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                :id="`age-${option.id}`"
                :checked="isFilterActive('age', option.id)"
                @update:checked="(checked) => handleCheckboxChange('age', option.id, checked)"
              />
              <span class="text-sm">{{ option.label }}</span>
            </Label>
          </div>
        </AccordionContent>
      </AccordionItem>

      <!-- Unit Filter -->
      <AccordionItem value="unit">
        <AccordionTrigger class="text-sm font-medium">
          Unit
          <Badge v-if="filters.unit.length > 0" variant="secondary" class="ml-2">
            {{ filters.unit.length }}
          </Badge>
        </AccordionTrigger>
        <AccordionContent>
          <div :class="containerClass">
            <Label
              v-for="option in CATEGORY_CONFIG.unit.options"
              :key="option.id"
              class="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                :id="`unit-${option.id}`"
                :checked="isFilterActive('unit', option.id)"
                @update:checked="(checked) => handleCheckboxChange('unit', option.id, checked)"
              />
              <span class="text-sm">{{ option.label }}</span>
            </Label>
          </div>
        </AccordionContent>
      </AccordionItem>

      <!-- Size Filter -->
      <AccordionItem value="size" :disabled="sizeOpts.length === 0">
        <AccordionTrigger class="text-sm font-medium">
          Size
          <Badge v-if="filters.size.length > 0" variant="secondary" class="ml-2">
            {{ filters.size.length }}
          </Badge>
        </AccordionTrigger>
        <AccordionContent>
          <div v-if="sizeOpts.length === 0" class="text-sm text-muted-foreground py-2">
            Select a unit first
          </div>
          <div v-else :class="containerClass">
            <Label
              v-for="option in sizeOpts"
              :key="option.id"
              class="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                :id="`size-${option.id}`"
                :checked="isFilterActive('size', option.id)"
                @update:checked="(checked) => handleCheckboxChange('size', option.id, checked)"
              />
              <span class="text-sm">{{ option.label }}</span>
            </Label>
          </div>
        </AccordionContent>
      </AccordionItem>

      <!-- Flavour Filter -->
      <AccordionItem value="flavour" :disabled="flavourOpts.length === 0">
        <AccordionTrigger class="text-sm font-medium">
          Flavour
          <Badge v-if="filters.flavour.length > 0" variant="secondary" class="ml-2">
            {{ filters.flavour.length }}
          </Badge>
        </AccordionTrigger>
        <AccordionContent>
          <div v-if="flavourOpts.length === 0" class="text-sm text-muted-foreground py-2">
            Select a product type first
          </div>
          <div v-else :class="containerClass">
            <Label
              v-for="option in flavourOpts"
              :key="option.id"
              class="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                :id="`flavour-${option.id}`"
                :checked="isFilterActive('flavour', option.id)"
                @update:checked="(checked) => handleCheckboxChange('flavour', option.id, checked)"
              />
              <span class="text-sm">{{ option.label }}</span>
            </Label>
          </div>
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