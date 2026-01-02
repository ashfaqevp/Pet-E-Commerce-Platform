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

const FLAVOUR_KEYWORDS = {
  chicken: ['chicken', 'poultry'],
  beef: ['beef'],
  lamb: ['lamb'],
  duck: ['duck'],
  turkey: ['turkey'],
  game: ['game'],
  meat_mix: ['meat selection', 'meat menus', 'meat mix'],
  tuna: ['tuna'],
  salmon: ['salmon'],
  sardine: ['sardine'],
  mackerel: ['mackerel'],
  anchovy: ['anchovy'],
  shrimp: ['shrimp'],
  krill: ['krill'],
  mussels: ['mussels'],
  trout: ['trout'],
  ocean_fish: ['ocean fish', 'ocean'],
  fish_mix: ['fish selection', 'fish mix', 'pond mix'],
  rice: ['rice'],
  spinach: ['spinach'],
  pumpkin: ['pumpkin'],
  carrot: ['carrot'],
  tomato: ['tomato'],
  cheese: ['cheese'],
  vegetable: ['vegetable', 'veg'],
  algae: ['algae', 'spirulina'],
  gourmet: ['gourmet'],
  fruit: ['fruit', 'fruitblend'],
  milk: ['milk'],
  egg: ['egg', 'egg yolk'],
  insect: ['mealworm', 'bloodworm', 'worms']
}

const deriveFlavour = (productName) => {
  const name = String(productName || '').toLowerCase()
  for (const [flavour, keywords] of Object.entries(FLAVOUR_KEYWORDS)) {
    for (const kw of keywords) {
      if (name.includes(kw)) return flavour
    }
  }
  return null
}

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const res = arr.map((o) => {
  const flavour = deriveFlavour(o?.name || '')
  return { ...(o || {}), flavour }
})

await writeFile(output, JSON.stringify(res, null, 2), 'utf8')

const nonNull = res.filter(o => typeof o.flavour === 'string' && o.flavour).length
console.log(JSON.stringify({ input, output, updated: res.length, with_flavour: nonNull }))
