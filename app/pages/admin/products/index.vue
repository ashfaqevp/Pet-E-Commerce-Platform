<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { AdminProduct } from '@/composables/admin/useAdminProducts'
import { useAdminProducts } from '@/composables/admin/useAdminProducts'
import { createColumnHelper, FlexRender, getCoreRowModel, useVueTable, type SortingState } from '@tanstack/vue-table'
import { valueUpdater } from '@/components/ui/table/utils'
import { useCategories } from '@/domain/categories'
import ProductSheet from '@/components/admin/products/ProductSheet.vue'
import ProductDeleteConfirm from '@/components/admin/products/ProductDeleteConfirm.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Products',
})

const search = ref('')
const ALL = '__all__' as const
const petType = ref<string | typeof ALL | undefined>()
const productType = ref<string | typeof ALL | undefined>()
const status = ref<'active' | 'inactive' | typeof ALL | undefined>()
const sortBy = ref<'name' | 'stock_quantity' | 'retail_price' | 'created_at'>('created_at')
const ascending = ref(false)
const page = ref(1)
const pageSize = ref(5)

const sheetOpen = ref(false)
const editProduct = ref<AdminProduct | null>(null)
const deletingId = ref<string | null>(null)

const params = computed(() => ({
  search: search.value || undefined,
  petType: petType.value === ALL ? undefined : (petType.value || undefined),
  productType: productType.value === ALL ? undefined : (productType.value || undefined),
  status: status.value === ALL ? undefined : (status.value || undefined),
  sortBy: sortBy.value,
  ascending: ascending.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const { data, pending, error, refresh } = await useLazyAsyncData(
  'admin-products',
  async () => {
    const { list } = useAdminProducts()
    return await list(params.value)
  },
  { server: true }
)

watch(params, () => {
  refresh()
})

const rows = computed(() => data.value?.rows || [])

onMounted(() => {
  const supabase = useSupabaseClient()
  const channel = supabase
    .channel('public:products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
      refresh()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})

const columnHelper = createColumnHelper<AdminProduct>()
const columns = [
  columnHelper.display({ id: 'serial', header: '#', enableSorting: false }),
  columnHelper.display({ id: 'thumbnail', header: 'Image', enableSorting: false }),
  columnHelper.accessor('name', { header: 'Product', enableSorting: true }),
  columnHelper.accessor('pet_type', { header: 'Pet Type', enableSorting: false }),
  columnHelper.accessor('product_type', { header: 'Product Type', enableSorting: false }),
  columnHelper.display({ id: 'price', header: 'Price', enableSorting: true }),
  columnHelper.accessor('stock_quantity', { header: 'Stock', enableSorting: true }),
  columnHelper.display({ id: 'status', header: 'Status', enableSorting: false }),
  columnHelper.display({ id: 'actions', header: 'Actions', enableSorting: false }),
] 

const sorting = ref<SortingState>([])
const table = useVueTable({
  data: computed(() => rows.value),
  columns,
  state: { sorting: sorting.value },
  onSortingChange: (updater) => {
    valueUpdater(updater, sorting)
    const s = sorting.value[0]
    if (s) {
      const id = s.id === 'price' ? 'retail_price' : (s.id as 'name' | 'stock_quantity')
      sortBy.value = id
      ascending.value = !s.desc
    } else {
      sortBy.value = 'created_at'
      ascending.value = false
    }
  },
  manualSorting: true,
  getCoreRowModel: getCoreRowModel(),
})

watch(sorting, (s) => {
  table.setOptions(prev => ({ ...prev, state: { ...(prev.state as any), sorting: s } }))
})

const openCreate = () => {
  editProduct.value = null
  sheetOpen.value = true
}

const openEdit = (p: AdminProduct) => {
  editProduct.value = p
  sheetOpen.value = true
}

const confirmDelete = (id: string) => { deletingId.value = id }

const deleteProduct = async () => {
  if (!deletingId.value) return
  const { remove } = useAdminProducts()
  try {
    await remove(deletingId.value)
    toast.success('Product deleted')
    deletingId.value = null
    refresh()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Delete failed'
    toast.error(msg)
  }
}

const formatCurrency = (v: number | null | undefined) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(v || 0))
const totalItems = computed(() => Number(data.value?.count || 0))
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))

const { options, getCategoryLabel, setCategory, clearCategory } = useCategories()
const petOptions = options('pet')
const typeOptions = options('type')

type OptionItem = { id: string; label: string }
const petLabelMap = computed<Record<string, string>>(() => {
  const arr = (petOptions.value ?? []) as OptionItem[]
  return Object.fromEntries(arr.map(o => [o.id, o.label]))
})
const typeLabelMap = computed<Record<string, string>>(() => {
  const arr = (typeOptions.value ?? []) as OptionItem[]
  return Object.fromEntries(arr.map(o => [o.id, o.label]))
})

const headerAlignClass = (id: string) => {
  if (id === 'serial') return 'text-center'
  if (id === 'thumbnail') return 'text-center'
  if (id === 'price' || id === 'stock_quantity') return 'text-right'
  if (id === 'pet_type' || id === 'product_type') return 'text-center'
  if (id === 'status' || id === 'actions') return 'text-center'
  return 'text-left'
}

const getThumbnail = (p: AdminProduct) => p.thumbnail_url || (p.image_urls && p.image_urls[0]) || ''

const setActive = async (id: string) => {
  const { update } = useAdminProducts()
  try {
    await update(id, { is_active: true })
    toast.success('Status set to active')
    await refresh()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    toast.error(msg)
  }
}

const setInactive = async (id: string) => {
  const { update } = useAdminProducts()
  try {
    await update(id, { is_active: false })
    toast.success('Status set to inactive')
    await refresh()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    toast.error(msg)
  }
}

watch(petType, (val) => {
  if (!val || val === ALL) {
    clearCategory('pet')
    productType.value = ALL
  } else {
    setCategory('pet', val as string)
    productType.value = ALL
  }
})

const onSubmitSheet = async (payload: { name: string; pet_type: string; product_type: string; age?: string; unit?: string; size?: string; flavour?: string; retail_price: number; stock_quantity: number; thumbnailFile?: File | null; galleryFiles?: File[]; existingThumbnailUrl?: string | null; existingGalleryUrls?: string[] }) => {
  const { create, update, uploadProductImages } = useAdminProducts()
  try {
    if (editProduct.value?.id) {
      const productId = editProduct.value.id
      const uploaded = await uploadProductImages(productId, { thumbnail: payload.thumbnailFile ?? null, gallery: payload.galleryFiles ?? [] })
      const thumbUrl = uploaded.thumbnail_url || payload.existingThumbnailUrl || editProduct.value.thumbnail_url || null
      const existingGallery = payload.existingGalleryUrls ?? editProduct.value.image_urls ?? []
      const finalGallery = [...existingGallery, ...(uploaded.image_urls || [])]
      await update(productId, {
        name: payload.name,
        pet_type: payload.pet_type,
        product_type: payload.product_type,
        age: payload.age ?? null,
        unit: payload.unit ?? null,
        size: payload.size ?? null,
        flavour: payload.flavour ?? null,
        retail_price: payload.retail_price,
        stock_quantity: payload.stock_quantity ?? 0,
        thumbnail_url: thumbUrl,
        image_urls: finalGallery,
      })
      toast.success('Product updated')
    } else {
      const created = await create({
        name: payload.name,
        pet_type: payload.pet_type,
        product_type: payload.product_type,
        age: payload.age ?? null,
        unit: payload.unit ?? null,
        size: payload.size ?? null,
        flavour: payload.flavour ?? null,
        retail_price: payload.retail_price,
        stock_quantity: payload.stock_quantity ?? 0,
      })
      const uploaded = await uploadProductImages(created.id, { thumbnail: payload.thumbnailFile ?? null, gallery: payload.galleryFiles ?? [] })
      await update(created.id, {
        thumbnail_url: uploaded.thumbnail_url ?? null,
        image_urls: uploaded.image_urls ?? [],
      })
      toast.success('Product created')
    }
    sheetOpen.value = false
    refresh()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Operation failed'
    toast.error(msg)
  }
}

const setServerSort = (key: 'created_at' | 'name' | 'retail_price' | 'stock_quantity', asc: boolean) => {
  sortBy.value = key
  ascending.value = asc
  sorting.value = key === 'retail_price' ? [{ id: 'price', desc: !asc }] : [{ id: key, desc: !asc }]
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div class="flex flex-1 items-center gap-2">
        <Input v-model="search" placeholder="Search products" class="w-full md:w-80" />
        <Select v-model="status">
          <SelectTrigger class="w-40">
            <div class="flex items-center gap-1">
              <span class="text-xs text-muted-foreground">Status:</span>
              <SelectValue placeholder="All" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="petType">
          <SelectTrigger class="w-40">
            <div class="flex items-center gap-1">
              <span class="text-xs text-muted-foreground">Pet:</span>
              <SelectValue placeholder="All" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem v-for="opt in petOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="productType">
          <SelectTrigger class="w-44">
            <div class="flex items-center gap-1">
              <span class="text-xs text-muted-foreground">Type:</span>
              <SelectValue placeholder="All" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem v-for="opt in typeOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="gap-2">
              <Icon name="lucide:arrow-up-down" class="h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem as="button" @click="setServerSort('created_at', false)">Newest</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="setServerSort('name', true)">Name</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="setServerSort('retail_price', true)">Price ↑</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="setServerSort('retail_price', false)">Price ↓</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="setServerSort('stock_quantity', false)">Stock</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button class="bg-secondary text-white" @click="openCreate">
          <Icon name="lucide:plus" class="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>
    </div>

    <Card class="rounded-sm">
      <CardHeader class="flex items-center justify-between">
        <CardTitle>Products</CardTitle>
        <Badge variant="outline">{{ data?.count || 0 }}</Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <TableHead
                v-for="header in headerGroup.headers"
                :key="header.id"
                :class="[header.column.getCanSort() ? 'cursor-pointer select-none' : '', headerAlignClass(header.id), 'py-3']"
                @click="header.column.getCanSort() && header.column.toggleSorting(header.column.getIsSorted() === 'asc')"
              >
                <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
                <Icon v-if="header.column.getCanSort() && !header.column.getIsSorted()" name="lucide:arrow-up-down" class="ml-1 inline h-3 w-3" />
                <Icon v-else-if="header.column.getIsSorted() === 'asc'" name="lucide:arrow-up" class="ml-1 inline h-3 w-3" />
                <Icon v-else-if="header.column.getIsSorted() === 'desc'" name="lucide:arrow-down" class="ml-1 inline h-3 w-3" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="9"><Skeleton class="h-10 w-full" /></TableCell>
            </TableRow>
            <TableRow v-else-if="error">
              <TableCell colspan="9">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{{ error.message }}</AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="rows.length === 0">
              <TableCell colspan="9"><TableEmpty>No products found</TableEmpty></TableCell>
            </TableRow>
            <TableRow v-else v-for="row in table.getRowModel().rows" :key="row.id">
              <TableCell class="py-3 text-center w-10">{{ (page - 1) * pageSize + row.index + 1 }}</TableCell>
              <TableCell class="py-3 text-center w-16">
                <div class="h-10 w-10 rounded-sm overflow-hidden border bg-muted grid place-items-center">
                  <img v-if="getThumbnail(row.original)" :src="getThumbnail(row.original)" alt="" class="h-full w-full object-cover" />
                  <Icon v-else name="lucide:image" class="h-5 w-5 text-muted-foreground" />
                </div>
              </TableCell>
              <TableCell class="py-3 text-left">
                <div class="flex items-center justify-between">
                  <span class="font-medium">{{ row.original.name }}</span>
                </div>
              </TableCell>
              <TableCell class="py-3 text-center">
                <Badge variant="outline">{{ petLabelMap[row.original.pet_type] ?? row.original.pet_type }}</Badge>
              </TableCell>
              <TableCell class="py-3 text-center">
                <Badge variant="outline">{{ typeLabelMap[row.original.product_type] ?? row.original.product_type }}</Badge>
              </TableCell>
              <TableCell class="py-3 text-right">{{ formatCurrency(row.original.retail_price) }}</TableCell>
              <TableCell class="py-3 text-right">{{ row.original.stock_quantity }}</TableCell>
              <TableCell class="py-3 text-center">
                <Badge :variant="row.original.is_active ? 'secondary' : 'destructive'">{{ row.original.is_active ? 'active' : 'inactive' }}</Badge>
              </TableCell>
              <TableCell class="py-3 text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <div class="flex items-center gap-2 justify-end">
                      <Button variant="default" size="sm" @click="openEdit(row.original)">
                        <Icon name="lucide:pencil" class="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Icon name="lucide:ellipsis" class="h-4 w-4" />
                      </Button>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem v-if="!row.original.is_active" as="button" @click="setActive(row.original.id)">
                      <Icon name="lucide:check-circle" class="h-4 w-4 mr-2" /> Set Active
                    </DropdownMenuItem>
                    <DropdownMenuItem v-else as="button" @click="setInactive(row.original.id)">
                      <Icon name="lucide:slash" class="h-4 w-4 mr-2" /> Set Inactive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem as="button" class="text-destructive" @click="confirmDelete(row.original.id)">
                      <Icon name="lucide:trash" class="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter class="flex items-center justify-between">
        <Pagination :total="totalItems" :page="page" :items-per-page="pageSize" @update:page="(p) => page = p">
          <PaginationContent v-slot="{ items }">
            <PaginationFirst />
            <PaginationPrevious />
            <template v-for="(item, i) in items" :key="i">
              <PaginationItem v-if="item.type === 'page'" :value="item.value" :isActive="item.value === page">{{ item.value }}</PaginationItem>
              <PaginationEllipsis v-else />
            </template>
            <PaginationNext />
            <PaginationLast />
          </PaginationContent>
        </Pagination>
        <div class="text-sm">Page {{ page }} of {{ totalPages }}</div>
      </CardFooter>
    </Card>

    <ProductSheet v-model:open="sheetOpen" :initial="editProduct || null" @submit="onSubmitSheet" />

    <ProductDeleteConfirm :open="!!deletingId" @confirm="deleteProduct" @cancel="deletingId = null" />
  </div>
  
</template>
