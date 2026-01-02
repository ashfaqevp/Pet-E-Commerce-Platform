import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const cwd = process.cwd()
const input = 'data/products.json'
const outPath = path.resolve(cwd, input)

const buf = await readFile(outPath, 'utf8')
const arr = JSON.parse(buf)

const mapPet = (v) => {
  const s = String(v ?? '').trim()
  if (!s) return null
  const lower = s.toLowerCase()
  if (lower === 'aquarium') return 'fish'
  if (lower === 'others') return 'other'
  if (lower === 'other') return 'other'
  if (lower === 'fish' || lower === 'cat' || lower === 'dog' || lower === 'bird') return lower
  return 'other'
}

const normLabel = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
const PRODUCT_TYPE_MAP = {
  'ACCESSORIES': 'accessories',
  'AQUARIUM ACCESSORIES': 'accessories',
  'BIRD ACCESSORIES': 'accessories',
  'CARRY CAGE': 'accessories',
  'AIR PUMP': 'equipment',
  'AQUARIUM.PUMP': 'equipment',
  'AQUARIUM FILTER': 'equipment',
  'AQUARIUM HEATER': 'equipment',
  'AQUARIUM': 'habitat',
  'BETTA TANK': 'habitat',
  'TURTLE TANK': 'habitat',
  'FOOD': 'food',
  'FISH FOOD': 'food',
  'BIRD FOOD': 'food',
  'HAMSTE FOOD': 'food',
  'RABBITS FOOD': 'food',
  'TURTLE FOOD': 'food',
  'PET MILK': 'food',
  'CATNIP': 'treats',
  'VITAMIN': 'health',
  'GROOMING': 'grooming',
  'SHAMPOO': 'grooming',
  'PERFUMES': 'grooming',
  'DEODORISER': 'grooming',
  'LITTER': 'grooming',
  'PAD': 'grooming',
}
const mapProductType = (label) => {
  const key = normLabel(label)
  if (!key) return null
  return PRODUCT_TYPE_MAP[key] ?? null
}

const res = arr.map((r) => {
  const pet = mapPet(r?.pet ?? r?.category1)
  const label = r?.category2 ?? null
  const product_type = mapProductType(label)
  const { category1, category2, ...rest } = r || {}
  return { ...rest, pet, label, product_type }
})

await writeFile(outPath, JSON.stringify(res, null, 2), 'utf8')

console.log(JSON.stringify({ updated: res.length, path: outPath }))
