<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useField } from 'vee-validate'
import { z } from 'zod'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Categories',
})

interface AdminCategory {
  id: string
  name: string
  slug?: string | null
  created_at: string
}

const search = ref('')
const sortBy = ref<'created_at' | 'name'>('created_at')
const ascending = ref(false)
const page = ref(1)
const pageSize = ref(10)

const params = computed(() => ({
  search: search.value || undefined,
  sortBy: sortBy.value,
  ascending: ascending.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const { data, pending, error, refresh } = await useLazyAsyncData(
  'admin-categories',
  async () => {
    const supabase = useSupabaseClient()
    let q = supabase.from('categories').select('id,name,slug,created_at', { count: 'exact' })
    q = q.is('parent_id', null)
    if (params.value.search) q = q.ilike('name', `%${params.value.search}%`)
    q = q.order(params.value.sortBy, { ascending: params.value.ascending })
    const from = (params.value.page - 1) * params.value.pageSize
    const to = from + params.value.pageSize - 1
    q = q.range(from, to)
    const { data, error, count } = await q
    if (error) throw error
    const rows = ((data || []) as unknown as Array<{ id: string; name: string; slug?: string | null; created_at: string | Date }>)
      .map((r) => ({
        id: String(r.id),
        name: r.name,
        slug: r.slug || null,
        created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
      })) as AdminCategory[]
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
    .channel('public:categories')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
      refresh()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(Number(data.value?.count || 0) / pageSize.value)))
const rows = computed(() => data.value?.rows || [])

const dialogOpen = ref(false)
const editCategory = ref<AdminCategory | null>(null)
const deletingId = ref<string | null>(null)

const openCreate = () => {
  editCategory.value = null
  dialogOpen.value = true
}

const openEdit = (c: AdminCategory) => {
  editCategory.value = c
  dialogOpen.value = true
}

const schema = toTypedSchema(
  z.object({
    name: z.string().min(1),
    slug: z.string().min(1).optional(),
  })
)

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
  initialValues: {
    name: editCategory.value?.name ?? '',
    slug: editCategory.value?.slug ?? undefined,
  },
})

const { value: name, errorMessage: nameError } = useField<string>('name')
const { value: slug, errorMessage: slugError } = useField<string | undefined>('slug')

const onSubmit = handleSubmit(async (values) => {
  const supabase = useSupabaseClient()
  try {
    if (editCategory.value?.id) {
      const { error: e } = await supabase.from('categories').update({ name: values.name, slug: values.slug } as unknown as never).eq('id', editCategory.value.id)
      if (e) throw e
      toast.success('Category updated')
    } else {
      const { error: e } = await supabase.from('categories').insert([{ name: values.name, slug: values.slug, parent_id: null } as unknown as never])
      if (e) throw e
      toast.success('Category created')
    }
    dialogOpen.value = false
    refresh()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Operation failed'
    toast.error(msg)
  }
})

const confirmDelete = (id: string) => {
  deletingId.value = id
}

const deleteCategory = async () => {
  if (!deletingId.value) return
  const supabase = useSupabaseClient()
  try {
    const { error: e } = await supabase.from('categories').delete().eq('id', deletingId.value)
    if (e) throw e
    toast.success('Category deleted')
    deletingId.value = null
    refresh()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Delete failed'
    toast.error(msg)
  }
}

const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div class="flex items-center gap-2">
        <Input v-model="search" placeholder="Search categories" class="w-64" />
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div class="flex items-center gap-2">
        <Button class="bg-secondary text-white" @click="openCreate">
          <Icon name="lucide:plus" class="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader class="flex items-center justify-between">
        <CardTitle>Categories</CardTitle>
        <Badge variant="outline">{{ data?.count || 0 }}</Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Created</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="pending">
              <TableCell colspan="4"><Skeleton class="h-10 w-full" /></TableCell>
            </TableRow>
            <TableRow v-else-if="error">
              <TableCell colspan="4">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{{ error.message }}</AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="rows.length === 0">
              <TableCell colspan="4">
                <TableEmpty>No categories found</TableEmpty>
              </TableCell>
            </TableRow>
            <TableRow v-else v-for="c in rows" :key="c.id">
              <TableCell class="font-medium">{{ c.name }}</TableCell>
              <TableCell>{{ c.slug || '—' }}</TableCell>
              <TableCell>{{ formatDate(c.created_at) }}</TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon">
                      <Icon name="lucide:ellipsis" class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem as="button" @click="openEdit(c)">
                      <Icon name="lucide:pencil" class="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem as="button" class="text-destructive" @click="confirmDelete(c.id)">
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
          <DialogTitle>{{ editCategory ? 'Edit Category' : 'Add Category' }}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="onSubmit">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label for="name">Name</Label>
              <Input id="name" v-model="name" placeholder="Category name" />
              <p v-if="nameError" class="text-destructive text-xs mt-1">{{ nameError }}</p>
            </div>
            <div>
              <Label for="slug">Slug</Label>
              <Input id="slug" v-model="slug" placeholder="category-slug" />
              <p v-if="slugError" class="text-destructive text-xs mt-1">{{ slugError }}</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <Button type="submit" :disabled="isSubmitting">{{ editCategory ? 'Update' : 'Create' }}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="!!deletingId" @update:open="deletingId = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete category?</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground" @click="deleteCategory">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
