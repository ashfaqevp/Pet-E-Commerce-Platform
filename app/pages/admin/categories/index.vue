<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Categories',
})

import { CATEGORY_CONFIG } from '~/domain/categories/category.config'
import type { CategoryOption, CategoryRule } from '~/domain/categories/category.types'

type PetId = CategoryOption['id']
type TypeId = CategoryRule['options'][number]['id']
type AgeId = CategoryRule['options'][number]['id']
type UnitId = CategoryOption['id']
type SizeId = CategoryRule['options'][number]['id']
type FlavourId = CategoryRule['options'][number]['id']

const selectedPet = ref<PetId | null>(null)
const selectedType = ref<TypeId | null>(null)
const selectedAge = ref<AgeId | null>(null)
const selectedUnit = ref<UnitId | null>(null)
const selectedSize = ref<SizeId | null>(null)
const selectedFlavour = ref<FlavourId | null>(null)

function getRuleOptions(
  rules: ReadonlyArray<CategoryRule> | undefined,
  context: Record<string, string | null>
): readonly { id: string; label: string }[] {
  if (!rules) return []
  const result: { id: string; label: string }[] = []
  for (const r of rules) {
    const v = context[r.when.category]
    if (v && r.when.values.includes(v)) result.push(...r.options)
  }
  return result
}

const typeOptions = computed(() => {
  if (!selectedPet.value) return [] as readonly { id: string; label: string }[]
  return getRuleOptions(CATEGORY_CONFIG.type.rules, { pet: selectedPet.value })
})
const ageOptions = computed(() => {
  if (!selectedPet.value) return [] as readonly { id: string; label: string }[]
  return getRuleOptions(CATEGORY_CONFIG.age.rules, { pet: selectedPet.value })
})
const sizeOptions = computed(() => {
  if (!selectedUnit.value) return [] as readonly { id: string; label: string }[]
  return getRuleOptions(CATEGORY_CONFIG.size.rules, { unit: selectedUnit.value })
})
const flavourOptions = computed(() => {
  if (!selectedType.value) return [] as readonly { id: string; label: string }[]
  return getRuleOptions(CATEGORY_CONFIG.flavour.rules, { type: selectedType.value })
})

const isPetRequired = true
const isTypeRequired = true
const isAgeRequired = computed(() => {
  if (!selectedPet.value) return false
  return CATEGORY_CONFIG.age.requiredWhen?.some((w) => w.category === 'pet' && w.values.includes(selectedPet.value as string)) ?? false
})
const isSizeRequired = computed(() => {
  if (!selectedUnit.value) return false
  return CATEGORY_CONFIG.size.requiredWhen?.some((w) => w.category === 'unit' && w.values.includes(selectedUnit.value as string)) ?? false
})
const isFlavourRequired = computed(() => {
  if (!selectedType.value) return false
  return CATEGORY_CONFIG.flavour.requiredWhen?.some((w) => w.category === 'type' && w.values.includes(selectedType.value as string)) ?? false
})

watch(selectedPet, () => {
  selectedType.value = null
  selectedAge.value = null
  selectedFlavour.value = null
})
watch(selectedUnit, () => {
  selectedSize.value = null
})

const requiredKeys = computed(() => {
  const keys: string[] = []
  if (isPetRequired) keys.push('pet')
  if (isTypeRequired) keys.push('type')
  if (isAgeRequired.value) keys.push('age')
  if (isSizeRequired.value) keys.push('size')
  if (isFlavourRequired.value) keys.push('flavour')
  return keys
})

const filledRequiredKeys = computed(() => {
  const map: Record<string, string | null> = {
    pet: selectedPet.value,
    type: selectedType.value,
    age: selectedAge.value,
    size: selectedSize.value,
    flavour: selectedFlavour.value,
  }
  return requiredKeys.value.filter((k) => !!map[k])
})

const completeness = computed(() => {
  const total = requiredKeys.value.length
  const done = filledRequiredKeys.value.length
  return total === 0 ? 100 : Math.round((done / total) * 100)
})

const resetAll = () => {
  selectedPet.value = null
  selectedType.value = null
  selectedAge.value = null
  selectedUnit.value = null
  selectedSize.value = null
  selectedFlavour.value = null
}

const formatLabel = (text: string) => text.replace(/([a-z])([A-Z])/g, '$1 $2')

