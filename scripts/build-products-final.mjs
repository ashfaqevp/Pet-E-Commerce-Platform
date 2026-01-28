import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const productsCsvPath = process.argv[2] ?? path.resolve(process.cwd(), 'data/products.csv')
const fullCsvPath = process.argv[3] ?? path.resolve(process.cwd(), 'data/full_products.csv')
const outPath = process.argv[4] ?? path.resolve(process.cwd(), 'data/products_final.csv')

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

function csvEscape(field) {
  const s = String(field ?? '')
  if (s === '') return ''
  return '"' + s.replaceAll('"', '""') + '"'
}

function stringifyCSV(rows) {
  return rows.map(r => r.map(csvEscape).join(',')).join('\n') + '\n'
}

function normalizeHeaders(headers) {
  return headers.map(h => String(h).trim())
}

const run = async () => {
  const [bufProducts, bufFull] = await Promise.all([
    readFile(productsCsvPath, 'utf8'),
    readFile(fullCsvPath, 'utf8'),
  ])

  const productsRows = parseCSV(bufProducts)
  const fullRows = parseCSV(bufFull)

  const prodHeaders = normalizeHeaders(productsRows[0] ?? [])
  const fullHeaders = normalizeHeaders(fullRows[0] ?? [])

  const idxProdLegacyId = prodHeaders.indexOf('legacy_id')
  const idxProdLegacyBaseId = prodHeaders.indexOf('legacy_base_id')
  const idxFullId = fullHeaders.indexOf('id')
  const idxFullBaseId = fullHeaders.indexOf('base_product_id')
  const idxFullRowIndex = fullHeaders.indexOf('row_index')
  const idxFullPetType = fullHeaders.indexOf('pet_type')

  const headersOut = fullHeaders.slice()
  if (idxFullId >= 0) headersOut[idxFullId] = 'legacy_id'
  if (idxFullBaseId >= 0) headersOut[idxFullBaseId] = 'legacy_base_id'
  const out = [headersOut]

  const n = Math.min(productsRows.length - 1, fullRows.length - 1)
  const nameByIndex = new Map(fullHeaders.map((h, idx) => [idx, h]))

  function formatValue(colName, value) {
    const s = String(value ?? '').trim()
    if (s === '') return ''
    switch (colName) {
      case 'is_active':
      case 'is_featured': {
        const v = s.toLowerCase()
        if (v === 'true' || v === 't' || v === '1') return 'true'
        if (v === 'false' || v === 'f' || v === '0') return 'false'
        return s.toLowerCase()
      }
      case 'retail_price':
      case 'wholesale_price': {
        const num = Number(s)
        if (Number.isFinite(num)) return num.toFixed(3)
        return s
      }
      case 'thumbnail_url': {
        return s
      }
      default:
        return s
    }
  }

  for (let i = 1; i <= n; i++) {
    const prod = productsRows[i]
    const full = fullRows[i].slice()

    const legacyId = prod[idxProdLegacyId] ?? ''
    const legacyBaseId = prod[idxProdLegacyBaseId] ?? ''

    if (idxFullId >= 0) full[idxFullId] = legacyId
    if (idxFullBaseId >= 0) full[idxFullBaseId] = legacyBaseId
    if (idxFullRowIndex >= 0) full[idxFullRowIndex] = String(i)

    if (idxFullPetType >= 0) {
      const p = String(full[idxFullPetType] ?? '').trim()
      full[idxFullPetType] = p.toLowerCase()
    }

    const formatted = full.map((v, idx) => csvEscape(formatValue(nameByIndex.get(idx), v)))
    out.push(formatted)
  }

  const csv = out.map(r => r.join(',')).join('\n') + '\n'
  await writeFile(outPath, csv, 'utf8')
  console.log(JSON.stringify({ written_to: outPath, rows: out.length - 1 }))
}

run().catch(err => {
  console.error(JSON.stringify({ error: String(err.message || err) }))
  process.exitCode = 1
})
