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
import { useSeoMeta } from '#imports'

definePageMeta({ layout: 'default' })
useHead({ title: 'Products' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Products'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Products' }]

useSeoMeta({
  title: 'Products | Buypets.om',
  ogTitle: 'Products | Buypets.om',
  description: 'Browse pet products by category, flavour, size and more.',
  ogDescription: 'Browse pet products by category, flavour, size and more.',
  ogImage: '/favicon-96x96.png',
  twitterCard: 'summary_large_image',
})

interface ProductRow {
  id: string
  name: string
  pet_type?: string[] | null
  product_type?: string | null
  brand?: string | null
  age?: string | null
  unit?: string | null
  size?: string | null
  flavour?: string | null
  retail_price?: number | null
  wholesale_price?: number | null
  default_rating?: number | null
  thumbnail_url?: string | null
  is_active?: boolean | null
  label?: string | null
  row_index?: number | null
}

interface CardProduct {
  id: string
  name: string
  brand: string
  price: number
  rating: number
  discount?: number
  image?: string
  retail_price?: number | null
  wholesale_price?: number | null
}

const supabase = useSupabaseClient()
const router = useRouter()

// Transform function for route query arrays
const toStringArray = (val: string | string[] | null | undefined): string[] => {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

// Route query parameters - single selection per filter
const qPet = useRouteQuery<string>('pet', '')
const qType = useRouteQuery<string>('type', '')
const qAge = useRouteQuery<string>('age', '')
const qFlavour = useRouteQuery<string>('flavour', '')
const qBrand = useRouteQuery<string>('brand', '')

// State
const products = ref<CardProduct[]>([])
const page = ref(1)
const pageSize = 12
const totalCount = ref(0)
const initialLoading = computed(() => pending.value && products.value.length === 0)
const loading = computed(() => pending.value && products.value.length > 0)
const listContainer = ref<HTMLElement | null>(null)
const mobileFilterOpen = ref(false)

// Computed filters object
const filters = computed(() => ({
  pet: qPet.value || '',
  type: qType.value || '',
  age: qAge.value || '',
  flavour: qFlavour.value || '',
  brand: qBrand.value || '',
}))
const filterSignature = computed(() => {
  return JSON.stringify({
    pet: qPet.value || '',
    type: qType.value || '',
    age: qAge.value || '',
    flavour: qFlavour.value || '',
    brand: qBrand.value || '',
  })
})

// Computed filter options based on dependencies
const typeOpts = computed(() => {
  return (CATEGORY_CONFIG.type.options ?? []) as CategoryOption[]
})

const ageOpts = computed(() => {
  return qPet.value
    ? getFilteredOptions(CATEGORY_CONFIG.age.rules, qPet.value)
    : []
})

const flavourOpts = computed(() => {
  return qType.value
    ? getFilteredOptions(CATEGORY_CONFIG.flavour.rules, qType.value)
    : []
})

const { data: brandData, pending: brandPending, error: brandError, refresh: refreshBrands } = await useLazyAsyncData(
  'public-brands',
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
const brandOpts = computed(() => (brandData.value || []) as string[])

function getFilteredOptions(rules: readonly CategoryRule[] | undefined, selected: string | string[]): CategoryOption[] {
  if (!rules) return []
  const selectedArr = Array.isArray(selected) ? selected : (selected ? [selected] : [])
  if (selectedArr.length === 0) {
    const allOptions = rules.flatMap(r => r.options)
    return Array.from(new Map(allOptions.map(o => [o.id, o])).values())
  }
  const selectedSet = new Set(selectedArr)
  const matchingRules = rules.filter(rule => rule.when.values.some(v => selectedSet.has(v)))
  const options = matchingRules.flatMap(r => r.options)
  return Array.from(new Map(options.map(o => [o.id, o])).values())
}

function getLabelFromRules(rules: readonly CategoryRule[] | undefined, id: string): string {
  if (!rules || !id) return ''
  const all = rules.flatMap(r => r.options)
  return all.find(o => o.id === id)?.label ?? ''
}

function getLabel(category: CategoryKey, id: string): string {
  if (!id) return ''
  if (category === 'pet') return CATEGORY_CONFIG.pet.options?.find(o => o.id === id)?.label ?? ''
  if (category === 'type') return CATEGORY_CONFIG.type.options?.find(o => o.id === id)?.label ?? ''
  if (category === 'age') return getLabelFromRules(CATEGORY_CONFIG.age.rules, id)
  if (category === 'flavour') return getLabelFromRules(CATEGORY_CONFIG.flavour.rules, id)
  return ''
}

const selectedLabels = computed(() => ({
  pet: getLabel('pet', qPet.value || ''),
  type: getLabel('type', qType.value || ''),
  age: getLabel('age', qAge.value || ''),
  flavour: getLabel('flavour', qFlavour.value || ''),
  brand: qBrand.value || '',
}))

const summaryParts = computed(() => {
  const parts: string[] = []
  const term = (qSearch.value || '').trim()
  if (term) parts.push(`Search: "${term}"`)
  const lbl = selectedLabels.value
  if (filters.value.pet) parts.push(`Pet: ${lbl.pet}`)
  if (filters.value.type) parts.push(`Type: ${lbl.type}`)
  if (filters.value.age) parts.push(`Age: ${lbl.age}`)
  if (filters.value.flavour) parts.push(`Flavour: ${lbl.flavour}`)
  if (filters.value.brand) parts.push(`Brand: ${lbl.brand}`)
  return parts
})

const summaryText = computed(() => summaryParts.value.join(' • '))
const hasActiveCriteria = computed(() => summaryParts.value.length > 0)

// Map database row to card product
function mapProductRow(row: ProductRow): CardProduct {
  return {
    id: String(row.id),
    name: row.name,
    brand: String((row as unknown as { brand?: string | null }).brand || ''),
    price: row.retail_price ?? 0,
    rating: row.default_rating ?? 0,
    discount: 0,
    image: row.thumbnail_url || undefined,
    retail_price: row.retail_price ?? null,
    wholesale_price: row.wholesale_price ?? null,
  }
}

// Search and featured query params
const qSearch = useRouteQuery<string>('q', '')
const qFeatured = useRouteQuery<string>('featured', '')

const params = computed(() => ({
  pet: qPet.value || '',
  type: qType.value || '',
  age: qAge.value || '',
  flavour: qFlavour.value || '',
  brand: qBrand.value || '',
  search: (qSearch.value || '').trim(),
  featured: qFeatured.value === '1',
  page: page.value,
  pageSize,
}))

const { data: pageData, pending, error, refresh } = await useLazyAsyncData(
  'products-list',
  async () => {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('row_index', { ascending: true })
      .order('id', { ascending: false })

    if (params.value.pet) query = query.contains('pet_type', [params.value.pet])
    if (params.value.type) query = query.eq('product_type', params.value.type)
    if (params.value.age) query = query.eq('age', params.value.age)
    if (params.value.flavour) query = query.eq('flavour', params.value.flavour)
    if (params.value.brand) query = query.eq('brand', params.value.brand)
    if (params.value.featured) query = query.eq('is_featured', true)

    const term = params.value.search
    if (term) {
      const esc = term.replace(/%/g, '\\%').replace(/_/g, '\\_')
      query = query.or(`name.ilike.%${esc}%,label.ilike.%${esc}%,product_type.ilike.%${esc}%,flavour.ilike.%${esc}%,brand.ilike.%${esc}%`)
    }

    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return { items: (data ?? []) as ProductRow[], total: count ?? 0 }
  },
  { watch: [params], server: true }
)

watch(pageData, (val) => {
  if (!val) return
  totalCount.value = val.total
  const newProducts = val.items.map(mapProductRow)
  if (page.value === 1) products.value = newProducts
  else {
    const existing = new Set(products.value.map(p => p.id))
    const unique = newProducts.filter(p => !existing.has(p.id))
    products.value = [...products.value, ...unique]
  }
})

const loadNextPage = async () => {
  if (pending.value) return
  if (products.value.length >= totalCount.value) return
  page.value++
  await refresh()
}


// Check if more products available
const hasMore = computed(() => {
  return products.value.length < totalCount.value
})

// Setup infinite scroll on window
if (process.client) {
  useInfiniteScroll(
    window,
    async () => {
      if (hasMore.value && !pending.value) {
        await loadNextPage()
      }
    },
    {
      distance: 200,
      interval: 300,
      direction: 'bottom',
      canLoadMore: () => products.value.length < totalCount.value && !pending.value,
    }
  )
}

// Watch filter changes and reset
let lastFilterSig = filterSignature.value
watch(filterSignature, async (newSig) => {
  if (newSig !== lastFilterSig) {
    lastFilterSig = newSig
    await resetAndRefresh()
  }
})

// Reset pagination when search query changes
watch(qSearch, async () => {
  await resetAndRefresh()
})

function clearSearchQuery() {
  qSearch.value = ''
}

function clearAllCriteria() {
  qSearch.value = ''
  clearAllFiltersDesktop()
}

// Clear dependent filters when parent changes
watch(qPet, () => {
  qType.value = ''
  qAge.value = ''
})

watch(qType, () => {
  qFlavour.value = ''
})

// Mobile filters local state
const mobileFilters = ref<{ pet: string; type: string; age: string; flavour: string; brand: string }>({
  pet: '',
  type: '',
  age: '',
  flavour: '',
  brand: '',
})

// Initial sync from route to mobile filters and keep in sync when sheet is closed
function syncMobileFromRoute() {
  mobileFilters.value = {
    pet: qPet.value || '',
    type: qType.value || '',
    age: qAge.value || '',
    flavour: qFlavour.value || '',
    brand: qBrand.value || '',
  }
}

onMounted(() => {
  syncMobileFromRoute()
})

watch(filterSignature, () => {
  if (!mobileFilterOpen.value) {
    syncMobileFromRoute()
  }
})

// Dependent clearing for mobile local filters
watch(() => mobileFilters.value.pet, () => {
  mobileFilters.value.type = ''
  mobileFilters.value.age = ''
})

watch(() => mobileFilters.value.type, () => {
  mobileFilters.value.flavour = ''
})

// Toggle filter
function selectFilterDesktop(key: 'pet' | 'type' | 'age' | 'flavour' | 'brand', id: string) {
  if (key === 'pet') qPet.value = id
  else if (key === 'type') qType.value = id
  else if (key === 'age') qAge.value = id
  else if (key === 'flavour') qFlavour.value = id
  else if (key === 'brand') qBrand.value = id
}

function selectFilterMobile(key: 'pet' | 'type' | 'age' | 'flavour' | 'brand', id: string) {
  if (key === 'pet') mobileFilters.value.pet = id
  else if (key === 'type') mobileFilters.value.type = id
  else if (key === 'age') mobileFilters.value.age = id
  else if (key === 'flavour') mobileFilters.value.flavour = id
  else if (key === 'brand') mobileFilters.value.brand = id
}

// Clear all filters
function clearAllFiltersDesktop() {
  qPet.value = ''
  qType.value = ''
  qAge.value = ''
  qFlavour.value = ''
  qBrand.value = ''
}

function clearAllFiltersMobile() {
  mobileFilters.value = { pet: '', type: '', age: '', flavour: '', brand: '' }
}

// Apply filters (for mobile)
function applyFilters() {
  qPet.value = mobileFilters.value.pet || ''
  qType.value = mobileFilters.value.type || ''
  qAge.value = mobileFilters.value.age || ''
  qFlavour.value = mobileFilters.value.flavour || ''
  qBrand.value = mobileFilters.value.brand || ''
  mobileFilterOpen.value = false
}

onMounted(() => { resetAndRefresh() })

const resetAndRefresh = async () => {
  page.value = 1
  products.value = []
  await refresh()
}

const apiError = computed(() => {
  const msg = error.value?.message ?? ''
  if (msg.includes('Range Not Satisfiable')) return null
  return error.value ?? null
})

// Remove custom body scroll locking; use natural page scroll
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
                :filters="mobileFilters"
                :type-opts="CATEGORY_CONFIG.type.options ?? []"
                :age-opts="getFilteredOptions(CATEGORY_CONFIG.age.rules, mobileFilters.pet)"
                :flavour-opts="getFilteredOptions(CATEGORY_CONFIG.flavour.rules, mobileFilters.type)"
                :brand-opts="brandOpts"
                :on-select="selectFilterMobile"
                :on-apply="applyFilters"
                :on-clear="clearAllFiltersMobile"
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
      <!-- <Card class="hidden lg:block lg:sticky lg:top-24 self-start"> -->
        <CardHeader>
          <CardTitle class="text-[#0f766e]">Filters</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <ProductFilters
            :filters="filters"
            :type-opts="typeOpts"
            :age-opts="ageOpts"
            :flavour-opts="flavourOpts"
            :brand-opts="brandOpts"
            :on-select="selectFilterDesktop"
            :on-apply="applyFilters"
            :on-clear="clearAllFiltersDesktop"
            layout="column"
          />
        </CardContent>
      </Card>

      <!-- Products List -->
      <div class="lg:col-span-3">
        <!-- Active Criteria Summary -->
        <div v-if="hasActiveCriteria" class="mb-4 relative">
          <Alert variant="default">
            <AlertTitle class="text-[#0f766e]">Filtered results</AlertTitle>
            <AlertDescription class="flex items-center gap-3">
              <span>{{ summaryText }}</span>
              <Button variant="ghost" size="sm" class="h-7 px-2 absolute right-2 top-1/2 -translate-y-1/2" @click="clearAllCriteria">
                <Icon name="lucide:x" class="h-4 w-4 mr-1" />
                Clear
              </Button>
            </AlertDescription>
          </Alert>
        </div>

        <!-- Error Alert -->
        <Alert v-if="apiError" variant="destructive" class="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{{ apiError?.message }}</AlertDescription>
        </Alert>

        <!-- Scroll Container -->
        <div ref="listContainer" class="min-h-[calc(100vh-10rem)] sm:min-h-[calc(100vh-12rem)]">
          <!-- Products Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
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
  </div>
</template>

<style scoped></style>
