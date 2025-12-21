<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { definePageMeta, useLazyAsyncData, useSupabaseClient, useSupabaseUser, navigateTo, useHead, useState } from '#imports'
import { toast } from 'vue-sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useWindowSize } from '@vueuse/core'
import { useProfile, type ProfileRow } from '@/composables/useProfile'
import { useAddresses, type AddressRow, type AddressInput } from '@/composables/useAddresses'
import { useOrders, type OrderRow } from '@/composables/useOrders'
import PhoneEditContent from '@/components/profile/PhoneEditContent.vue'
import AddressFormContent from '@/components/profile/AddressFormContent.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import PageHeader from '@/components/common/PageHeader.vue'

definePageMeta({ layout: 'default' })
useHead({ title: 'Profile' })
const pageTitle = useState<string>('pageTitle', () => '')
pageTitle.value = 'Profile'
const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Profile' }]

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { width } = useWindowSize()
const isLg = computed(() => width.value >= 1024)

const userMeta = computed(() => (user.value?.user_metadata as Record<string, unknown>) ?? {})
const avatarUrl = computed(() => {
  const meta = userMeta.value
  const s = (meta.avatar_url || meta.picture || meta.avatar) as string | undefined
  return s && s.length ? s : undefined
})
const userName = computed(() => {
  const full = userMeta.value.full_name as string | undefined
  return full && full.length ? full : (user.value?.email || '')
})
const initials = computed(() => {
  const name = userName.value || ''
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const chars = parts.map(p => p[0]?.toUpperCase()).filter(Boolean)
  if (chars.length) return chars.join('')
  const email = user.value?.email || ''
  return email ? email[0]!.toUpperCase() : 'U'
})

const { getProfile } = useProfile()
const { listAddresses, deleteAddress, setDefault } = useAddresses()
const { listRecent } = useOrders()

const { data: profileData, pending: profilePending, error: profileError, refresh: refreshProfile } = await useLazyAsyncData(
  'profile-self',
  async () => {
    if (!user.value) return null
    return await getProfile()
  },
  { server: true }
)

const { data: addressesData, pending: addressesPending, error: addressesError, refresh: refreshAddresses } = await useLazyAsyncData(
  'profile-addresses',
  async () => {
    if (!user.value) return []
    return await listAddresses()
  },
  { server: true }
)

const { data: ordersData, pending: ordersPending, error: ordersError } = await useLazyAsyncData(
  'profile-orders',
  async () => {
    if (!user.value) return []
    return await listRecent(5)
  },
  { server: true }
)

watch(user, async (u) => {
  if (!u) {
    useAuthStore().requireAuth()
  } else {
    await refreshProfile()
    await refreshAddresses()
  }
}, { immediate: true })

const profile = computed(() => profileData.value as ProfileRow | null)
const addresses = computed(() => (addressesData.value as AddressRow[]) || [])
const orders = computed(() => (ordersData.value as OrderRow[]) || [])

const phoneInput = ref('')
const phoneDialogOpen = ref(false)
watch(profile, (p) => { phoneInput.value = p?.phone ?? '' }, { immediate: true })
const afterPhoneSaved = async () => {
  phoneDialogOpen.value = false
  await refreshProfile()
}

const addressDialogOpen = ref(false)
const editingAddress = ref<AddressRow | null>(null)
const addressForm = ref<AddressInput>({
  full_name: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  is_default: false,
})

const openAddAddress = () => {
  editingAddress.value = null
  addressForm.value = {
    full_name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    is_default: addresses.value.length === 0,
  }
  addressDialogOpen.value = true
}

const openEditAddress = (a: AddressRow) => {
  editingAddress.value = a
  addressForm.value = {
    full_name: a.full_name,
    phone: a.phone,
    address_line_1: a.address_line_1,
    address_line_2: a.address_line_2 ?? '',
    city: a.city,
    state: a.state,
    postal_code: a.postal_code,
    country: a.country,
    is_default: a.is_default,
  }
  addressDialogOpen.value = true
}

