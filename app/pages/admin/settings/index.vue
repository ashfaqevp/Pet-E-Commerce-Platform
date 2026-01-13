<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useField } from 'vee-validate'
import { z } from 'zod'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
  title: 'Settings',
})

const { data: sessionData, pending, error, refresh } = await useLazyAsyncData(
  'admin-settings-session',
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session || null
  },
  { server: true }
)

const user = computed(() => sessionData.value?.user || null)

const schema = toTypedSchema(z.object({ full_name: z.string().min(1) }))

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
  initialValues: {
    full_name: (user.value?.user_metadata as Record<string, unknown>)?.full_name as string || '',
  },
})

const { value: fullName, errorMessage: fullNameError } = useField<string>('full_name')

const onSubmit = handleSubmit(async (values) => {
  const supabase = useSupabaseClient()
  try {
    const { error: e } = await supabase.auth.updateUser({ data: { full_name: values.full_name } })
    if (e) throw e
    toast.success('Account updated')
    refresh()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    toast.error(msg)
  }
})

interface SiteConfigRow {
  id: string
  shipping_fee: number
  tax_rate: number
  free_shipping_min_amount: number
  updated_at?: string
}

const { data: configData, pending: configPending, error: configError, refresh: refreshConfig } = await useLazyAsyncData(
  'admin-site-config',
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('site_config')
      .select('id, shipping_fee, tax_rate, free_shipping_min_amount, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
    if (error) throw error
    const row = (data?.[0] ?? null) as Partial<SiteConfigRow> | null
    if (!row) return null
    return {
      id: String(row.id),
      shipping_fee: Number(row.shipping_fee ?? 10),
      tax_rate: Number(row.tax_rate ?? 0.05),
      free_shipping_min_amount: Number(row.free_shipping_min_amount ?? 50),
      updated_at: row.updated_at ? String(row.updated_at) : undefined,
    } as SiteConfigRow
  },
  { server: true }
)

const siteConfig = computed<SiteConfigRow | null>(() => (configData.value as SiteConfigRow | null) || null)

const configSchema = toTypedSchema(
  z.object({
    shipping_fee: z.coerce.number().min(0).max(10000),
    tax_rate: z.coerce.number().min(0).max(1),
    free_shipping_min_amount: z.coerce.number().min(0).max(100000),
  })
)

const { handleSubmit: handleSaveConfig, isSubmitting: savingConfig, setFieldValue: setConfigField } = useForm({
  validationSchema: configSchema,
  initialValues: {
    shipping_fee: siteConfig.value?.shipping_fee ?? 10,
    tax_rate: siteConfig.value?.tax_rate ?? 0.05,
    free_shipping_min_amount: siteConfig.value?.free_shipping_min_amount ?? 50,
  },
})

const { value: shippingFee, errorMessage: shippingFeeError } = useField<number>('shipping_fee')
const { value: taxRate, errorMessage: taxRateError } = useField<number>('tax_rate')
const { value: freeShippingMin, errorMessage: freeShippingMinError } = useField<number>('free_shipping_min_amount')

watch(siteConfig, (val) => {
  if (!val) return
  setConfigField('shipping_fee', val.shipping_fee)
  setConfigField('tax_rate', val.tax_rate)
  setConfigField('free_shipping_min_amount', val.free_shipping_min_amount)
}, { immediate: true })

const onSaveConfig = handleSaveConfig(async (values) => {
  const supabase = useSupabaseClient()
  try {
    if (siteConfig.value?.id) {
      const { error: e } = await supabase
        .from('site_config')
        .update({ shipping_fee: values.shipping_fee, tax_rate: values.tax_rate, free_shipping_min_amount: values.free_shipping_min_amount } as unknown as never)
        .eq('id', siteConfig.value.id)
      if (e) throw e
    } else {
      const { error: e } = await supabase
        .from('site_config')
        .insert([{ shipping_fee: values.shipping_fee, tax_rate: values.tax_rate, free_shipping_min_amount: values.free_shipping_min_amount }] as unknown as never)
      if (e) throw e
    }
    toast.success('Checkout settings updated')
    await refreshConfig()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update settings'
    toast.error(msg)
  }
})

