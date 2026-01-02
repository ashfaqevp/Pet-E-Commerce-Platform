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
const input = path.resolve(cwd, opts.input || 'data/products.csv')
const output = path.resolve(cwd, opts.output || 'data/products.csv')

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

const escapeCsv = (v) => {
  if (v == null || v === '') return ''
  const s = String(v)
  const e = s.replace(/"/g, '""')
  return '"' + e + '"'
}

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

const content = await readFile(input, 'utf8')
const lines = content.split(/\r?\n/)
const headerLine = lines.shift() || ''
const headerCols = parseCsvLine(headerLine)
const idxRow = headerCols.indexOf('row_index')
if (idxRow === -1) {
  throw new Error('row_index column not found in CSV')
}

const rows = []
for (const ln of lines) {
  if (!ln) continue
  const cols = parseCsvLine(ln)
  if (cols.length !== headerCols.length) {
    // pad to match header length
    while (cols.length < headerCols.length) cols.push('')
  }
  rows.push(cols)
}

const n = rows.length
const newIndexes = shuffle(Array.from({ length: n }, (_, i) => i + 1))
for (let i = 0; i < n; i++) {
  rows[i][idxRow] = String(newIndexes[i])
}

const outLines = []
outLines.push(headerLine)
for (const cols of rows) {
  const escaped = cols.map(escapeCsv)
  outLines.push(escaped.join(','))
}
const outContent = outLines.join('\n') + '\n'
await writeFile(output, outContent, 'utf8')

const uniq = new Set(newIndexes)
const min = Math.min(...newIndexes)
const max = Math.max(...newIndexes)
console.log(JSON.stringify({ input, output, rows: n, unique_row_index: uniq.size, min_row_index: min, max_row_index: max }))

