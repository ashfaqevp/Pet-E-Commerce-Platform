import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const fileA = process.argv[2] ?? path.resolve(process.cwd(), 'data/products.csv')
const fileB = process.argv[3] ?? path.resolve(process.cwd(), 'data/full_products.csv')
const outFile = process.argv[4] ?? path.resolve(process.cwd(), 'data/csv-compare.json')

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

function normalizeHeaders(headers) {
  return headers.map(h => String(h).trim())
}

function detectType(v) {
  if (v == null) return 'empty'
  const s = String(v).trim()
  if (!s) return 'empty'
  const lower = s.toLowerCase()
  if (lower === 'true' || lower === 'false') return 'boolean'
  if (/^\d{4}-\d{2}-\d{2}[ t]\d{2}:\d{2}:\d{2}(\.\d+)?(z|[+-]\d{2}(:?\d{2})?)?$/i.test(s)) return 'datetime'
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'date'
  if (/^https?:\/\//i.test(s)) return 'url'
  if (/^[+-]?\d+$/.test(s)) return 'int'
  if (/^[+-]?\d*\.\d+$/.test(s)) return 'float'
  return 'string'
}

function summarizeTypes(headers, rows) {
  const stats = {}
  for (const h of headers) stats[h] = {}
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c]
      const v = row[c] ?? ''
      const t = detectType(v)
      const cur = stats[h][t] ?? 0
      stats[h][t] = cur + 1
    }
  }
  const summary = {}
  for (const h of headers) {
    const map = stats[h]
    const entries = Object.entries(map).filter(([k]) => k !== 'empty')
    entries.sort((a, b) => b[1] - a[1])
    const dominant = entries[0]?.[0] ?? 'empty'
    summary[h] = { dominant, distribution: map }
  }
  return summary
}

function diffHeaders(headersA, headersB) {
  const setA = new Set(headersA)
  const setB = new Set(headersB)
  const onlyA = headersA.filter(h => !setB.has(h))
  const onlyB = headersB.filter(h => !setA.has(h))
  const common = headersA.filter(h => setB.has(h))
  return { only_in_a: onlyA, only_in_b: onlyB, common }
}

function diffTypes(common, typesA, typesB) {
  const diffs = []
  for (const h of common) {
    const a = typesA[h]?.dominant ?? 'unknown'
    const b = typesB[h]?.dominant ?? 'unknown'
    if (a !== b) {
      diffs.push({ column: h, a_type: a, b_type: b })
    }
  }
  return diffs
}

const run = async () => {
  const [bufA, bufB] = await Promise.all([readFile(fileA, 'utf8'), readFile(fileB, 'utf8')])
  const rowsA = parseCSV(bufA)
  const rowsB = parseCSV(bufB)
  const headersA = normalizeHeaders(rowsA[0] ?? [])
  const headersB = normalizeHeaders(rowsB[0] ?? [])
  const typesA = summarizeTypes(headersA, rowsA)
  const typesB = summarizeTypes(headersB, rowsB)
  const headerDiff = diffHeaders(headersA, headersB)
  const typeDiff = diffTypes(headerDiff.common, typesA, typesB)
  const result = {
    files: { a: fileA, b: fileB },
    headers: { a: headersA, b: headersB },
    header_diff: headerDiff,
    type_summary: { a: typesA, b: typesB },
    type_diff: typeDiff,
  }
  await writeFile(outFile, JSON.stringify(result, null, 2), 'utf8')
  console.log(JSON.stringify({ written_to: outFile }))
}

run().catch(err => {
  console.error(JSON.stringify({ error: String(err.message || err) }))
  process.exitCode = 1
})