interface ChangePasswordForm {
  new_password: string
  confirm_password: string
}

const passwordSchema = toTypedSchema(
  z
    .object({
      new_password: z.string().min(8, 'Minimum 8 characters'),
      confirm_password: z.string().min(8, 'Minimum 8 characters'),
    })
    .refine(v => v.confirm_password === v.new_password, {
      path: ['confirm_password'],
      message: 'Passwords must match',
    })
)

const {
  handleSubmit: submitPasswordChange,
  isSubmitting: changingPassword,
  resetForm: resetPasswordForm,
} = useForm<ChangePasswordForm>({
  validationSchema: passwordSchema,
  initialValues: {
    new_password: '',
    confirm_password: '',
  },
})

const { value: newPassword, errorMessage: newPasswordError } = useField<string>('new_password')
const { value: confirmPassword, errorMessage: confirmPasswordError } = useField<string>('confirm_password')

const showNewPassword = ref<boolean>(false)
const showConfirmPassword = ref<boolean>(false)

const onChangePassword = submitPasswordChange(async (values) => {
  const supabase = useSupabaseClient()
  try {
    const { error: e } = await supabase.auth.updateUser({ password: values.new_password })
    if (e) throw e
    toast.success('Password updated successfully')
    resetPasswordForm()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update password'
    toast.error(msg)
  }
})

interface BannerRow {
  id: string
  name: string
  mobile: string
  desktop: string
  created_at?: string
}

const { data: bannersData, pending: bannersPending, error: bannersError, refresh: refreshBanners } = await useLazyAsyncData(
  'admin-banners',
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('banners')
      .select('id,name,mobile,desktop,created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as BannerRow[]
  },
  { server: true }
)

const addOpen = ref(false)
const editOpen = ref(false)
const editing = ref<BannerRow | null>(null)

const { handleSubmit: bannerSubmit, isSubmitting: bannerSubmitting, resetForm: resetBannerForm, setFieldValue: setBannerField } = useForm({
  validationSchema: toTypedSchema(z.object({ name: z.string().min(1) })),
  initialValues: { name: '' },
})
const { value: bannerName, errorMessage: bannerNameError } = useField<string>('name')

const mobileFile = ref<File | null>(null)
const desktopFile = ref<File | null>(null)
const mobileEditFile = ref<File | null>(null)
const desktopEditFile = ref<File | null>(null)

const mobilePreview = computed(() => (mobileFile.value ? URL.createObjectURL(mobileFile.value) : ''))
const desktopPreview = computed(() => (desktopFile.value ? URL.createObjectURL(desktopFile.value) : ''))
const mobileEditPreview = computed(() => (mobileEditFile.value ? URL.createObjectURL(mobileEditFile.value) : ''))
const desktopEditPreview = computed(() => (desktopEditFile.value ? URL.createObjectURL(desktopEditFile.value) : ''))

const openAddBanner = () => {
  addOpen.value = true
  editOpen.value = false
  editing.value = null
  setBannerField('name', '')
  mobileFile.value = null
  desktopFile.value = null
}

const openEditBanner = (row: BannerRow) => {
  editOpen.value = true
  addOpen.value = false
  editing.value = row
  setBannerField('name', row.name)
  mobileEditFile.value = null
  desktopEditFile.value = null
}

const uploadImage = async (path: string, file: File): Promise<string> => {
  const supabase = useSupabaseClient()
  const storage = supabase.storage.from('product-images')
  const { error } = await storage.upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data } = storage.getPublicUrl(path)
  return data.publicUrl
}

