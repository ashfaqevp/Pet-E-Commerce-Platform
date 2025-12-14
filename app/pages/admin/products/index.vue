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
const petType = ref<string | undefined>()
const productType = ref<string | undefined>()
const status = ref<'active' | 'inactive' | undefined>()
const sortBy = ref<'name' | 'stock_quantity' | 'retail_price' | 'created_at'>('created_at')
const ascending = ref(false)
const page = ref(1)
const pageSize = ref(10)

const sheetOpen = ref(false)
const editProduct = ref<AdminProduct | null>(null)
const deletingId = ref<string | null>(null)

const params = computed(() => ({
  search: search.value || undefined,
  petType: petType.value || undefined,
  productType: productType.value || undefined,
  status: status.value || undefined,
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
  columnHelper.accessor('name', { header: 'Product', enableSorting: true }),
  columnHelper.display({ id: 'categories', header: 'Categories', enableSorting: false }),
  columnHelper.display({ id: 'price', header: 'Price', enableSorting: true }),
  columnHelper.accessor('stock_quantity', { header: 'Stock', enableSorting: true }),
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
const totalPages = computed(() => Math.max(1, Math.ceil(Number(data.value?.count || 0) / pageSize.value)))

const { options, getCategoryLabel } = useCategories()
const petOptions = options('pet')
const typeOptions = options('type')

const onSubmitSheet = async (payload: { name: string; pet_type: string; product_type: string; retail_price: number; stock_quantity: number }) => {
  const { create, update } = useAdminProducts()
  try {
    if (editProduct.value?.id) {
      await update(editProduct.value.id, { ...payload, wholesale_price: null })
      toast.success('Product updated')
    } else {
      await create({ ...payload, wholesale_price: null })
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
          <SelectTrigger class="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="petType">
          <SelectTrigger class="w-40"><SelectValue placeholder="Pet" /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="opt in petOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="productType">
          <SelectTrigger class="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
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

    <Card>
      <CardHeader class="flex items-center justify-between">
        <CardTitle>Products</CardTitle>
        <Badge variant="outline">{{ data?.count || 0 }}</Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <TableHead v-for="header in headerGroup.headers" :key="header.id" :class="header.column.getCanSort() ? 'cursor-pointer select-none' : ''" @click="header.column.getCanSort() && header.column.toggleSorting(header.column.getIsSorted() === 'asc')">
                <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
                <Icon v-if="header.column.getCanSort() && !header.column.getIsSorted()" name="lucide:arrow-up-down" class="ml-1 inline h-3 w-3" />
                <Icon v-else-if="header.column.getIsSorted() === 'asc'" name="lucide:arrow-up" class="ml-1 inline h-3 w-3" />
                <Icon v-else-if="header.column.getIsSorted() === 'desc'" name="lucide:arrow-down" class="ml-1 inline h-3 w-3" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="5"><Skeleton class="h-10 w-full" /></TableCell>
            </TableRow>
            <TableRow v-else-if="error">
              <TableCell colspan="5">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{{ error.message }}</AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="rows.length === 0">
              <TableCell colspan="5"><TableEmpty>No products found</TableEmpty></TableCell>
            </TableRow>
            <TableRow v-else v-for="row in table.getRowModel().rows" :key="row.id">
              <TableCell>
                <div class="flex items-center justify-between">
                  <span class="font-medium">{{ row.original.name }}</span>
                  <Badge :variant="row.original.stock_quantity > 0 ? 'secondary' : 'destructive'">{{ row.original.stock_quantity > 0 ? 'active' : 'inactive' }}</Badge>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Badge variant="outline">{{ getCategoryLabel('pet') }}: {{ row.original.pet_type }}</Badge>
                  <Badge variant="outline">{{ getCategoryLabel('type') }}: {{ row.original.product_type }}</Badge>
                </div>
              </TableCell>
              <TableCell class="text-right">{{ formatCurrency(row.original.retail_price) }}</TableCell>
              <TableCell class="text-right">{{ row.original.stock_quantity }}</TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon">
                      <Icon name="lucide:ellipsis" class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem as="button" @click="openEdit(row.original)">
                      <Icon name="lucide:pencil" class="h-4 w-4 mr-2" /> Edit
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
        <Pagination :total="totalPages" :page="page" :items-per-page="pageSize" @update:page="(p) => page = p">
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

    <ProductDeleteConfirm :open="!!deletingId" @update:open="deletingId = null" @confirm="deleteProduct" />
  </div>
  
</template>
