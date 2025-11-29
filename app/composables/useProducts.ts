import { ref } from 'vue'
import { $fetch } from 'ofetch'

type Product = {
  id: string
  name: string
  brand?: string
  price: number
  rating?: number
  image?: string
  discount?: number
}

export const useProducts = () => {
  const products = ref<Product[]>([])
  const loading = ref<boolean>(false)

  const fetchProducts = async () => {
    loading.value = true
    try {
      const resp = await $fetch<{ data: Product[] }>('/api/products')
      products.value = resp.data
    } finally {
      loading.value = false
    }
  }

  return { products, loading, fetchProducts }
}