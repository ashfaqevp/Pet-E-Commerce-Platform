import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const cwd = process.cwd()
const namesPath = path.resolve(cwd, 'data/product-names-no-size.txt')
const parsedOutPath = path.resolve(cwd, 'data/parsed-products.json')
const productsPath = path.resolve(cwd, 'data/products.json')

const raw = await readFile(namesPath, 'utf8')
const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

const normalize = (s) => String(s || '')
  .toLowerCase()
  .replace(/[(),]/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/kg\./g, 'kg')
  .replace(/g\./g, 'g')
  .replace(/gm\b/g, 'g')
  .replace(/ml\./g, 'ml')
  .replace(/l\./g, 'l')

const classify = (name) => {
  const t = String(name || '').toLowerCase()
  if (/^[a-z0-9\- ]{2,10}$/.test(t) && /\d/.test(t)) return 'sku'
  if (/(kg|g|gm|ml|l|food|oil|pellet|paste)/i.test(t)) return 'consumable'
  if (/(tank|pump|filter|heater|lamp|led|aquarium|compressor|feeder|light)/i.test(t)) return 'equipment'
  return 'accessory'
}

const extract = (name) => {
  const t = normalize(name)
  const mp = t.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\s*[x*]\s*(\d+)/)
  if (mp) {
    const u = mp[2].toLowerCase()
    const unit = u === 'l' ? 'liter' : (u === 'g' ? 'gram' : u)
    return { unit, size: Number(mp[1]), sizeLabel: `${mp[1]} ${mp[2]}`, multipack: Number(mp[3]), confidence: 'high' }
  }
  const sv = t.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/)
  if (sv) {
    const m = { g: 'gram', kg: 'kg', ml: 'ml', l: 'liter' }
    const u = sv[2].toLowerCase()
    return { unit: m[u], size: Number(sv[1]), sizeLabel: `${sv[1]} ${sv[2]}`, confidence: 'high' }
  }
  const w = t.match(/(\d+)\s*w\b/)
  if (w) return { unit: 'watt', size: Number(w[1]), sizeLabel: `${w[1]} W`, confidence: 'high' }
  const cm = t.match(/(\d+)\s*cm\b/)
  if (cm) return { unit: 'cm', size: Number(cm[1]), sizeLabel: `${cm[1]} cm`, confidence: 'high' }
  const inch1 = t.match(/(\d+)\s*''/)
  const inch2 = t.match(/(\d+)\s*inch\b/)
  if (inch1 || inch2) {
    const v = Number((inch1 && inch1[1]) || (inch2 && inch2[1]))
    return { unit: 'inch', size: v, sizeLabel: `${v} inch`, confidence: 'medium' }
  }
  return { unit: null, size: null, sizeLabel: null, confidence: 'low' }
}

const parsed = lines.map(name => {
  const productType = classify(name)
  if (productType !== 'consumable') {
    return { name, productType, unit: productType === 'equipment' ? 'model' : null, size: null, sizeLabel: null, confidence: 'medium' }
  }
  const ex = extract(name)
  return { name, productType, ...ex }
})

await writeFile(parsedOutPath, JSON.stringify(parsed, null, 2), 'utf8')

const productsBuf = await readFile(productsPath, 'utf8')
const products = JSON.parse(productsBuf)

const parsedMap = new Map()
for (const p of parsed) parsedMap.set(p.name, p)

let updated = 0
const updatedProducts = products.map(r => {
  const o = r || {}
  const s = o.size
  const u = o.unit
  if (s == null && u == null) {
    const match = parsedMap.get(String(o.name || ''))
    if (match) {
      const nu = match.unit ?? null
      const ns = match.size ?? null
      if (nu != null || ns != null) {
        updated++
        return { ...o, size: ns, unit: nu }
      }
    }
  }
  return o
})

await writeFile(productsPath, JSON.stringify(updatedProducts, null, 2), 'utf8')

console.log(JSON.stringify({ names: lines.length, parsed: parsed.length, updated }))

