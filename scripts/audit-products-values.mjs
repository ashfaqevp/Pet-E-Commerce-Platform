import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const finalCsvPath = process.argv[2] ?? path.resolve(process.cwd(), 'data/products_final.csv')
const configPath = process.argv[3] ?? path.resolve(process.cwd(), 'app/domain/categories/category.config.ts')
const outPath = process.argv[4] ?? path.resolve(process.cwd(), 'data/products_final_extras.json')

function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1]
        if (next === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\n') {
        row.push(field)
        field = ''
        rows.push(row)
        row = []
      } else if (c === '\r') {
      } else {
        field += c
      }
    }
  }
  row.push(field)
  rows.push(row)
  return rows.filter(r => r.length && r.some(v => v !== ''))
}

function extractIdsFromLines(lines) {
  const ids = []
  for (const line of lines) {
    const m = line.match(/\{\s*id:\s*['"]([^'\"]+)['"]/)
    if (m) ids.push(m[1])
  }
  return ids
}

const run = async () => {
  const [configBuf, finalBuf] = await Promise.all([
    readFile(configPath, 'utf8'),
    readFile(finalCsvPath, 'utf8'),
  ])

  const configLines = configBuf.split(/\r?\n/)
  const productTypeIds = extractIdsFromLines(configLines.slice(21, 30))
  const unitIds = extractIdsFromLines(configLines.slice(67, 81))
  const flavourIds = extractIdsFromLines(configLines.slice(98, 145))

  const allowed = {
    product_type: new Set(productTypeIds.map(s => s.trim().toLowerCase())),
    unit: new Set(unitIds.map(s => s.trim().toLowerCase())),
    flavour: new Set(flavourIds.map(s => s.trim().toLowerCase())),
  }

  const rows = parseCSV(finalBuf)
  const headers = rows[0]
  const idx = {
    product_type: headers.indexOf('product_type'),
    unit: headers.indexOf('unit'),
    flavour: headers.indexOf('flavour'),
    row_index: headers.indexOf('row_index'),
  }

  const extras = {
    product_type: new Map(),
    unit: new Map(),
    flavour: new Map(),
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const ri = String(row[idx.row_index] ?? '')
    for (const key of ['product_type', 'unit', 'flavour']) {
      const v = String(row[idx[key]] ?? '').trim().toLowerCase()
      if (!v) continue
      if (!allowed[key].has(v)) {
        const cur = extras[key].get(v)
        if (!cur) extras[key].set(v, { value: v, count: 1, rows: [ri] })
        else { cur.count++; cur.rows.push(ri) }
      }
    }
  }

  const toArray = m => Array.from(m.values()).sort((a, b) => b.count - a.count)
  const res = {
    files: { csv: finalCsvPath, config: configPath },
    allowed: {
      product_type: Array.from(allowed.product_type),
      unit: Array.from(allowed.unit),
      flavour: Array.from(allowed.flavour),
    },
    extras: {
      product_type: toArray(extras.product_type),
      unit: toArray(extras.unit),
      flavour: toArray(extras.flavour),
    },
  }

  await writeFile(outPath, JSON.stringify(res, null, 2), 'utf8')
  console.log(JSON.stringify({ written_to: outPath }))
}

run().catch(err => {
  console.error(JSON.stringify({ error: String(err.message || err) }))
  process.exitCode = 1
})

