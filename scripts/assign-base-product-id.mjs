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

function buildGroupKey(name) {
  const base = String(name || '')
    .toLowerCase()
    .replace(/\b\d+(?:\.\d+)?\s?(?:kg|g|gm|ml|l|pcs)\b/g, '')
    .replace(/\*\d+/g, '')
    .replace(/[^a-z\s&]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const first = base.split(' ')[0] || ''
  return first
}

function assignBaseProductIds(products) {
  const baseMap = new Map()
  return products.map((product) => {
    const key = buildGroupKey(product?.name || '')
    const id = String(product?.id || '')
    if (!baseMap.has(key)) {
      baseMap.set(key, id)
      const { id: _id, base_product_id: _bp, ...rest } = product || {}
      return { id, base_product_id: id, ...rest }
    }
    const baseId = baseMap.get(key)
    const { id: _id, base_product_id: _bp, ...rest } = product || {}
    return { id, base_product_id: baseId, ...rest }
  })
}

const buf = await readFile(input, 'utf8')
const arr = JSON.parse(buf)

const updated = assignBaseProductIds(arr)

await writeFile(output, JSON.stringify(updated, null, 2), 'utf8')

const groups = new Set(updated.map(p => buildGroupKey(p.name))).size
console.log(JSON.stringify({ input, output, products: updated.length, groups }))
