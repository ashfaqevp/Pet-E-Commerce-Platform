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

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const formatSize = (size, unit) => {
  if (size == null || !unit) return null
  return `${size}${unit}`
}

const formatFlavour = (flavour) =>
  flavour ? String(flavour).replace(/_/g, ' ') : null

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

const TEMPLATES = {
  food: {
    intro: ['A nutritious', 'A high-quality', 'A balanced', 'A wholesome'],
    body: [
      'meal designed for',
      'food formulated for',
      'nutrition made for',
    ],
    benefits: [
      'supports daily nutrition',
      'ideal for everyday feeding',
      'helps maintain overall health',
    ],
    allowFlavour: true,
  },
  treats: {
    intro: ['A tasty', 'A delicious', 'A rewarding'],
    body: ['treat suitable for'],
    benefits: [
      'perfect for occasional rewards',
      'great for training and bonding',
    ],
    allowFlavour: true,
  },
  health: {
    intro: ['A trusted', 'A gentle', 'An effective'],
    body: ['health solution for', 'wellness product for'],
    benefits: [
      'supports overall wellbeing',
      'helps maintain good health',
    ],
  },
  grooming: {
    intro: ['A gentle', 'A premium', 'A reliable'],
    body: ['grooming product for', 'hygiene solution for'],
    benefits: [
      'keeps pets clean and fresh',
      'supports coat and skin care',
    ],
  },
  accessories: {
    intro: ['A practical', 'A convenient', 'An essential'],
    body: ['accessory designed for', 'daily-use item for'],
    benefits: [
      'easy to use and maintain',
      'ideal for everyday needs',
    ],
  },
  equipment: {
    intro: ['A reliable', 'A high-performance', 'A durable'],
    body: ['equipment designed for', 'device suitable for'],
    benefits: [
      'ensures stable operation',
      'ideal for continuous use',
      'built for long-lasting performance',
    ],
  },
  habitat: {
    intro: ['A spacious', 'A well-designed', 'A sturdy'],
    body: ['habitat suitable for', 'living space designed for'],
    benefits: [
      'provides comfort and safety',
      'creates a suitable environment',
    ],
  },
}

const generateDescription = (product) => {
  const type = String(product.product_type || '').toLowerCase()
  const tpl = TEMPLATES[type] || TEMPLATES.accessories
  const pet = PET_LABEL[product.pet_type] || 'pets'
  const age = product.age && AGE_LABEL[product.age]
  const sizeText = formatSize(product.size, product.unit)
  const flavour = formatFlavour(product.flavour)
  const parts = []
  parts.push(pick(tpl.intro))
  parts.push(pick(tpl.body))
  parts.push(age || pet)
  if (tpl.allowFlavour && flavour) {
    parts.push(`with ${flavour}`)
  }
  if (sizeText) {
    parts.push(`(${sizeText})`)
  }
  parts.push(pick(tpl.benefits))
  return parts.join(' ') + '.'
}

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const res = arr.map((o) => {
  const desc = generateDescription(o || {})
  const { id, base_product_id, ...rest } = o || {}
  return {
    id: String(id || ''),
    base_product_id: String(base_product_id || ''),
    ...rest,
    description: desc,
  }
})

await writeFile(output, JSON.stringify(res, null, 2), 'utf8')

const withDesc = res.filter(
  (o) => typeof o.description === 'string' && o.description.endsWith('.'),
).length

console.log(
  JSON.stringify({
    input,
    output,
    updated: res.length,
    with_description: withDesc,
  }),
)
