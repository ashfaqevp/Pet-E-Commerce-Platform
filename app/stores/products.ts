import { defineStore } from 'pinia'
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
  compareAt?: number
}

export const useProductsStore = defineStore('products', () => {
  const list = ref<Product[]>([])
  const loading = ref<boolean>(false)

  const fetchAll = async () => {
    loading.value = true
    try {
      const resp = await $fetch<{ data: Product[] }>('/api/products')
      list.value = resp.data
    } finally {
      loading.value = false
    }
  }

  return { list, loading, fetchAll }
})
