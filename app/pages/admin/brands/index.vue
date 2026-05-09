<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Brand } from '@/composables/useBrands'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Brands',
})

const { fetchAllBrandsAdmin, updateBrand, deleteBrand } = useBrands()
const route = useRoute()
const router = useRouter()

const { data, pending, error, refresh } = await useLazyAsyncData<Brand[]>(
  'admin-brands',
  fetchAllBrandsAdmin,
  { server: true }
)

const brands = computed(() => (data.value ?? []) as Brand[])

const sheetOpen = ref(false)
const selectedBrand = ref<Brand | null>(null)
const deletingId = ref<string | null>(null)

const openSheet = (brand: Brand | null = null) => {
  selectedBrand.value = brand
  sheetOpen.value = true
}

const toggleFeatured = async (id: string, current: boolean) => {
  try {
    await updateBrand(id, { is_featured: !current })
    await refresh()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Update failed')
  }
}

const toggleActive = async (id: string, current: boolean) => {
  try {
    await updateBrand(id, { is_active: !current })
    await refresh()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Update failed')
  }
}

const confirmDelete = async (id: string) => {
  try {
    await deleteBrand(id)
    toast.success('Brand deleted')
    deletingId.value = null
    await refresh()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Delete failed')
  }
}

onMounted(() => {
  if (route.query.new === 'true') {
    openSheet(null)
    // Clear query param without refreshing page
    router.replace({ query: { ...route.query, new: undefined } })
  }
})

watch(() => route.query.new, (newVal) => {
  if (newVal === 'true') {
    openSheet(null)
    router.replace({ query: { ...route.query, new: undefined } })
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Brands</h1>
      <Button class="bg-secondary text-white" @click="openSheet(null)">
        <Icon name="lucide:plus" class="h-4 w-4 mr-2" />
        New Brand
      </Button>
    </div>

    <Card class="rounded-sm">
      <CardContent class="p-0">
        <div class="w-full overflow-x-auto">
          <Table class="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead class="w-16">Logo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead class="text-center w-24">Sort</TableHead>
                <TableHead class="text-center w-28">Featured</TableHead>
                <TableHead class="text-center w-24">Active</TableHead>
                <TableHead class="text-center w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="pending">
                <TableCell colspan="7"><Skeleton v-for="i in 4" :key="i" class="h-10 w-full mb-3" /></TableCell>
              </TableRow>
              <TableRow v-else-if="error">
                <TableCell colspan="7">
                  <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{{ error.message }}</AlertDescription></Alert>
                </TableCell>
              </TableRow>
              <TableRow v-else-if="brands.length === 0">
                <TableCell colspan="7" class="text-center py-8 text-muted-foreground">No brands yet. Create your first brand.</TableCell>
              </TableRow>
              <TableRow v-else v-for="brand in brands" :key="brand.id">
                <TableCell>
                  <div class="h-10 w-10 rounded border bg-muted grid place-items-center overflow-hidden">
                    <img v-if="brand.logo_url" :src="brand.logo_url" :alt="brand.name" class="h-full w-full object-contain" />
                    <Icon v-else name="lucide:image" class="h-4 w-4 text-muted-foreground" />
                  </div>
                </TableCell>
                <TableCell class="font-medium">{{ brand.name }}</TableCell>
                <TableCell class="text-muted-foreground text-sm">{{ brand.slug }}</TableCell>
                <TableCell class="text-center">{{ brand.sort_order }}</TableCell>
                <TableCell class="text-center">
                  <Switch :model-value="brand.is_featured" @update:model-value="toggleFeatured(brand.id, brand.is_featured)" />
                </TableCell>
                <TableCell class="text-center">
                  <Switch :model-value="brand.is_active" @update:model-value="toggleActive(brand.id, brand.is_active)" />
                </TableCell>
                <TableCell class="text-center">
                  <div class="flex items-center gap-2 justify-center">
                    <Button variant="default" size="sm" @click="openSheet(brand)">
                      <Icon name="lucide:pencil" class="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <AlertDialog :open="deletingId === brand.id" @update:open="(v) => !v && (deletingId = null)">
                      <AlertDialogTrigger as-child>
                        <Button variant="destructive" size="sm" @click="deletingId = brand.id">
                          <Icon name="lucide:trash" class="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{{ brand.name }}"?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone. Products linked to this brand will lose their brand association.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction class="bg-destructive text-white" @click="confirmDelete(brand.id)">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <AdminBrandsBrandSheet
      v-model:open="sheetOpen"
      :brand="selectedBrand"
      @saved="refresh"
    />
  </div>
</template>