const onCreateBanner = bannerSubmit(async (values) => {
  const supabase = useSupabaseClient()
  try {
    if (!mobileFile.value || !desktopFile.value) {
      toast.error('Upload both mobile and desktop images')
      return
    }
    const extM = mobileFile.value.name.includes('.') ? mobileFile.value.name.substring(mobileFile.value.name.lastIndexOf('.')) : ''
    const extD = desktopFile.value.name.includes('.') ? desktopFile.value.name.substring(desktopFile.value.name.lastIndexOf('.')) : ''
    const mobileUrl = await uploadImage(`banners/${Date.now()}-mobile${extM}`, mobileFile.value)
    const desktopUrl = await uploadImage(`banners/${Date.now()}-desktop${extD}`, desktopFile.value)
    const { error: e } = await supabase
      .from('banners')
      .insert([{ name: values.name, mobile: mobileUrl, desktop: desktopUrl }] as unknown as never)
    if (e) throw e
    toast.success('Banner added')
    addOpen.value = false
    resetBannerForm()
    mobileFile.value = null
    desktopFile.value = null
    await refreshBanners()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to add banner'
    toast.error(msg)
  }
})

const onUpdateBanner = bannerSubmit(async (values) => {
  const supabase = useSupabaseClient()
  try {
    if (!editing.value) return
    let mobileUrl = editing.value.mobile
    let desktopUrl = editing.value.desktop
    if (mobileEditFile.value) {
      const ext = mobileEditFile.value.name.includes('.') ? mobileEditFile.value.name.substring(mobileEditFile.value.name.lastIndexOf('.')) : ''
      mobileUrl = await uploadImage(`banners/${editing.value.id}-${Date.now()}-mobile${ext}`, mobileEditFile.value)
    }
    if (desktopEditFile.value) {
      const ext = desktopEditFile.value.name.includes('.') ? desktopEditFile.value.name.substring(desktopEditFile.value.name.lastIndexOf('.')) : ''
      desktopUrl = await uploadImage(`banners/${editing.value.id}-${Date.now()}-desktop${ext}`, desktopEditFile.value)
    }
    const { error: e } = await supabase
      .from('banners')
      .update({ name: values.name, mobile: mobileUrl, desktop: desktopUrl } as unknown as never)
      .eq('id', editing.value.id)
    if (e) throw e
    toast.success('Banner updated')
    editOpen.value = false
    resetBannerForm()
    mobileEditFile.value = null
    desktopEditFile.value = null
    editing.value = null
    await refreshBanners()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update banner'
    toast.error(msg)
  }
})

const onDeleteBanner = async (row: BannerRow) => {
  const supabase = useSupabaseClient()
  try {
    const { error: e } = await supabase
      .from('banners')
      .delete()
      .eq('id', row.id)
    if (e) throw e
    toast.success('Banner deleted')
    await refreshBanners()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete banner'
    toast.error(msg)
  }
}

