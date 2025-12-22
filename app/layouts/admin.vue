<script setup lang="ts">
import Logo from "@/components/common/Logo.vue";
import { toast } from 'vue-sonner'

interface MenuItem {
  label: string
  href: string
  icon: string
}

interface SidebarChild { label: string; href: string }
interface SidebarSection { label: string; icon: string; href?: string; children?: SidebarChild[] }

const route = useRoute()
const menu: SidebarSection[] = [
  { label: 'Dashboard', icon: 'lucide:layout-dashboard', href: '/admin' },
  {
    label: 'Products', icon: 'lucide:package', children: [
      { label: 'All Products', href: '/admin/products' },
      { label: 'Categories', href: '/admin/categories' },
    ],
  },
  { label: 'Orders', icon: 'lucide:shopping-cart', href: '/admin/orders' },
  { label: 'Payments', icon: 'lucide:credit-card', href: '/admin/payments' },
  { label: 'Customers', icon: 'lucide:users', href: '/admin/customers' },
]

const openSections = ref<Record<string, boolean>>({ Products: true })
const hasActiveChild = (item: SidebarSection) => Array.isArray(item.children) && item.children.some(c => route.path === c.href)
const isActiveItem = (item: SidebarSection) => {
  const own = item.href ? (item.href === '/admin' ? route.path === '/admin' : route.path.startsWith(item.href)) : false
  return own || hasActiveChild(item)
}
const isOpen = (item: SidebarSection) => hasActiveChild(item) || !!openSections.value[item.label]
const toggle = (label: string) => { openSections.value[label] = !openSections.value[label] }

const mobileOpen = ref(false)

const toggleMobile = () => {
  mobileOpen.value = !mobileOpen.value
}

const { data: sessionData } = await useLazyAsyncData(
  'admin-layout-session',
  async () => {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session || null
  },
  { server: true }
)
const user = computed(() => sessionData.value?.user || null)
const meta = computed(() => (user.value?.user_metadata as Record<string, unknown>) || {})
const displayName = computed(() => (meta.value.full_name as string | undefined) || (user.value?.email || 'Admin'))
const avatarUrl = computed(() => (meta.value.avatar_url as string | undefined) || (meta.value.picture as string | undefined) || '/favicon.ico')
const initials = computed(() => {
  const name = ((meta.value.full_name as string | undefined) || (user.value?.email || 'BH'))
  const parts = name.split(' ')
  const letters = parts.length >= 2 ? (parts[0][0] + parts[1][0]) : name.slice(0, 2)
  return letters.toUpperCase()
})

const { data: profile } = await useLazyAsyncData(
  'admin-layout-role',
  async () => {
    const supabase = useSupabaseClient()
    if (!user.value?.id) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single<{ role: string | null }>()
    if (error) throw error
    return data
  },
  { server: true }
)
const role = computed(() => profile.value?.role || null)

const confirmLogoutOpen = ref(false)
const performLogout = async () => {
  const supabase = useSupabaseClient()
  try {
    await supabase.auth.signOut()
    toast.success('Signed out')
    navigateTo('/admin/login')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sign out failed'
    toast.error(msg)
  } finally {
    confirmLogoutOpen.value = false
  }
}

const pageTitle = computed(() => typeof route.meta?.title === 'string' ? (route.meta.title as string) : '')

</script>

<template>
  <SidebarProvider>
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas" class="bg-white text-foreground">
      <SidebarHeader class="bg-white px-4 py-5">
        <NuxtLink to="/admin" class="font-semibold tracking-wide">
          <Logo />
        </NuxtLink>
      </SidebarHeader>
      <SidebarContent class="bg-white px-3 py-3">
        <SidebarMenu class="gap-2.5">
          <SidebarMenuItem v-for="item in menu" :key="item.label">
            <template v-if="item.children && item.children.length">
              <SidebarMenuButton class="rounded-md justify-between py-5" :isActive="isActiveItem(item)" @click="toggle(item.label)">
                <div class="flex items-center gap-2">
                  <Icon :name="item.icon" />
                  <span>{{ item.label }}</span>
                </div>
                <Icon :name="isOpen(item) ? 'lucide:chevron-down' : 'lucide:chevron-right'" class="h-4 w-4" />
              </SidebarMenuButton>
              <SidebarMenuSub v-if="isOpen(item)">
                <SidebarMenuSubItem v-for="child in item.children" :key="child.href">
                  <SidebarMenuSubButton as-child :isActive="route.path === child.href">
                    <NuxtLink :to="child.href">
                      <span>{{ child.label }}</span>
                    </NuxtLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </template>
            <template v-else>
              <SidebarMenuButton as-child class="rounded-md !py-5" :isActive="isActiveItem(item)">
                <NuxtLink :to="item.href!">
                  <Icon :name="item.icon" />
                  <span>{{ item.label }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </template>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter class="bg-white px-3 py-3">
        <SidebarMenu class="gap-2.5">
          <SidebarMenuItem>
            <SidebarMenuButton as-child class="rounded-md py-5" :isActive="route.path.startsWith('/admin/settings')">
              <NuxtLink to="/admin/settings">
                <Icon name="lucide:settings" />
                <span>Settings</span>
              </NuxtLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton as-child class="rounded-md py-5">
              <button type="button" @click="logout">
                <Icon name="lucide:log-out" />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <SidebarInset class="bg-green-50/20">
      <div class="min-h-dvh text-foreground">
        <header class="sticky top-0 z-30 bg-white border-b border-border">
          <div class="flex items-center justify-between px-4 py-3 md:px-6">
            <div class="flex items-center gap-2">
              <SidebarTrigger class="md:hidden" />
              <span v-if="pageTitle" class="font-semibold text-[#0f766e] text-base md:text-lg">{{ pageTitle }}</span>
              <!-- <NuxtLink to="/admin" class="font-semibold tracking-wide md:hidden">
                 <Logo />
              </NuxtLink> -->
            </div>
            <div class="flex items-center gap-3">
              <div class="hidden md:flex items-center gap-2">
                <Input placeholder="Search" class="w-64" />
                <Button variant="secondary" class="bg-secondary text-white">
                  <Icon name="lucide:search" class="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="icon">
                    <Icon name="lucide:bell" class="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>No new notifications</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" class="gap-2">
                    <Avatar class="h-6 w-6">
                      <AvatarImage :src="avatarUrl" />
                      <AvatarFallback>{{ initials }}</AvatarFallback>
                    </Avatar>
                    {{ displayName }}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{{ displayName }}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem v-if="role" disabled>
                    <Badge variant="outline" class="border-[#0f766e] text-[#0f766e]">{{ role }}</Badge>
                  </DropdownMenuItem>
                  <DropdownMenuItem as="button" @click="navigateTo('/admin/settings')">
                    <Icon name="lucide:settings" class="h-4 w-4 mr-2" />Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem as="button" @click="confirmLogoutOpen = true">
                    <Icon name="lucide:log-out" class="h-4 w-4 mr-2" />Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main class="p-4 md:p-6">
          <slot />
        </main>
        <AlertDialog :open="confirmLogoutOpen" @update:open="(v) => confirmLogoutOpen = v">
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription />
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction class="bg-secondary text-white" @click="performLogout">Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
