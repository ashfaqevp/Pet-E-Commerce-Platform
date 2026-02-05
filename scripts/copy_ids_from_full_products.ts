import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  const row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    const next = i + 1 < input.length ? input[i + 1] : ''
    if (c === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        i++
      }
      else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (c === ',' && !inQuotes) {
      row.push(field)
      field = ''
      continue
    }
    if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && next === '\n') i++
      row.push(field)
      rows.push(row.slice(0))
      row.length = 0
      field = ''
      continue
    }
    field += c
  }
  row.push(field)
  if (row.length > 1 || (row.length === 1 && row[0] !== '')) rows.push(row)
  return rows
}

function needsQuoting(v: string): boolean {
  return v.includes('"') || v.includes(',') || v.includes('\n') || v.includes('\r')
}

function escapeCsvField(v: string): string {
  if (needsQuoting(v)) return '"' + v.replace(/"/g, '""') + '"'
  return v
}

function stringifyCsv(rows: string[][]): string {
  return rows.map(r => r.map(escapeCsvField).join(',')).join('\n')
}

const args = process.argv.slice(2)
if (args.length < 3) {
  console.error('Usage: tsx copy_ids_from_full_products.ts <products_rows.csv> <full_products.csv> <output.csv>')
  process.exit(1)
}

const rowsPath = resolve(args[0])
const fullPath = resolve(args[1])
const outputPath = resolve(args[2])

const rowsText = readFileSync(rowsPath, 'utf8')
const fullText = readFileSync(fullPath, 'utf8')
const rows = parseCsv(rowsText)
const full = parseCsv(fullText)
if (rows.length === 0 || full.length === 0) {
  console.error('Input CSV is empty')
  process.exit(1)
}

const rowsHeader = rows[0]
const fullHeader = full[0]
let rowsIdIdx = rowsHeader.indexOf('id')
let rowsBaseIdx = rowsHeader.indexOf('base_product_id')
let fullIdIdx = fullHeader.indexOf('id')
let fullBaseIdx = fullHeader.indexOf('base_product_id')
if (rowsIdIdx === -1) rowsIdIdx = 0
if (rowsBaseIdx === -1) rowsBaseIdx = 1
if (fullIdIdx === -1) fullIdIdx = 0
if (fullBaseIdx === -1) fullBaseIdx = 1

const outRows: string[][] = [rowsHeader]
const bodyLen = rows.length - 1
for (let r = 1; r <= bodyLen; r++) {
  const row = rows[r]?.slice(0) ?? []
  const fullRow = full[r]
  if (fullRow) {
    const idVal = fullIdIdx < fullRow.length ? fullRow[fullIdIdx] : ''
    const baseVal = fullBaseIdx < fullRow.length ? fullRow[fullBaseIdx] : ''
    if (rowsIdIdx >= row.length) row.length = rowsIdIdx + 1
    if (rowsBaseIdx >= row.length) row.length = rowsBaseIdx + 1
    row[rowsIdIdx] = idVal
    row[rowsBaseIdx] = baseVal
  }
  outRows.push(row)
}

const outputText = stringifyCsv(outRows)
writeFileSync(outputPath, outputText, 'utf8')
console.log('Wrote', outputPath)
