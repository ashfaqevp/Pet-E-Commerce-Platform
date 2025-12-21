<script setup lang="ts">
import { useInfiniteScroll } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import ProductCard from '~/components/product/ProductCard.vue'
import ProductFilters from '~/components/products/ProductFilters.vue'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import type { CategoryKey, CategoryRule, CategoryOption } from '@/domain/categories/category.types'
import { CATEGORY_CONFIG } from '~/domain/categories/category.config'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'Products' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Products'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Products' }]

interface ProductRow {
  id: string
  name: string
  pet_type?: string | null
  product_type?: string | null
  age?: string | null
  unit?: string | null
  size?: string | null
  flavour?: string | null
  retail_price?: number | null
  default_rating?: number | null
  thumbnail_url?: string | null
  is_active?: boolean | null
}

interface CardProduct {
  id: string
  name: string
  brand: string
  price: number
  rating: number
  discount?: number
  image?: string
}

const supabase = useSupabaseClient()
const router = useRouter()

// Transform function for route query arrays
const toStringArray = (val: string | string[] | null | undefined): string[] => {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

// Route query parameters - using useRouteQuery for automatic URL sync
const qPet = useRouteQuery<string[]>('pet', [], { transform: toStringArray })
const qType = useRouteQuery<string[]>('type', [], { transform: toStringArray })
const qAge = useRouteQuery<string[]>('age', [], { transform: toStringArray })
const qUnit = useRouteQuery<string[]>('unit', [], { transform: toStringArray })
const qSize = useRouteQuery<string[]>('size', [], { transform: toStringArray })
const qFlavour = useRouteQuery<string[]>('flavour', [], { transform: toStringArray })

// State
const products = ref<CardProduct[]>([])
const page = ref(1)
const pageSize = 12
const totalCount = ref(0)
const loading = ref(false)
const initialLoading = ref(true)
const error = ref<string | null>(null)
const listContainer = ref<HTMLElement | null>(null)
const mobileFilterOpen = ref(false)

// Computed filters object
const filters = computed(() => ({
  pet: qPet.value,
  type: qType.value,
  age: qAge.value,
  unit: qUnit.value,
  size: qSize.value,
  flavour: qFlavour.value,
}))

// Create a stable filter signature for comparison
const filterSignature = computed(() => {
  return JSON.stringify({
    pet: [...qPet.value].sort(),
    type: [...qType.value].sort(),
    age: [...qAge.value].sort(),
    unit: [...qUnit.value].sort(),
    size: [...qSize.value].sort(),
    flavour: [...qFlavour.value].sort(),
  })
})

// Computed filter options based on dependencies
const typeOpts = computed(() => {
  return getFilteredOptions(CATEGORY_CONFIG.type.rules, qPet.value)
})

const ageOpts = computed(() => {
  return getFilteredOptions(CATEGORY_CONFIG.age.rules, qPet.value)
})

const sizeOpts = computed(() => {
  return getFilteredOptions(CATEGORY_CONFIG.size.rules, qUnit.value)
})

const flavourOpts = computed(() => {
  return getFilteredOptions(CATEGORY_CONFIG.flavour.rules, qType.value)
})

function getFilteredOptions(rules: readonly CategoryRule[] | undefined, selected: string[]): CategoryOption[] {
  if (!rules) return []
  
  // If nothing selected, show all unique options
  if (!selected.length) {
    const allOptions = rules.flatMap(r => r.options)
    return Array.from(new Map(allOptions.map(o => [o.id, o])).values())
  }
  
  // Filter options based on selected values
  const selectedSet = new Set(selected)
  const matchingRules = rules.filter(rule => 
    rule.when.values.some(v => selectedSet.has(v))
  )
  
  const options = matchingRules.flatMap(r => r.options)
  return Array.from(new Map(options.map(o => [o.id, o])).values())
}

// Map database row to card product
function mapProductRow(row: ProductRow): CardProduct {
  return {
    id: String(row.id),
    name: row.name,
    brand: '',
    price: row.retail_price ?? 0,
    rating: row.default_rating ?? 0,
    discount: 0,
    image: row.thumbnail_url || undefined,
  }
}

// Fetch products from Supabase
async function fetchProducts(pageNum: number, resetList = false) {
  try {
    if (resetList) {
      loading.value = true
      products.value = []
    } else {
      loading.value = true
    }
    
    error.value = null

    // Build query
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Apply filters
    if (qPet.value.length > 0) {
      query = query.in('pet_type', qPet.value)
    }
    if (qType.value.length > 0) {
      query = query.in('product_type', qType.value)
    }
    if (qAge.value.length > 0) {
      query = query.in('age', qAge.value)
    }
    if (qUnit.value.length > 0) {
      query = query.in('unit', qUnit.value)
    }
    if (qSize.value.length > 0) {
      query = query.in('size', qSize.value)
    }
    if (qFlavour.value.length > 0) {
      query = query.in('flavour', qFlavour.value)
    }

    // Pagination
    const from = (pageNum - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error: fetchError, count } = await query

    if (fetchError) {
      throw fetchError
    }

    totalCount.value = count ?? 0

    if (data) {
      const newProducts = data.map(mapProductRow)
      
      if (resetList) {
        products.value = newProducts
      } else {
        // Avoid duplicates when appending
        const existingIds = new Set(products.value.map(p => p.id))
        const uniqueNew = newProducts.filter(p => !existingIds.has(p.id))
        products.value = [...products.value, ...uniqueNew]
      }
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to fetch products'
    console.error('Fetch error:', e)
  } finally {
    loading.value = false
    initialLoading.value = false
  }
}

// Load initial data
async function loadInitialProducts() {
  page.value = 1
  await fetchProducts(1, true)
}

// Load next page
async function loadNextPage() {
  if (loading.value) return
  if (products.value.length >= totalCount.value) return
  
  page.value++
  await fetchProducts(page.value, false)
}

// Check if more products available
const hasMore = computed(() => {
  return products.value.length < totalCount.value
})

// Setup infinite scroll
useInfiniteScroll(
  listContainer,
  () => {
    if (hasMore.value && !loading.value) {
      loadNextPage()
    }
  },
  { distance: 300 }
)

// Watch filter changes and reset
let lastFilterSig = filterSignature.value
watch(filterSignature, async (newSig) => {
  if (newSig !== lastFilterSig) {
    lastFilterSig = newSig
    await loadInitialProducts()
  }
})

// Clear dependent filters when parent changes
watch(qPet, () => {
  qType.value = []
  qAge.value = []
}, { deep: true })

watch(qType, () => {
  qFlavour.value = []
}, { deep: true })

watch(qUnit, () => {
  qSize.value = []
}, { deep: true })

// Toggle filter
function toggleFilter(key: CategoryKey, id: string, checked: boolean) {
  const filterMap: Record<CategoryKey, typeof qPet> = {
    pet: qPet,
    type: qType,
    age: qAge,
    unit: qUnit,
    size: qSize,
    flavour: qFlavour,
  }
  
  const currentFilter = filterMap[key]
  
  if (checked) {
    if (!currentFilter.value.includes(id)) {
      currentFilter.value = [...currentFilter.value, id]
    }
  } else {
    currentFilter.value = currentFilter.value.filter(v => v !== id)
  }
}

// Clear all filters
function clearAllFilters() {
  qPet.value = []
  qType.value = []
  qAge.value = []
  qUnit.value = []
  qSize.value = []
  qFlavour.value = []
}

// Apply filters (for mobile)
function applyFilters() {
  mobileFilterOpen.value = false
}

// Initial load on mount
onMounted(() => {
  loadInitialProducts()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <PageHeader :title="'Products'" :items="breadcrumbs" />
    <div class="mt-4">
      <!-- Mobile Filter Button -->
      <div class="flex items-center justify-end mb-4">
        <Sheet v-model:open="mobileFilterOpen">
          <SheetTrigger as-child>
            <Button variant="outline" class="md:hidden gap-2">
              <Icon name="lucide:sliders-horizontal" class="h-4 w-4" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" :show-close-button="false" class="w-full p-4 sm:p-6 pt-0 sm:pt-0 h-[80vh] max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] rounded-t-lg">
            <SheetHeader class="sticky top-0 z-10 bg-background border-b px-1 py-2 pt-4">
              <div class="flex items-center justify-between">
                <SheetTitle class="text-[#0f766e]">Filters</SheetTitle>
                <SheetClose as-child>
                  <Button variant="ghost" size="icon" aria-label="Close filters">
                    <Icon name="lucide:x" class="h-5 w-5" />
                  </Button>
                </SheetClose>
              </div>
              <SheetDescription />
            </SheetHeader>
            <div class="space-y-4 py-4">
              <ProductFilters
                :filters="filters"
                :type-opts="typeOpts"
                :age-opts="ageOpts"
                :size-opts="sizeOpts"
                :flavour-opts="flavourOpts"
                :toggle-filter="toggleFilter"
                :on-apply="applyFilters"
                :on-clear="clearAllFilters"
                layout="grid"
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

    <!-- Main Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Desktop Filters Sidebar -->
      <Card class="hidden lg:block h-max lg:top-24">
        <CardHeader>
          <CardTitle class="text-[#0f766e]">Filters</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <ProductFilters
            :filters="filters"
            :type-opts="typeOpts"
            :age-opts="ageOpts"
            :size-opts="sizeOpts"
            :flavour-opts="flavourOpts"
            :toggle-filter="toggleFilter"
            :on-apply="applyFilters"
            :on-clear="clearAllFilters"
            layout="column"
          />
        </CardContent>
      </Card>

      <!-- Products List -->
      <div class="lg:col-span-3">
        <!-- Active Filter Badges -->
        <div v-if="Object.values(filters).some(f => f.length > 0)" class="flex flex-wrap gap-2 mb-4">
          <Badge v-for="v in filters.pet" :key="`pet-${v}`" variant="outline">
            Pet: {{ v }}
          </Badge>
          <Badge v-for="v in filters.type" :key="`type-${v}`" variant="outline">
            Type: {{ v }}
          </Badge>
          <Badge v-for="v in filters.age" :key="`age-${v}`" variant="outline">
            Age: {{ v }}
          </Badge>
          <Badge v-for="v in filters.unit" :key="`unit-${v}`" variant="outline">
            Unit: {{ v }}
          </Badge>
          <Badge v-for="v in filters.size" :key="`size-${v}`" variant="outline">
            Size: {{ v }}
          </Badge>
          <Badge v-for="v in filters.flavour" :key="`flavour-${v}`" variant="outline">
            Flavour: {{ v }}
          </Badge>
        </div>

        <!-- Error Alert -->
        <Alert v-if="error" variant="destructive" class="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>

        <!-- Products Grid -->
        <div ref="listContainer" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
          <!-- Loading Skeletons -->
          <template v-if="initialLoading">
            <div v-for="i in 6" :key="`skeleton-${i}`" class="w-full">
              <Skeleton class="h-64 w-full rounded-lg" />
            </div>
          </template>

          <!-- Product Cards -->
          <template v-else>
            <ProductCard
              v-for="product in products"
              :key="product.id"
              :product="product"
              @add="() => router.push(`/product/${product.id}`)"
            />
          </template>
        </div>

        <!-- Loading More Indicator -->
        <div v-if="loading && products.length > 0" class="mt-6 flex justify-center">
          <Skeleton class="h-12 w-full max-w-sm rounded-lg" />
        </div>

        <!-- Empty State -->
        <div v-if="!initialLoading && products.length === 0" class="mt-8">
          <Card>
            <CardContent class="py-12">
              <div class="text-center text-muted-foreground">
                <Icon name="lucide:package-open" class="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p class="text-lg font-medium mb-1">No products found</p>
                <p class="text-sm">Try adjusting your filters to see more results</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Products Counter -->
        <CardFooter class="mt-6 justify-center">
          <Badge variant="outline" class="border-[#0f766e] text-[#0f766e]">
            Showing {{ products.length }} of {{ totalCount }} products
          </Badge>
        </CardFooter>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped></style>