const selectedTab = ref('explorer')
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div class="flex items-center gap-2">
        <!-- <Badge class="bg-[#0f766e] text-white">Classification</Badge>
        <span class="text-sm text-muted-foreground">Define how products are categorized</span> -->
      </div>
      <div class="flex items-center gap-2">
        <Button v-if="selectedTab === 'explorer'" variant="secondary" class="bg-secondary text-white" @click="resetAll">
          <Icon name="lucide:rotate-ccw" class="h-4 w-4 mr-2" />
          Reset All
        </Button>
      </div>
    </div>

    <Tabs v-model="selectedTab" defaultValue="explorer" class="w-full">
      <TabsList class="w-full justify-start h-12">
        <TabsTrigger value="definitions">All Categories</TabsTrigger>
        <TabsTrigger value="explorer">Explorer</TabsTrigger>
      </TabsList>

      <TabsContent value="explorer" class="space-y-4">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card class="lg:col-span-2">
            <CardHeader>
              <CardTitle class="text-[#0f766e]">Classification Explorer</CardTitle>
              <CardDescription />
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label>Pet Type</Label>
                    <Badge :class="isPetRequired ? 'bg-[#FF9500] text-white' : 'bg-muted'">Required</Badge>
                  </div>
                  <Select v-model="selectedPet">
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="Select pet type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Pet Type</SelectLabel>
                        <SelectItem v-for="o in CATEGORY_CONFIG.pet.options" :key="o.id" :value="o.id">{{ o.label }}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label>Product Type</Label>
                    <Badge :class="isTypeRequired ? 'bg-[#FF9500] text-white' : 'bg-muted'">Required</Badge>
                  </div>
                  <Select v-model="selectedType" :disabled="!selectedPet || typeOptions.length === 0">
                    <SelectTrigger class="w-full">
                      <SelectValue :placeholder="!selectedPet ? 'Select pet first' : 'Select product type'" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Product Type</SelectLabel>
                        <SelectItem v-for="o in typeOptions" :key="o.id" :value="o.id">{{ o.label }}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label>Age Group</Label>
                    <Badge :class="isAgeRequired ? 'bg-[#FF9500] text-white' : 'bg-muted'">{{ isAgeRequired ? 'Required Now' : 'Optional' }}</Badge>
                  </div>
                  <Select v-model="selectedAge" :disabled="!selectedPet || ageOptions.length === 0">
                    <SelectTrigger class="w-full">
                      <SelectValue :placeholder="!selectedPet ? 'Select pet first' : (ageOptions.length ? 'Select age group' : 'Not applicable')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Age Group</SelectLabel>
                        <SelectItem v-for="o in ageOptions" :key="o.id" :value="o.id">{{ o.label }}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label>Unit</Label>
                    <Badge class="bg-muted">Optional</Badge>
                  </div>
                  <Select v-model="selectedUnit">
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Unit</SelectLabel>
                        <SelectItem v-for="o in CATEGORY_CONFIG.unit.options" :key="o.id" :value="o.id">{{ o.label }}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label>Size</Label>
                    <Badge :class="isSizeRequired ? 'bg-[#FF9500] text-white' : 'bg-muted'">{{ isSizeRequired ? 'Required Now' : 'Optional' }}</Badge>
                  </div>
                  <Select v-model="selectedSize" :disabled="!selectedUnit || sizeOptions.length === 0">
                    <SelectTrigger class="w-full">
                      <SelectValue :placeholder="!selectedUnit ? 'Select unit first' : (sizeOptions.length ? 'Select size' : 'Not applicable')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Size</SelectLabel>
                        <SelectItem v-for="o in sizeOptions" :key="o.id" :value="o.id">{{ o.label }}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label>Flavour</Label>
                    <Badge :class="isFlavourRequired ? 'bg-[#FF9500] text-white' : 'bg-muted'">{{ isFlavourRequired ? 'Required Now' : 'Optional' }}</Badge>
                  </div>
                  <Select v-model="selectedFlavour" :disabled="!selectedType || flavourOptions.length === 0">
                    <SelectTrigger class="w-full">
                      <SelectValue :placeholder="!selectedType ? 'Select product type first' : (flavourOptions.length ? 'Select flavour' : 'Not applicable')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Flavour</SelectLabel>
                        <SelectItem v-for="o in flavourOptions" :key="o.id" :value="o.id">{{ o.label }}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Alert v-if="requiredKeys.length && filledRequiredKeys.length < requiredKeys.length" class="border-[#FF9500]">
                <AlertTitle class="text-[#FF9500]">Missing required fields</AlertTitle>
                <AlertDescription>
                  <div class="flex flex-wrap gap-2 mt-2">
                    <Badge v-for="k in requiredKeys.filter(k => !filledRequiredKeys.includes(k))" :key="k" variant="outline" class="border-[#FF9500] text-[#FF9500]">{{ k }}</Badge>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-[#0f766e]">Summary</CardTitle>
              <CardDescription />
            </CardHeader>
            <CardContent class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm">Completeness</span>
                <Badge variant="outline" class="border-[#0f766e] text-[#0f766e]">{{ filledRequiredKeys.length }}/{{ requiredKeys.length }} • {{ completeness }}%</Badge>
              </div>
              <div class="space-y-2">
                <div class="flex items-center justify-between"><span class="text-sm">Pet</span><Badge variant="outline">{{ selectedPet || '—' }}</Badge></div>
                <div class="flex items-center justify-between"><span class="text-sm">Type</span><Badge variant="outline">{{ selectedType || '—' }}</Badge></div>
                <div class="flex items-center justify-between"><span class="text-sm">Age</span><Badge variant="outline">{{ selectedAge || '—' }}</Badge></div>
                <div class="flex items-center justify-between"><span class="text-sm">Unit</span><Badge variant="outline">{{ selectedUnit || '—' }}</Badge></div>
                <div class="flex items-center justify-between"><span class="text-sm">Size</span><Badge variant="outline">{{ selectedSize || '—' }}</Badge></div>
                <div class="flex items-center justify-between"><span class="text-sm">Flavour</span><Badge variant="outline">{{ selectedFlavour || '—' }}</Badge></div>
              </div>
            </CardContent>
            <CardFooter class="flex items-center justify-end">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button variant="outline" class="border-[#0f766e] text-[#0f766e]">Copy classification</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Use selections to tag products</p>
                </TooltipContent>
              </Tooltip>
            </CardFooter>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="definitions" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle class="text-[#0f766e]">Category Definitions</CardTitle>
            <CardDescription />
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="pet">
                <AccordionTrigger>Pet Type</AccordionTrigger>
                <AccordionContent>
                  <div class="flex items-center gap-2 mb-2"><Badge variant="outline">Required</Badge></div>
                  <div class="flex flex-wrap gap-2">
                    <Badge v-for="o in CATEGORY_CONFIG.pet.options" :key="o.id" variant="outline">{{ o.label }}</Badge>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="type">
                <AccordionTrigger>Product Type</AccordionTrigger>
                <AccordionContent>
                  <div class="flex items-center gap-2 mb-2"><Badge variant="outline">Depends on: Pet</Badge><Badge variant="outline">Required</Badge></div>
                  <div class="space-y-3">
                    <div v-for="r in CATEGORY_CONFIG.type.rules" :key="r.when.values.join(',')" class="space-y-2">
                      <div class="text-xs text-muted-foreground">When Pet ∈ {{ r.when.values.join(', ') }}</div>
                      <div class="flex flex-wrap gap-2">
                        <Badge v-for="o in r.options" :key="o.id" variant="outline">{{ o.label }}</Badge>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="age">
                <AccordionTrigger>Age Group</AccordionTrigger>
                <AccordionContent>
                  <div class="flex items-center gap-2 mb-2"><Badge variant="outline">Depends on: Pet</Badge></div>
                  <div class="space-y-3">
                    <div v-for="r in CATEGORY_CONFIG.age.rules" :key="r.when.values.join(',')" class="space-y-2">
                      <div class="text-xs text-muted-foreground">When Pet ∈ {{ r.when.values.join(', ') }}</div>
                      <div class="flex flex-wrap gap-2">
                        <Badge v-for="o in r.options" :key="o.id" variant="outline">{{ o.label }}</Badge>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="unit">
                <AccordionTrigger>Unit</AccordionTrigger>
                <AccordionContent>
                  <div class="flex flex-wrap gap-2">
                    <Badge v-for="o in CATEGORY_CONFIG.unit.options" :key="o.id" variant="outline">{{ o.label }}</Badge>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="size">
                <AccordionTrigger>Size</AccordionTrigger>
                <AccordionContent>
                  <div class="flex items-center gap-2 mb-2"><Badge variant="outline">Depends on: Unit</Badge></div>
                  <div class="space-y-3">
                    <div v-for="r in CATEGORY_CONFIG.size.rules" :key="r.when.values.join(',')" class="space-y-2">
                      <div class="text-xs text-muted-foreground">When Unit ∈ {{ r.when.values.join(', ') }}</div>
                      <div class="flex flex-wrap gap-2">
                        <Badge v-for="o in r.options" :key="o.id" variant="outline">{{ o.label }}</Badge>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="flavour">
                <AccordionTrigger>Flavour</AccordionTrigger>
                <AccordionContent>
                  <div class="flex items-center gap-2 mb-2"><Badge variant="outline">Depends on: Product Type</Badge></div>
                  <div class="space-y-3">
                    <div v-for="r in CATEGORY_CONFIG.flavour.rules" :key="r.when.values.join(',')" class="space-y-2">
                      <div class="text-xs text-muted-foreground">When Type ∈ {{ r.when.values.join(', ') }}</div>
                      <div class="flex flex-wrap gap-2">
                        <Badge v-for="o in r.options" :key="o.id" variant="outline">{{ o.label }}</Badge>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
