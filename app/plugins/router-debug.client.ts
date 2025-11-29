import { useRouter } from '#imports'
import type { RouteLocationNormalized } from 'vue-router'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    console.log('[router] navigating', from.fullPath, '->', to.fullPath)
  })
  router.afterEach((to: RouteLocationNormalized) => {
    console.log('[router] arrived', to.fullPath)
  })
})