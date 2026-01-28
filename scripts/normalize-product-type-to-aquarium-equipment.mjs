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
const output = path.resolve(cwd, opts.output || input)

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

const escapeCsv = (s) => {
  const str = String(s ?? '')
  const needsQuotes = /[",\n]/.test(str)
  if (!needsQuotes) return str
  return '"' + str.replace(/"/g, '""') + '"'
}

const TARGET_TYPES = [
  'filter',
  'pump',
  'air pump',
  'air stone',
  'wave maker',
  'auto feeder',
  'aquarium heater',
  'aquarium light',
  'sponge',
  'sponge filter',
  'uv',
]

const normalize = (s) => String(s || '').trim().toLowerCase()
const targetSet = new Set(TARGET_TYPES.map(normalize))

const content = await readFile(input, 'utf8')
const lines = content.split(/\r?\n/)
const headerLine = lines.shift() || ''
const headerCols = parseCsvLine(headerLine)
const idxType = headerCols.indexOf('product_type')
if (idxType === -1) throw new Error('product_type column not found in CSV')

const rows = []
let updated = 0
for (const ln of lines) {
  if (!ln) continue
  const cols = parseCsvLine(ln)
  while (cols.length < headerCols.length) cols.push('')
  const curType = String(cols[idxType] || '')
  const n = normalize(curType)
  if (targetSet.has(n)) {
    rows.push(Object.assign([], cols, { [idxType]: 'aquarium_equipment' }))
    updated++
  } else {
    rows.push(cols)
  }
}

const outLines = []
outLines.push(headerLine)
for (const cols of rows) {
  const escaped = cols.map(escapeCsv)
  outLines.push(escaped.join(','))
}
const outContent = outLines.join('\n') + '\n'
await writeFile(output, outContent, 'utf8')

console.log(JSON.stringify({ input, output, rows: rows.length, updated }))

