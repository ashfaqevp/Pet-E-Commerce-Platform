<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Users',
})

interface AdminUser {
  id: string
  email?: string | null
  full_name?: string | null
  role?: string | null
  is_active?: boolean | null
  created_at: string
}

const search = ref('')
const status = ref<'all' | 'active' | 'disabled'>('all')
const sortBy = ref<'created_at' | 'email'>('created_at')
const ascending = ref(false)
const page = ref(1)
const pageSize = ref(10)

const params = computed(() => ({
  search: search.value || undefined,
  status: status.value === 'all' ? undefined : status.value,
  sortBy: sortBy.value,
  ascending: ascending.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const { data, pending, error, refresh } = await useLazyAsyncData(
  'admin-users',
  async () => {
    const supabase = useSupabaseClient()
    let q = supabase.from('user_profiles').select('id,email,full_name,role,is_active,created_at', { count: 'exact' })
    if (params.value.search) q = q.ilike('email', `%${params.value.search}%`)
    if (params.value.status === 'active') q = q.eq('is_active', true)
    if (params.value.status === 'disabled') q = q.eq('is_active', false)
    q = q.order(params.value.sortBy, { ascending: params.value.ascending })
    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    q = q.range(from, to)
    const { data, error, count } = await q
    if (error) throw error
    const rows = ((data || []) as unknown as Array<{ id: string; email?: string | null; full_name?: string | null; role?: string | null; is_active?: boolean | null; created_at: string | Date }>)
      .map((r) => ({
        id: String(r.id),
        email: r.email || null,
        full_name: r.full_name || null,
        role: r.role || null,
        is_active: r.is_active ?? true,
        created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
      })) as AdminUser[]
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
    .channel('public:user_profiles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => {
      refresh()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(Number(data.value?.count || 0) / pageSize.value)))
const rows = computed(() => data.value?.rows || [])

const togglingId = ref<string | null>(null)
const togglingTo = ref<boolean>(true)

const toggleUser = (id: string, to: boolean) => {
  togglingId.value = id
  togglingTo.value = to
}

const confirmToggle = async () => {
  if (!togglingId.value) return
  const supabase = useSupabaseClient()
  const { error: e } = await supabase.from('user_profiles').update({ is_active: togglingTo.value } as unknown as never).eq('id', togglingId.value)
  if (e) {
    toast.error(e.message)
  } else {
    toast.success('User updated')
  }
  togglingId.value = null
  refresh()
}

const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div class="flex items-center gap-2">
        <Input v-model="search" placeholder="Search email" class="w-64" />
        <Select v-model="status">
          <SelectTrigger class="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
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
            <DropdownMenuItem as="button" @click="sortBy = 'email'; ascending = true">Email</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <Card>
      <CardHeader class="flex items-center justify-between">
        <CardTitle>Users</CardTitle>
        <Badge variant="outline">{{ data?.count || 0 }}</Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
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
                <TableEmpty>No users found</TableEmpty>
              </TableCell>
            </TableRow>
            <TableRow v-else v-for="u in rows" :key="u.id">
              <TableCell>{{ u.email || '—' }}</TableCell>
              <TableCell>{{ u.full_name || '—' }}</TableCell>
              <TableCell>
                <Badge variant="outline">{{ u.role || 'customer' }}</Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="u.is_active ? 'secondary' : 'destructive'">{{ u.is_active ? 'active' : 'disabled' }}</Badge>
              </TableCell>
              <TableCell>{{ formatDate(u.created_at) }}</TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon">
                      <Icon name="lucide:ellipsis" class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem as="button" @click="toggleUser(u.id, !u.is_active)">
                      <Icon :name="u.is_active ? 'lucide:user-x' : 'lucide:user-check'" class="h-4 w-4 mr-2" />
                      {{ u.is_active ? 'Disable' : 'Enable' }}
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

    <AlertDialog :open="!!togglingId" @update:open="togglingId = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update user status?</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-secondary text-white" @click="confirmToggle">Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
