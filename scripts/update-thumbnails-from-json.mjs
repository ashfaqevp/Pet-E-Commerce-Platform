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
const csvPath = path.resolve(cwd, opts.csv || 'data/full_products.csv')
const jsonPath = path.resolve(cwd, opts.json || 'data/supabase-thumbnails.json')
const output = path.resolve(cwd, opts.output || csvPath)

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

const normalizeName = (s) => String(s || '').trim()

const jsonBuf = await readFile(jsonPath, 'utf8')
const pairs = JSON.parse(jsonBuf)
const nameToThumb = new Map()
for (const p of pairs) {
  const name = normalizeName(p?.name)
  const url = String(p?.thumbnail_url || '')
  if (!name) continue
  if (!url) continue
  nameToThumb.set(name, url)
}

const content = await readFile(csvPath, 'utf8')
const lines = content.split(/\r?\n/)
const headerLine = lines.shift() || ''
const headerCols = parseCsvLine(headerLine)
const idxName = headerCols.indexOf('name')
const idxThumb = headerCols.indexOf('thumbnail_url')
if (idxName === -1) throw new Error('name column not found in CSV')
if (idxThumb === -1) throw new Error('thumbnail_url column not found in CSV')

const outRows = []
let matched = 0
let updated = 0
for (const ln of lines) {
  if (!ln) continue
  const cols = parseCsvLine(ln)
  while (cols.length < headerCols.length) cols.push('')
  const name = normalizeName(cols[idxName])
  const newUrl = nameToThumb.get(name)
  if (newUrl) {
    matched++
    if (cols[idxThumb] !== newUrl) {
      cols[idxThumb] = newUrl
      updated++
    }
  }
  outRows.push(cols)
}

const outLines = []
outLines.push(headerLine)
for (const cols of outRows) {
  const escaped = cols.map(escapeCsv)
  outLines.push(escaped.join(','))
}
const outContent = outLines.join('\n') + '\n'
await writeFile(output, outContent, 'utf8')

console.log(JSON.stringify({ csv: csvPath, json: jsonPath, output, names_in_json: nameToThumb.size, rows: outRows.length, matched, updated }))

