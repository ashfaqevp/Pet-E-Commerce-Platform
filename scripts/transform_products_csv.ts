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
      if (c === '\r' && next === '\n') {
        i++
      }
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
if (args.length < 2) {
  console.error('Usage: tsx transform_products_csv.ts <input.csv> <output.csv>')
  process.exit(1)
}

const inputPath = resolve(args[0])
const outputPath = resolve(args[1])

const inputText = readFileSync(inputPath, 'utf8')
const rows = parseCsv(inputText)
if (rows.length === 0) {
  console.error('Input CSV is empty')
  process.exit(1)
}

const header = rows[0]
const idxId = header.indexOf('id')
const idxBase = header.indexOf('base_product_id')
const idxLegacyId = header.indexOf('legacy_id')
const idxLegacyBase = header.indexOf('legacy_base_id')

if (idxLegacyId === -1 || idxLegacyBase === -1) {
  console.error('Missing legacy_id or legacy_base_id columns in header')
  process.exit(1)
}

const excluded = new Set<number>([idxId, idxBase, idxLegacyId, idxLegacyBase].filter(i => i >= 0))
const otherIndices: number[] = []
for (let i = 0; i < header.length; i++) if (!excluded.has(i)) otherIndices.push(i)

const newHeader = ['id', 'base_product_id', ...otherIndices.map(i => header[i])]
const outRows: string[][] = [newHeader]

for (let r = 1; r < rows.length; r++) {
  const row = rows[r]
  const newId = idxLegacyId >= 0 && idxLegacyId < row.length ? row[idxLegacyId] : ''
  const newBase = idxLegacyBase >= 0 && idxLegacyBase < row.length ? row[idxLegacyBase] : ''
  const rest = otherIndices.map(i => (i < row.length ? row[i] : ''))
  outRows.push([newId, newBase, ...rest])
}

const outputText = stringifyCsv(outRows)
writeFileSync(outputPath, outputText, 'utf8')
console.log('Wrote', outputPath)
