export default defineEventHandler(async () => {
  return {
    data: [
      { id: '1', name: 'Chicken & Green Pea Recipe', brand: 'Natural Balance', price: 28.99, rating: 4.8, image: '/images/placeholder.svg', discount: 0 },
      { id: '2', name: 'Whitefish & Potato Recipe', brand: 'Blue Buffalo', price: 28.99, rating: 4.8, image: '/images/placeholder.svg', discount: 25 },
      { id: '3', name: "Nature's Evolutionary Diet", brand: 'Blue Buffalo', price: 42.99, rating: 4.9, image: '/images/placeholder.svg', discount: 0 },
      { id: '4', name: 'Grain‑Free Turkey Recipe', brand: 'Wellness CORE', price: 32.5, rating: 4.7, image: '/images/placeholder.svg', discount: 15 },
    ],
  }
})