const afterAddressSaved = async () => {
  addressDialogOpen.value = false
  await refreshAddresses()
}

const removeAddressClick = async (id: string) => {
  try {
    await deleteAddress(id)
    toast.success('Address deleted')
    await refreshAddresses()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Delete failed'
    toast.error(msg)
  }
}

const setDefaultClick = async (id: string) => {
  try {
    await setDefault(id)
    toast.success('Default address set')
    await refreshAddresses()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    toast.error(msg)
  }
}

const loggingOut = ref(false)
const logout = async () => {
  try {
    loggingOut.value = true
    await supabase.auth.signOut()
    useAuthStore().showAuthDialog = false
    navigateTo('/')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <PageHeader :title="'Profile'" :items="breadcrumbs" />
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <Button variant="outline" class="text-red-600 border-red-300" :disabled="loggingOut" @click="logout">
            <Icon name="lucide:log-out" />
            Logout
        </Button>
      </div>

      <Card class="border-none rounded-2xl overflow-hidden shadow-sm bg-white">
        <CardHeader>
          <div class="flex items-center gap-2 ">
            <Icon name="lucide:user" class="h-5 w-5 " />
            <CardTitle>User Info</CardTitle>
          </div>
          <CardDescription />
        </CardHeader>
        <CardContent>
          <div v-if="profilePending" class="space-y-3">
            <Skeleton class="h-6 w-40" />
            <Skeleton class="h-6 w-56" />
          </div>
          <div v-else class="flex items-center justify-between gap-4">
            <Avatar class="size-20">
              <AvatarImage v-if="avatarUrl" :src="avatarUrl" />
              <AvatarFallback>{{ initials }}</AvatarFallback>
            </Avatar>
            <div class="flex-1 space-y-2">
              <p class="font-medium">{{ (user?.user_metadata as Record<string, unknown>)?.full_name as string || '—' }}</p>
              <p class="text-sm text-muted-foreground">{{ user?.email || '—' }}</p>
              <div class="flex items-start justify-between ">
                <p class="text-sm text-muted-foreground">Phone: {{ formatOmanPhone(profile?.phone) }}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        :variant="profile?.phone ? 'outline' : 'default'"
                        size="sm"
                        aria-label="Edit phone"
                        @click="phoneDialogOpen = true"
                      >
                        <Icon :name="profile?.phone ? 'lucide:pencil' : 'fluent:phone-add-24-regular'" />
                        <span v-if="!profile?.phone" class="hidden md:block">Add Phone number</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {{ profile?.phone ? 'Edit phone' : 'Add phone' }}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon name="lucide:map-pin" class="h-5 w-5 " />
              <CardTitle>Delivery Addresses</CardTitle>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button variant="outline" size="sm" class="w-8 h-8 p-0" aria-label="Add address" @click="openAddAddress">
                    <Icon name="lucide:plus" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add address</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription />
        </CardHeader>
        <CardContent>
          <div v-if="addressesPending" class="space-y-3">
            <Skeleton class="h-24 w-full" />
            <Skeleton class="h-24 w-full" />
          </div>
          <div v-else-if="addresses.length === 0" class="text-sm text-muted-foreground">No addresses saved.</div>
          <div v-else class="space-y-3">
            <div v-for="a in addresses" :key="a.id" class="rounded-xl border p-4 md:p-5">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 space-y-1.5">
                  <div class="flex items-center gap-2">
                    <p class="font-medium">{{ a.full_name }}</p>
                    <Badge v-if="a.is_default" variant="outline">Default</Badge>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon name="lucide:phone" class="h-4 w-4" />
                    <span>{{ formatOmanPhone(a.phone) }}</span>
                  </div>
                  <div class="text-sm">
                    <p class="leading-tight">{{ a.address_line_1 }}</p>
                    <p v-if="a.address_line_2" class="leading-tight">{{ a.address_line_2 }}</p>
                    <p class="leading-tight">{{ a.city }}, {{ a.state }} {{ a.postal_code }}</p>
                    <p class="leading-tight">{{ a.country }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <TooltipProvider v-if="!a.is_default">
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Button variant="outline" size="icon-sm" aria-label="Make default" @click="setDefaultClick(a.id)">
                          <Icon name="lucide:star" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Make default</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Button variant="outline" size="icon-sm" aria-label="Edit" @click="openEditAddress(a)">
                          <Icon name="lucide:pencil" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Button variant="outline" size="icon-sm" class="text-destructive" aria-label="Delete" @click="removeAddressClick(a.id)">
                          <Icon name="lucide:trash-2" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Icon name="lucide:shopping-bag" class="h-5 w-5 " />
            <CardTitle>Recent Orders</CardTitle>
          </div>
          <CardDescription />
        </CardHeader>
        <CardContent>
          <div v-if="ordersPending" class="space-y-3">
            <Skeleton class="h-20 w-full" />
            <Skeleton class="h-20 w-full" />
          </div>
          <div v-else-if="orders.length === 0" class="text-sm text-muted-foreground">No recent orders.</div>
          <div v-else class="space-y-3">
            <div v-for="o in orders" :key="o.id" class="rounded-xl border p-4 flex items-center justify-between">
              <div>
                <p class="font-medium">Order #{{ o.id }}</p>
                <p class="text-sm text-muted-foreground">{{ new Date(o.created_at).toLocaleDateString() }}</p>
              </div>
              <div class="flex items-center gap-3">
                <Badge variant="outline">{{ o.status }}</Badge>
                <p class="font-medium">{{ formatOMR(o.total) }}</p>
                <Button variant="outline" @click="navigateTo(`/orders/${o.id}`)">View / Track</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Address: Mobile bottom sheet -->
    <Sheet :open="addressDialogOpen && !isLg" @update:open="addressDialogOpen = $event">
      <SheetContent side="bottom" class="rounded-t-2xl p-4 sm:p-6 py-0 sm:py-0 pb-5">
        <SheetHeader class="pt-8 px-0">
          <SheetTitle>{{ editingAddress ? 'Edit Address' : 'Add Address' }}</SheetTitle>
        </SheetHeader>
        <AddressFormContent v-model="addressForm" :address-id="editingAddress?.id || undefined" @save="afterAddressSaved" />
      </SheetContent>
    </Sheet>

    <!-- Address: Desktop dialog -->
    <Dialog :open="addressDialogOpen && isLg" @update:open="addressDialogOpen = $event">
      <DialogContent class="rounded-xl">
        <DialogHeader>
          <DialogTitle>{{ editingAddress ? 'Edit Address' : 'Add Address' }}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <AddressFormContent v-model="addressForm" :address-id="editingAddress?.id || undefined" @save="afterAddressSaved" />
      </DialogContent>
    </Dialog>

    <!-- Phone: Mobile bottom sheet -->
    <Sheet :open="phoneDialogOpen && !isLg" @update:open="phoneDialogOpen = $event">
      <SheetContent side="bottom" class="rounded-t-2xl p-4 sm:p-6 py-0 sm:py-0 pb-5">
        <SheetHeader class="pt-8 px-0">
          <SheetTitle>Edit Phone</SheetTitle>
        </SheetHeader>
        <PhoneEditContent v-model="phoneInput" @save="afterPhoneSaved" />
      </SheetContent>
    </Sheet>

    <!-- Phone: Desktop dialog -->
    <Dialog :open="phoneDialogOpen && isLg" @update:open="phoneDialogOpen = $event">
      <DialogContent class="rounded-xl">
        <DialogHeader>
          <DialogTitle>Edit Phone</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <PhoneEditContent v-model="phoneInput" @save="afterPhoneSaved" />
      </DialogContent>
    </Dialog>
  </div>
</template>
