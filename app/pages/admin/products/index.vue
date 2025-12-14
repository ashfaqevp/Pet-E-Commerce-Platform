<script setup lang="ts">
import { toast } from 'vue-sonner'

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

const dialogOpen = ref(false)
import type { AdminProduct } from '@/composables/admin/useAdminProducts'
import { useAdminProducts } from '@/composables/admin/useAdminProducts'

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

const openCreate = () => {
  editProduct.value = null
  dialogOpen.value = true
}

const openEdit = (p: AdminProduct) => {
  editProduct.value = p
  dialogOpen.value = true
}

const onSubmitForm = async (payload: {
  name: string
  pet_type: string
  product_type: string
  retail_price?: number | null
  wholesale_price?: number | null
  stock_quantity?: number
}) => {
  const { create, update } = useAdminProducts()
  try {
    if (editProduct.value?.id) {
      await update(editProduct.value.id, payload)
      toast.success('Product updated')
    } else {
      await create(payload)
      toast.success('Product created')
    }
    dialogOpen.value = false
    refresh()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Operation failed'
    toast.error(msg)
  }
}

const confirmDelete = (id: string) => {
  deletingId.value = id
}

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
const rows = computed(() => data.value?.rows || [])
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
            <SelectItem value="dogs">Dogs</SelectItem>
            <SelectItem value="cats">Cats</SelectItem>
            <SelectItem value="birds">Birds</SelectItem>
            <SelectItem value="fish">Fish</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="productType">
          <SelectTrigger class="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Food">Food</SelectItem>
            <SelectItem value="Toys">Toys</SelectItem>
            <SelectItem value="Accessories">Accessories</SelectItem>
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
            <DropdownMenuItem as="button" @click="sortBy = 'created_at'; ascending = false">Newest</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="sortBy = 'name'; ascending = true">Name</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="sortBy = 'retail_price'; ascending = true">Price ↑</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="sortBy = 'retail_price'; ascending = false">Price ↓</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="sortBy = 'stock_quantity'; ascending = false">Stock</DropdownMenuItem>
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
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Pet</TableHead>
              <TableHead>Type</TableHead>
              <TableHead class="text-right">Retail</TableHead>
              <TableHead class="text-right">Wholesale</TableHead>
              <TableHead class="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="8">
                <Skeleton class="h-10 w-full" />
              </TableCell>
            </TableRow>
            <TableRow v-else-if="error">
              <TableCell colspan="8">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{{ error.message }}</AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="rows.length === 0">
              <TableCell colspan="8">
                <TableEmpty>No products found</TableEmpty>
              </TableCell>
            </TableRow>
            <TableRow v-else v-for="p in rows" :key="p.id">
              <TableCell class="font-medium">{{ p.name }}</TableCell>
              <TableCell>{{ p.pet_type }}</TableCell>
              <TableCell>{{ p.product_type }}</TableCell>
              <TableCell class="text-right">{{ formatCurrency(p.retail_price) }}</TableCell>
              <TableCell class="text-right">{{ formatCurrency(p.wholesale_price) }}</TableCell>
              <TableCell class="text-right">{{ p.stock_quantity }}</TableCell>
              <TableCell>
                <Badge :variant="p.stock_quantity > 0 ? 'secondary' : 'destructive'">{{ p.stock_quantity > 0 ? 'active' : 'inactive' }}</Badge>
              </TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon">
                      <Icon name="lucide:ellipsis" class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem as="button" @click="openEdit(p)">
                      <Icon name="lucide:pencil" class="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem as="button" class="text-destructive" @click="confirmDelete(p.id)">
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
        <div class="flex items-center gap-2">
          <Button variant="outline" :disabled="page === 1" @click="page = Math.max(1, page - 1)">Prev</Button>
          <Button variant="outline" :disabled="page >= totalPages" @click="page = Math.min(totalPages, page + 1)">Next</Button>
        </div>
        <div class="text-sm">Page {{ page }} of {{ totalPages }}</div>
      </CardFooter>
    </Card>

    <Dialog v-model:open="dialogOpen">
      <DialogContent class="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{{ editProduct ? 'Edit Product' : 'Add Product' }}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <ProductForm :initial="editProduct || undefined" :submit-text="editProduct ? 'Update' : 'Create'" @submit="onSubmitForm" />
      </DialogContent>
    </Dialog>

    <AlertDialog :open="!!deletingId" @update:open="deletingId = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete product?</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground" @click="deleteProduct">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
  
</template>
