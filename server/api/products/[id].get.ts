export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const products = [
    { id: '1', name: 'Chicken & Green Pea Recipe', brand: 'Natural Balance', price: 28.99, rating: 4.8, image: '/images/placeholder.svg', compareAt: 36.99 },
    { id: '2', name: 'Whitefish & Potato Recipe', brand: 'Blue Buffalo', price: 28.99, rating: 4.8, image: '/images/placeholder.svg', compareAt: 34.99 },
    { id: '3', name: "Nature's Evolutionary Diet", brand: 'Blue Buffalo', price: 42.99, rating: 4.9, image: '/images/placeholder.svg' },
    { id: '4', name: 'Grain‑Free Turkey Recipe', brand: 'Wellness CORE', price: 32.5, rating: 4.7, image: '/images/placeholder.svg', compareAt: 38.25 },
  ]
  const found = products.find((p) => p.id === id)
  return { data: found }
})