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
const input = path.resolve(cwd, opts.input || 'data/full_products_db.csv')
const output = path.resolve(cwd, opts.output || 'data/supabase-thumbnails.json')
const prefix = String(opts.prefix || 'https://nlgoitdbyhdoaemkixpr.supabase')

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
const idxName = headerCols.indexOf('name')
const idxThumb = headerCols.indexOf('thumbnail_url')
if (idxName === -1) throw new Error('name column not found in CSV')
if (idxThumb === -1) throw new Error('thumbnail_url column not found in CSV')

const out = []
for (const ln of lines) {
  if (!ln) continue
  const cols = parseCsvLine(ln)
  while (cols.length < headerCols.length) cols.push('')
  const name = String(cols[idxName] || '').trim()
  const thumb = String(cols[idxThumb] || '').trim()
  if (thumb && thumb.startsWith(prefix)) {
    out.push({ name, thumbnail_url: thumb })
  }
}

await writeFile(output, JSON.stringify(out, null, 2), 'utf8')
console.log(JSON.stringify({ input, output, count: out.length }))

