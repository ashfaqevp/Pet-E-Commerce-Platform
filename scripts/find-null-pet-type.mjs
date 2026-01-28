import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const finalCsvPath = process.argv[2] ?? path.resolve(process.cwd(), 'data/products_final.csv')
const outPath = process.argv[3] ?? path.resolve(process.cwd(), 'data/pet_type_null.json')

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

const run = async () => {
  const buf = await readFile(finalCsvPath, 'utf8')
  const rows = parseCSV(buf)
  const headers = rows[0] ?? []
  const idx = {
    pet_type: headers.indexOf('pet_type'),
    legacy_id: headers.indexOf('legacy_id'),
    name: headers.indexOf('name'),
    row_index: headers.indexOf('row_index'),
  }

  const res = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const pet = String(row[idx.pet_type] ?? '').trim()
    if (!pet) {
      res.push({
        legacy_id: String(row[idx.legacy_id] ?? ''),
        name: String(row[idx.name] ?? ''),
        row_index: String(row[idx.row_index] ?? ''),
      })
    }
  }

  const out = { file: finalCsvPath, count: res.length, rows: res }
  await writeFile(outPath, JSON.stringify(out, null, 2), 'utf8')
  console.log(JSON.stringify({ written_to: outPath, count: res.length }))
}

run().catch(err => {
  console.error(JSON.stringify({ error: String(err.message || err) }))
  process.exitCode = 1
})