onMounted(() => {
  const supabase = useSupabaseClient()
  const channel = supabase
    .channel('public:admin-banners')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
      refreshBanners()
    })
    .subscribe()
  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Homepage Banners</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex items-center justify-between mb-4">
          <Dialog v-model:open="addOpen">
            <DialogTrigger as-child>
              <Button variant="default" @click="openAddBanner">Add Banner</Button>
            </DialogTrigger>
            <DialogContent class="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Add Banner</DialogTitle>
              </DialogHeader>
              <form class="space-y-4" @submit.prevent="onCreateBanner">
                <div class="space-y-2">
                  <Label for="banner-name">Name</Label>
                  <Input id="banner-name" v-model="bannerName" placeholder="Banner name" />
                  <p v-if="bannerNameError" class="text-destructive text-xs mt-1">{{ bannerNameError }}</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label for="mobile-upload">Mobile Image</Label>
                    <Input id="mobile-upload" type="file" accept="image/*" @change="(e: Event) => { const f = (e.target as HTMLInputElement).files?.[0] || null; mobileFile = f }" />
                    <p class="text-xs text-muted-foreground">Recommended: 750×420</p>
                    <div class="border rounded-md w-full h-40 overflow-hidden bg-muted/20">
                      <img v-if="mobilePreview" :src="mobilePreview" alt="Mobile preview" class="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div class="space-y-2">
                    <Label for="desktop-upload">Desktop Image</Label>
                    <Input id="desktop-upload" type="file" accept="image/*" @change="(e: Event) => { const f = (e.target as HTMLInputElement).files?.[0] || null; desktopFile = f }" />
                    <p class="text-xs text-muted-foreground">Recommended: 1920×720</p>
                    <div class="border rounded-md w-full h-40 overflow-hidden bg-muted/20">
                      <img v-if="desktopPreview" :src="desktopPreview" alt="Desktop preview" class="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
                <div class="flex justify-end gap-2">
                  <Button type="submit" :disabled="bannerSubmitting">Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div v-if="bannersPending"><Skeleton class="h-10 w-full" /></div>
        <div v-else-if="bannersError">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ bannersError.message }}</AlertDescription>
          </Alert>
        </div>
        <div v-else>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Desktop</TableHead>
                <TableHead class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="b in (bannersData as BannerRow[] || [])" :key="b.id">
                <TableCell>{{ b.name }}</TableCell>
                <TableCell>
                  <div class="border rounded-md w-32 h-20 md:w-48 md:h-28 overflow-hidden bg-muted/20">
                    <img :src="b.mobile" alt="Mobile" class="w-full h-full object-cover" />
                  </div>
                </TableCell>
                <TableCell>
                  <div class="border rounded-md w-32 h-20 md:w-48 md:h-28 overflow-hidden bg-muted/20">
                    <img :src="b.desktop" alt="Desktop" class="w-full h-full object-cover" />
                  </div>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-2">
                    <Button variant="outline" size="sm" @click="openEditBanner(b)">Edit</Button>
                    <AlertDialog>
                      <AlertDialogTrigger as-child>
                        <Button variant="destructive" size="sm">Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete banner?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction @click="onDeleteBanner(b)">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
            <TableFooter v-if="(bannersData as BannerRow[] || []).length === 0">
              <TableRow>
                <TableCell colspan="4">
                  <div class="flex items-center justify-between">
                    <p class="text-sm text-muted-foreground">No banners yet</p>
                    <Button size="sm" @click="openAddBanner">Create first banner</Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          <Dialog v-model:open="editOpen">
            <DialogContent class="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Edit Banner</DialogTitle>
              </DialogHeader>
              <form class="space-y-4" @submit.prevent="onUpdateBanner">
                <div class="space-y-2">
                  <Label for="banner-name-edit">Name</Label>
                  <Input id="banner-name-edit" v-model="bannerName" placeholder="Banner name" />
                  <p v-if="bannerNameError" class="text-destructive text-xs mt-1">{{ bannerNameError }}</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label for="mobile-upload-edit">Mobile Image</Label>
                    <Input id="mobile-upload-edit" type="file" accept="image/*" @change="(e: Event) => { const f = (e.target as HTMLInputElement).files?.[0] || null; mobileEditFile = f }" />
                    <p class="text-xs text-muted-foreground">Recommended: 750×420</p>
                    <div class="border rounded-md w-full h-40 overflow-hidden bg-muted/20">
                      <img v-if="mobileEditPreview" :src="mobileEditPreview" alt="Mobile preview" class="w-full h-full object-cover" />
                      <img v-else :src="editing?.mobile || ''" alt="Mobile" class="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div class="space-y-2">
                    <Label for="desktop-upload-edit">Desktop Image</Label>
                    <Input id="desktop-upload-edit" type="file" accept="image/*" @change="(e: Event) => { const f = (e.target as HTMLInputElement).files?.[0] || null; desktopEditFile = f }" />
                    <p class="text-xs text-muted-foreground">Recommended: 1920×720</p>
                    <div class="border rounded-md w-full h-40 overflow-hidden bg-muted/20">
                      <img v-if="desktopEditPreview" :src="desktopEditPreview" alt="Desktop preview" class="w-full h-full object-cover" />
                      <img v-else :src="editing?.desktop || ''" alt="Desktop" class="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
                <div class="flex justify-end gap-2">
                  <Button type="submit" :disabled="bannerSubmitting">Save Changes</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
    <!-- <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="pending"><Skeleton class="h-10 w-full" /></div>
        <div v-else-if="error">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ error.message }}</AlertDescription>
          </Alert>
        </div>
        <div v-else>
          <form class="space-y-4" @submit.prevent="onSubmit">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label for="email">Email</Label>
                <Input id="email" :value="user?.email || ''" disabled />
              </div>
              <div>
                <Label for="full-name">Full Name</Label>
                <Input id="full-name" v-model="fullName" placeholder="Your name" />
                <p v-if="fullNameError" class="text-destructive text-xs mt-1">{{ fullNameError }}</p>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <Button type="submit" :disabled="isSubmitting">Save</Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card> -->

    <Card>
      <CardHeader>
        <CardTitle>Checkout Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="configPending"><Skeleton class="h-10 w-full" /></div>
        <div v-else-if="configError">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ configError.message }}</AlertDescription>
          </Alert>
        </div>
        <div v-else>
          <form class="space-y-4" @submit.prevent="onSaveConfig">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label for="shipping_fee">Delivery Fee (OMR)</Label>
                <Input id="shipping_fee" v-model.number="shippingFee" type="number" step="0.001" min="0" />
                <p v-if="shippingFeeError" class="text-destructive text-xs mt-1">{{ shippingFeeError }}</p>
              </div>
              <div>
                <Label for="tax_rate">Tax Rate (0–1)</Label>
                <Input id="tax_rate" v-model.number="taxRate" type="number" step="0.001" min="0" max="1" />
                <p v-if="taxRateError" class="text-destructive text-xs mt-1">{{ taxRateError }}</p>
              </div>
              <div>
                <Label for="free_shipping_min_amount">Free Delivery Above (OMR)</Label>
                <Input id="free_shipping_min_amount" v-model.number="freeShippingMin" type="number" step="0.001" min="0" />
                <p v-if="freeShippingMinError" class="text-destructive text-xs mt-1">{{ freeShippingMinError }}</p>
                <p class="text-xs text-muted-foreground">Delivery fee will be waived for orders equal or above this amount</p>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <p class="text-xs text-muted-foreground">Last updated: {{ siteConfig?.updated_at || '—' }}</p>
              <div class="flex justify-end gap-2">
                <Button type="submit" :disabled="savingConfig">Save Checkout Settings</Button>
              </div>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="onChangePassword">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label for="new-password">New Password</Label>
              <div class="flex gap-2">
                <Input id="new-password" :type="showNewPassword ? 'text' : 'password'" v-model="newPassword" placeholder="••••••••" />
                <Button type="button" variant="ghost" size="sm" @click="showNewPassword = !showNewPassword">{{ showNewPassword ? 'Hide' : 'Show' }}</Button>
              </div>
              <p v-if="newPasswordError" class="text-destructive text-xs mt-1">{{ newPasswordError }}</p>
              <p class="text-xs text-muted-foreground">Use at least 8 characters</p>
            </div>
            <div>
              <Label for="confirm-password">Confirm New Password</Label>
              <div class="flex gap-2">
                <Input id="confirm-password" :type="showConfirmPassword ? 'text' : 'password'" v-model="confirmPassword" placeholder="••••••••" />
                <Button type="button" variant="ghost" size="sm" @click="showConfirmPassword = !showConfirmPassword">{{ showConfirmPassword ? 'Hide' : 'Show' }}</Button>
              </div>
              <p v-if="confirmPasswordError" class="text-destructive text-xs mt-1">{{ confirmPasswordError }}</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <Button type="submit" :disabled="changingPassword">Update Password</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
