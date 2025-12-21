<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Orders',
})

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'completed'

interface AdminOrder {
  id: string
  user_id?: string | null
  total: number | null
  status: OrderStatus
  created_at: string
}

const status = ref<OrderStatus | 'all'>('all')
const sortBy = ref<'created_at' | 'total'>('created_at')
const ascending = ref(false)
const page = ref(1)
const pageSize = ref(10)

const params = computed(() => ({
  status: status.value === 'all' ? undefined : status.value,
  sortBy: sortBy.value,
  ascending: ascending.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const { data, pending, error, refresh } = await useLazyAsyncData(
  'admin-orders',
  async () => {
    const supabase = useSupabaseClient()
    let q = supabase.from('orders').select('id,total,status,created_at,user_id', { count: 'exact' })
    if (params.value.status) q = q.eq('status', params.value.status)
    q = q.order(params.value.sortBy, { ascending: params.value.ascending })
    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    q = q.range(from, to)
    const { data, error, count } = await q
    if (error) throw error
    const rows = ((data || []) as unknown as Array<{ id: string; total: number | null; status: string | null; created_at: string | Date; user_id?: string | null }>)
      .map((r) => ({
        id: String(r.id),
        total: r.total ?? 0,
        status: (r.status || 'pending') as OrderStatus,
        created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
        user_id: r.user_id || null,
      })) as AdminOrder[]
    return { rows, count: count ?? rows.length }
  },
  { server: true }
)

watch(params, () => {
  refresh()
})

onMounted(() => {
  const supabase = useSupabaseClient()
  const channel = supabase
    .channel('public:orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      refresh()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(Number(data.value?.count || 0) / pageSize.value)))
const rows = computed(() => data.value?.rows || [])

const editingId = ref<string | null>(null)
const nextStatus = ref<OrderStatus>('pending')

const openStatusChange = (id: string, s: OrderStatus) => {
  editingId.value = id
  nextStatus.value = s
}

const confirmStatusChange = async () => {
  if (!editingId.value) return
  const supabase = useSupabaseClient()
  const { error: e } = await supabase.from('orders').update({ status: nextStatus.value } as unknown as never).eq('id', editingId.value)
  if (e) {
    toast.error(e.message)
  } else {
    toast.success('Order status updated')
  }
  editingId.value = null
  refresh()
}

const formatCurrency = (v: number | null | undefined) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(v || 0))
const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div class="flex items-center gap-2">
        <Select v-model="status">
          <SelectTrigger class="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="gap-2">
              <Icon name="lucide:arrow-up-down" class="h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem as="button" @click="sortBy = 'created_at'; ascending = false">Newest</DropdownMenuItem>
            <DropdownMenuItem as="button" @click="sortBy = 'total'; ascending = false">Amount</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <Card>
      <CardHeader class="flex items-center justify-between">
        <CardTitle>Orders</CardTitle>
        <Badge variant="outline">{{ data?.count || 0 }}</Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead class="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="6"><Skeleton class="h-10 w-full" /></TableCell>
            </TableRow>
            <TableRow v-else-if="error">
              <TableCell colspan="6">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{{ error.message }}</AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="rows.length === 0">
              <TableCell colspan="6">
                <TableEmpty>No orders found</TableEmpty>
              </TableCell>
            </TableRow>
            <TableRow v-else v-for="o in rows" :key="o.id">
              <TableCell>
                <NuxtLink :to="`/admin/orders/${o.id}`" class="text-foreground underline">#{{ o.id }}</NuxtLink>
              </TableCell>
              <TableCell>{{ formatDate(o.created_at) }}</TableCell>
              <TableCell>{{ o.user_id || '—' }}</TableCell>
              <TableCell class="text-right">{{ formatCurrency(o.total) }}</TableCell>
              <TableCell>
                <Badge :variant="o.status === 'completed' || o.status === 'delivered' ? 'default' : o.status === 'cancelled' || o.status === 'returned' ? 'destructive' : 'secondary'">
                  {{ o.status }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon">
                      <Icon name="lucide:ellipsis" class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem as="button" @click="openStatusChange(o.id, 'processing')">
                      <Icon name="lucide:badge" class="h-4 w-4 mr-2" /> Processing
                    </DropdownMenuItem>
                    <DropdownMenuItem as="button" @click="openStatusChange(o.id, 'shipped')">
                      <Icon name="lucide:truck" class="h-4 w-4 mr-2" /> Shipped
                    </DropdownMenuItem>
                    <DropdownMenuItem as="button" @click="openStatusChange(o.id, 'delivered')">
                      <Icon name="lucide:package-check" class="h-4 w-4 mr-2" /> Delivered
                    </DropdownMenuItem>
                    <DropdownMenuItem as="button" @click="openStatusChange(o.id, 'completed')">
                      <Icon name="lucide:check-circle" class="h-4 w-4 mr-2" /> Completed
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem as="button" class="text-destructive" @click="openStatusChange(o.id, 'cancelled')">
                      <Icon name="lucide:x-circle" class="h-4 w-4 mr-2" /> Cancel
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

    <AlertDialog :open="!!editingId" @update:open="editingId = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change status?</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-secondary text-white" @click="confirmStatusChange">Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
