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

const content = await readFile(input, 'utf8')
const lines = content.split(/\r?\n/)
const headerLine = lines.shift() || ''
const headerCols = parseCsvLine(headerLine)

let renamed = 0
for (let i = 0; i < headerCols.length; i++) {
  if (headerCols[i] === 'id') {
    headerCols[i] = 'legacy_id'
    renamed++
  } else if (headerCols[i] === 'base_product_id') {
    headerCols[i] = 'legacy_base_id'
    renamed++
  }
}

const newHeaderLine = headerCols.join(',')

const outLines = []
outLines.push(newHeaderLine)
for (const ln of lines) {
  if (!ln) continue
  outLines.push(ln)
}
const outContent = outLines.join('\n') + '\n'
await writeFile(output, outContent, 'utf8')

console.log(JSON.stringify({ input, output, renamed_columns: renamed }))

