<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { PetType } from '@/composables/usePetTypes'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Pet Types',
})

const { fetchAllPetTypesAdmin, updatePetType, deletePetType } = usePetTypes()

const { data, pending, error, refresh } = await useLazyAsyncData<PetType[]>(
  'admin-pet-types',
  fetchAllPetTypesAdmin,
  { server: true }
)

const petTypes = computed(() => (data.value ?? []) as PetType[])
const deletingId = ref<string | null>(null)

const toggleActive = async (id: string, current: boolean) => {
  try {
    await updatePetType(id, { is_active: !current })
    await refresh()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Update failed')
  }
}

const confirmDelete = async (id: string) => {
  try {
    await deletePetType(id)
    toast.success('Pet type deleted')
    deletingId.value = null
    await refresh()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Delete failed')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Pet Types</h1>
      <NuxtLink to="/admin/pet-types/new">
        <Button class="bg-secondary text-white">
          <Icon name="lucide:plus" class="h-4 w-4 mr-2" />
          New Pet Type
        </Button>
      </NuxtLink>
    </div>

    <Card class="rounded-sm">
      <CardContent class="p-0">
        <div class="w-full overflow-x-auto">
          <Table class="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead class="w-16">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead class="text-center w-24">Sort</TableHead>
                <TableHead class="text-center w-24">Active</TableHead>
                <TableHead class="text-center w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="pending">
                <TableCell colspan="6"><Skeleton v-for="i in 4" :key="i" class="h-10 w-full mb-3" /></TableCell>
              </TableRow>
              <TableRow v-else-if="error">
                <TableCell colspan="6">
                  <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{{ error.message }}</AlertDescription></Alert>
                </TableCell>
              </TableRow>
              <TableRow v-else-if="petTypes.length === 0">
                <TableCell colspan="6" class="text-center py-8 text-muted-foreground">
                  No pet types yet. Create your first pet type.
                </TableCell>
              </TableRow>
              <TableRow v-else v-for="pt in petTypes" :key="pt.id">
                <TableCell>
                  <div class="h-10 w-10 rounded-full border bg-muted grid place-items-center overflow-hidden">
                    <img v-if="pt.image_url" :src="pt.image_url" :alt="pt.name" class="h-full w-full object-cover rounded-full" />
                    <Icon v-else name="lucide:paw-print" class="h-4 w-4 text-muted-foreground" />
                  </div>
                </TableCell>
                <TableCell class="font-medium">{{ pt.name }}</TableCell>
                <TableCell class="text-muted-foreground text-sm font-mono">{{ pt.slug }}</TableCell>
                <TableCell class="text-center">{{ pt.sort_order }}</TableCell>
                <TableCell class="text-center">
                  <Switch :model-value="pt.is_active" @update:model-value="toggleActive(pt.id, pt.is_active)" />
                </TableCell>
                <TableCell class="text-center">
                  <div class="flex items-center gap-2 justify-center">
                    <NuxtLink :to="`/admin/pet-types/${pt.id}`">
                      <Button variant="default" size="sm">
                        <Icon name="lucide:pencil" class="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </NuxtLink>
                    <AlertDialog :open="deletingId === pt.id" @update:open="(v) => !v && (deletingId = null)">
                      <AlertDialogTrigger as-child>
                        <Button variant="destructive" size="sm" @click="deletingId = pt.id">
                          <Icon name="lucide:trash" class="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{{ pt.name }}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This cannot be undone. Products with this pet type will still exist but won't match this option.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction class="bg-destructive text-white" @click="confirmDelete(pt.id)">Delete</AlertDialogAction>
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
  </div>
</template>
