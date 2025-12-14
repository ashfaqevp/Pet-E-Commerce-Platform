<script setup lang="ts">
interface MenuItem {
  label: string
  href: string
  icon: string
}

const menu: MenuItem[] = [
  { label: 'Dashboard', href: '/admin', icon: 'lucide:layout-dashboard' },
  { label: 'Products', href: '/admin/products', icon: 'lucide:package' },
  { label: 'Categories', href: '/admin/categories', icon: 'lucide:layers' },
  { label: 'Subcategories', href: '/admin/categories/subcategories', icon: 'lucide:indent-increase' },
  { label: 'Orders', href: '/admin/orders', icon: 'lucide:shopping-cart' },
  { label: 'Payments', href: '/admin/payments', icon: 'lucide:credit-card' },
  { label: 'Users', href: '/admin/users', icon: 'lucide:users' },
  { label: 'Settings', href: '/admin/settings', icon: 'lucide:settings' },
]

const mobileOpen = ref(false)

const toggleMobile = () => {
  mobileOpen.value = !mobileOpen.value
}

const supabase = useSupabaseClient()
const logout = async () => {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <div class="min-h-dvh bg-background text-foreground">
    <header class="sticky top-0 z-30 bg-card border-b border-border">
      <div class="flex items-center justify-between px-4 py-3 md:px-6">
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="icon" class="md:hidden" @click="toggleMobile">
            <Icon name="lucide:menu" class="h-5 w-5" />
          </Button>
          <NuxtLink to="/admin" class="font-semibold tracking-wide">BLACKHORSE Admin</NuxtLink>
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
                  <AvatarImage src="/favicon.ico" />
                  <AvatarFallback>BH</AvatarFallback>
                </Avatar>
                Admin
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem as="button" @click="navigateTo('/admin/settings')">
                <Icon name="lucide:settings" class="h-4 w-4 mr-2" />Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem as="button" @click="logout">
                <Icon name="lucide:log-out" class="h-4 w-4 mr-2" />Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

    <div class="flex">
      <aside class="hidden md:block">
        <Sidebar side="left" variant="sidebar" collapsible="none">
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="item in menu" :key="item.href">
                <SidebarMenuButton :data-active="useRoute().path === item.href" as-child>
                  <NuxtLink :to="item.href">
                    <Icon :name="item.icon" />
                    <span>{{ item.label }}</span>
                  </NuxtLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton as-child>
                  <button type="button" @click="navigateTo('/admin/settings')">
                    <Icon name="lucide:settings" />
                    <span>Settings</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton as-child>
                  <button type="button" @click="logout">
                    <Icon name="lucide:log-out" />
                    <span>Logout</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </aside>

      <!-- Content -->
      <main class="flex-1 p-4 md:p-6">
        <slot />
      </main>
    </div>

    <!-- Mobile nav -->
    <Sheet v-model:open="mobileOpen">
      <SheetContent side="left" class="w-64">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <nav class="mt-4">
          <ul class="space-y-1">
            <li v-for="item in menu" :key="item.href">
              <SheetClose as-child>
                <NuxtLink :to="item.href" class="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted">
                  <Icon :name="item.icon" class="h-4 w-4" />
                  <span>{{ item.label }}</span>
                </NuxtLink>
              </SheetClose>
            </li>
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  </div>
</template>
