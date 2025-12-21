<script setup lang="ts">
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"

interface CrumbItem {
  label: string
  href?: string
}

const props = defineProps<{ title: string; items: CrumbItem[] }>()
</script>

<template>
  <div class="hidden md:block">
    <Breadcrumb>
      <BreadcrumbList>
        <template v-for="(c, idx) in props.items" :key="idx">
          <BreadcrumbItem>
            <BreadcrumbLink v-if="idx < props.items.length - 1" :href="c.href || '#'">
              {{ c.label }}
            </BreadcrumbLink>
            <BreadcrumbPage v-else>
              {{ c.label }}
            </BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator v-if="idx < props.items.length - 1" />
        </template>
      </BreadcrumbList>
    </Breadcrumb>
    <h1 class="mt-2 text-2xl sm:text-2xl font-semibold text-foreground">{{ props.title }}</h1>
  </div>
</template>

