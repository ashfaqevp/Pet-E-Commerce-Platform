export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  router.beforeEach((to, from) => {
    // Prevent unexpected automatic redirect to /login on initial load
    // if (!from.name && to.path === '/login' && !to.query.redirect) {
    //   // Keep user on home; login remains accessible when user clicks it intentionally later
    //   return '/'
    // }
  })
})