<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { definePageMeta, useLazyAsyncData, useSupabaseClient, useSupabaseUser, navigateTo } from '#imports'
import { toast } from 'vue-sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfile, type ProfileRow } from '@/composables/useProfile'
import { useAddresses, type AddressRow, type AddressInput } from '@/composables/useAddresses'
import { useOrders, type OrderRow } from '@/composables/useOrders'

definePageMeta({ layout: 'default' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

watchEffect(() => {
  if (!user.value) navigateTo('/')
})

const { getProfile, updatePhone } = useProfile()
const { listAddresses, createAddress, updateAddress, deleteAddress, setDefault } = useAddresses()
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

const profile = computed(() => profileData.value as ProfileRow | null)
const addresses = computed(() => (addressesData.value as AddressRow[]) || [])
const orders = computed(() => (ordersData.value as OrderRow[]) || [])

const phoneInput = ref('')
watch(profile, (p) => { phoneInput.value = p?.phone ?? '' }, { immediate: true })
const savingPhone = ref(false)
const savePhone = async () => {
  if (!phoneInput.value || phoneInput.value.trim().length < 6) {
    toast.error('Enter a valid phone number')
    return
  }
  try {
    savingPhone.value = true
    await updatePhone(phoneInput.value.trim())
    toast.success('Profile updated')
    await refreshProfile()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    toast.error(msg)
  } finally {
    savingPhone.value = false
  }
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
    full_name: (user.value?.user_metadata as Record<string, unknown>)?.full_name as string || '',
    phone: phoneInput.value || '',
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

const submittingAddress = ref(false)
const submitAddress = async () => {
  if (!addressForm.value.full_name || !addressForm.value.address_line_1 || !addressForm.value.city || !addressForm.value.state || !addressForm.value.postal_code || !addressForm.value.country) {
    toast.error('Fill all required fields')
    return
  }
  try {
    submittingAddress.value = true
    if (editingAddress.value) {
      await updateAddress(editingAddress.value.id, addressForm.value)
      toast.success('Address updated')
    } else {
      await createAddress(addressForm.value)
      toast.success('Address added')
    }
    addressDialogOpen.value = false
    await refreshAddresses()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed'
    toast.error(msg)
  } finally {
    submittingAddress.value = false
  }
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
    useAuthStore().showPhoneDialog = false
    navigateTo('/')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold">Profile</h1>
        <Button variant="outline" class="text-red-600 border-red-300" :disabled="loggingOut" @click="logout">Logout</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Info</CardTitle>
          <CardDescription />
        </CardHeader>
        <CardContent>
          <div v-if="profilePending" class="space-y-3">
            <Skeleton class="h-6 w-40" />
            <Skeleton class="h-6 w-56" />
          </div>
          <div v-else class="flex items-center gap-4">
            <Avatar class="size-12">
              <AvatarImage :src="((user?.user_metadata as Record<string, unknown>)?.avatar_url as string) || '/images/placeholder.svg'" />
            </Avatar>
            <div>
              <p class="font-medium">{{ (user?.user_metadata as Record<string, unknown>)?.full_name as string || '—' }}</p>
              <p class="text-sm text-muted-foreground">{{ user?.email || '—' }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription />
        </CardHeader>
        <CardContent>
          <div class="space-y-3 max-w-md">
            <label class="text-sm">Phone Number</label>
            <Input v-model="phoneInput" placeholder="Phone" />
          </div>
        </CardContent>
        <CardFooter>
          <Button class="w-full max-w-md" :disabled="savingPhone" @click="savePhone">Save</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>Delivery Addresses</CardTitle>
            <Button variant="outline" @click="openAddAddress">Add Address</Button>
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
            <div v-for="a in addresses" :key="a.id" class="rounded-xl border p-4">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-medium">{{ a.full_name }}</p>
                    <Badge v-if="a.is_default" variant="outline">Default</Badge>
                  </div>
                  <p class="text-sm text-muted-foreground">{{ a.phone }}</p>
                  <p class="text-sm">{{ a.address_line_1 }}</p>
                  <p v-if="a.address_line_2" class="text-sm">{{ a.address_line_2 }}</p>
                  <p class="text-sm">{{ a.city }}, {{ a.state }} {{ a.postal_code }}</p>
                  <p class="text-sm">{{ a.country }}</p>
                </div>
                <div class="flex flex-col gap-2">
                  <Button variant="outline" @click="openEditAddress(a)">Edit</Button>
                  <Button variant="outline" @click="removeAddressClick(a.id)">Delete</Button>
                  <Button v-if="!a.is_default" @click="setDefaultClick(a.id)">Make Default</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
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
                <p class="font-medium">${{ o.total_amount.toFixed(2) }}</p>
                <Button variant="outline" @click="navigateTo(`/orders/${o.id}`)">View / Track</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog :open="addressDialogOpen" @update:open="addressDialogOpen = $event">
      <DialogContent class="rounded-xl">
        <DialogHeader>
          <DialogTitle>{{ editingAddress ? 'Edit Address' : 'Add Address' }}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <div class="space-y-3">
          <Input v-model="addressForm.full_name" placeholder="Full name" />
          <Input v-model="addressForm.phone" placeholder="Phone" />
          <Textarea v-model="addressForm.address_line_1" placeholder="Address line 1" />
          <Textarea v-model="addressForm.address_line_2" placeholder="Address line 2 (optional)" />
          <div class="grid grid-cols-2 gap-3">
            <Input v-model="addressForm.city" placeholder="City" />
            <Input v-model="addressForm.state" placeholder="State" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <Input v-model="addressForm.postal_code" placeholder="Postal code" />
            <Input v-model="addressForm.country" placeholder="Country" />
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <input id="is_default" type="checkbox" v-model="addressForm.is_default" class="rounded" />
              <label for="is_default" class="text-sm">Set as default</label>
            </div>
            <Button :disabled="submittingAddress" @click="submitAddress">Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
