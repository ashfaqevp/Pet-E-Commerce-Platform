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
const output = path.resolve(cwd, opts.output || 'data/full_products.csv')

const escapeCsv = (v) => {
  if (v == null) return ''
  const s = String(v)
  const e = s.replace(/"/g, '""')
  return '"' + e + '"'
}

const parseCsvLine = (line) => {
  const res = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      res.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  res.push(cur)
  return res
}

const extractBrand = (name) => {
  const s = String(name || '').trim().replace(/[-]+/g, ' ').replace(/\s+/g, ' ')
  const tokens = s.split(' ')
  const stop = new Set(['adult','kitten','puppy','junior','senior','sterilized','sterilised','sterelised','urinary','skin','care','indoor','mix','mother','baby','fish','cat','dog','bird','turtle','hamster','rabbit','shampoo','perfumes','deodoriser','deodorizer','deodoriser'])
  const flavor = new Set(['chicken','beef','salmon','tuna','lamb','shrimp','anchovy','rice','gourmet','parrot'])
  const acc = []
  for (const t of tokens) {
    const lower = t.toLowerCase()
    const hasDigit = /[0-9]/.test(lower)
    const isUnit = /^(g|kg|gm|ml|l|pcs?|piece|cm|mm|model|pack|pc|ltr|oz)$/.test(lower)
    if (hasDigit || isUnit || stop.has(lower) || flavor.has(lower)) break
    acc.push(t)
    if (acc.length >= 3) break
  }
  if (acc.length === 0 && tokens.length) acc.push(tokens[0])
  return acc.join(' ').trim()
}

const buf = await readFile(input, 'utf8')
const lines = buf.split(/\r?\n/).filter(l => l.length > 0)
if (!lines.length) {
  await writeFile(output, '', 'utf8')
  console.log(JSON.stringify({ input, output, rows: 0, columns: 0 }))
  process.exit(0)
}

const headerRaw = lines[0]
const headerCols = headerRaw.split(',')
const header = headerCols.map(h => h.replace(/^"|"$/g, ''))

const hasWholesale = header.includes('wholesale_price')
const hasBrand = header.includes('brand')
const rpIdx = header.indexOf('retail_price')
let base = header.slice()
if (!hasWholesale) base.push('wholesale_price')
if (!hasBrand) base.push('brand')
const rpPos = rpIdx >= 0 ? rpIdx : 4
const before = base.slice(0, rpPos + 1)
const after = base.slice(rpPos + 1).filter(k => k !== 'wholesale_price' && k !== 'brand')
const cols = [...before, 'wholesale_price', 'brand', ...after]

const nameIdx = base.indexOf('name')

const outLines = []
outLines.push(cols.join(','))

for (let i = 1; i < lines.length; i++) {
  const fields = parseCsvLine(lines[i]).map(f => f.replace(/^"|"$/g, '').replace(/""/g, '"'))
  while (fields.length < header.length) fields.push('')
  const map = {}
  for (let j = 0; j < base.length; j++) map[base[j]] = fields[j]
  map['wholesale_price'] = ''
  const nm = nameIdx >= 0 ? map['name'] || '' : ''
  const existingBrand = map['brand'] || ''
  map['brand'] = existingBrand ? existingBrand : extractBrand(nm)
  const values = cols.map((k) => escapeCsv(map[k]))
  outLines.push(values.join(','))
}

const content = outLines.join('\n') + '\n'
await writeFile(output, content, 'utf8')

console.log(JSON.stringify({ input, output, rows: lines.length - 1, columns: cols.length }))
