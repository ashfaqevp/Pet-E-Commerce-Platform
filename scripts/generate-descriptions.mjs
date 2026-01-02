import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const args = process.argv.slice(2)
const opts = {}
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a.startsWith('--')) {
    const k = a.replace(/^--+/, '')
    const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true'
    opts[k] = v
  }
}

const cwd = process.cwd()
const input = path.resolve(cwd, opts.input || 'data/products.json')
const output = path.resolve(cwd, opts.output || 'data/products.json')

const INTRO_TEMPLATES = [
  'A nutritious',
  'A high-quality',
  'A carefully prepared',
  'A balanced',
  'A wholesome',
]

const PRODUCT_TEMPLATES = {
  food: [
    'meal designed for',
    'food formulated for',
    'diet suitable for',
    'nutrition made for',
  ],
}

const PET_LABEL = {
  cat: 'cats',
  dog: 'dogs',
  fish: 'fish',
  bird: 'birds',
  other: 'pets',
}

const AGE_LABEL = {
  kitten: 'kittens',
  puppy: 'puppies',
  adult: 'adult pets',
  senior: 'senior pets',
}

const FLAVOUR_PHRASES = [
  'with delicious {flavour}',
  'featuring {flavour}',
  'made using {flavour}',
  'prepared with {flavour}',
]

const SIZE_PHRASES = [
  'available in {size}{unit}',
  'packed as {size}{unit}',
  'comes in a {size}{unit} pack',
]

const BENEFIT_PHRASES = [
  'supports daily nutrition',
  'helps maintain overall health',
  'ideal for everyday feeding',
  'suitable for regular meals',
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const formatFlavour = (flavour) => flavour ? String(flavour).replace('_', ' ') : null

const generateDescription = (product) => {
  const parts = []
  parts.push(pick(INTRO_TEMPLATES))
  if (String(product.product_type || '').toLowerCase() === 'food') {
    parts.push(pick(PRODUCT_TEMPLATES.food))
  }
  const age = product.age || null
  const pet = String(product.pet_type || 'other').toLowerCase()
  if (age && AGE_LABEL[age]) parts.push(AGE_LABEL[age])
  else parts.push(PET_LABEL[pet] || 'pets')
  const flav = formatFlavour(product.flavour || null)
  if (flav) parts.push(pick(FLAVOUR_PHRASES).replace('{flavour}', flav))
  const size = product.size
  const unit = product.unit
  if (size != null && unit) parts.push(pick(SIZE_PHRASES).replace('{size}', size).replace('{unit}', unit))
  parts.push(pick(BENEFIT_PHRASES))
  return parts.join(' ') + '.'
}

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const res = arr.map(o => {
  const desc = generateDescription(o || {})
  const { id, base_product_id, ...rest } = o || {}
  return { id: String(id || ''), base_product_id: String(base_product_id || ''), ...rest, description: desc }
})

await writeFile(output, JSON.stringify(res, null, 2), 'utf8')

const withDesc = res.filter(o => typeof o.description === 'string' && o.description.endsWith('.')).length
console.log(JSON.stringify({ input, output, updated: res.length, with_description: withDesc }))

