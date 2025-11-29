import { useCartStore } from '../stores/cart'

export const useCart = () => {
  const cart = useCartStore()
  const addItem = (product: any) => cart.addItem(product)
  return { items: cart.items, total: cart.total, addItem }
}