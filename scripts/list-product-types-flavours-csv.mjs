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
const input = path.resolve(cwd, opts.input || 'data/full_products.csv')
const output = path.resolve(cwd, opts.output || 'data/product-attributes.json')

const parseCsvLine = (line) => {
  const out = []
  let cur = ''
  let i = 0
  let inQuotes = false
  while (i < line.length) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 2
          continue
        } else {
          inQuotes = false
          i++
          continue
        }
      } else {
        cur += c
        i++
        continue
      }
    } else {
      if (c === '"') {
        inQuotes = true
        i++
        continue
      }
      if (c === ',') {
        out.push(cur)
        cur = ''
        i++
        continue
      }
      cur += c
      i++
    }
  }
  out.push(cur)
  return out
}

const content = await readFile(input, 'utf8')
const lines = content.split(/\r?\n/)
const headerLine = lines.shift() || ''
const headerCols = parseCsvLine(headerLine)
const idxType = headerCols.indexOf('product_type')
const idxFlavour = headerCols.indexOf('flavour')
const idxUnit = headerCols.indexOf('unit')
if (idxType === -1) throw new Error('product_type column not found in CSV')
if (idxFlavour === -1) throw new Error('flavour column not found in CSV')
if (idxUnit === -1) throw new Error('unit column not found in CSV')

const typeSet = new Set()
const flavourSet = new Set()
const unitSet = new Set()
for (const ln of lines) {
  if (!ln) continue
  const cols = parseCsvLine(ln)
  while (cols.length < headerCols.length) cols.push('')
  const t = String(cols[idxType] || '').trim()
  const f = String(cols[idxFlavour] || '').trim()
  const u = String(cols[idxUnit] || '').trim()
  if (t) typeSet.add(t)
  if (f) flavourSet.add(f)
  if (u) unitSet.add(u)
}

const product_types = Array.from(typeSet).sort()
const flavours = Array.from(flavourSet).sort()
const units = Array.from(unitSet).sort()

const payload = { input, product_types, flavours, units, count_product_types: product_types.length, count_flavours: flavours.length, count_units: units.length }
await writeFile(output, JSON.stringify(payload, null, 2), 'utf8')
console.log(JSON.stringify({ output, ...payload }))
