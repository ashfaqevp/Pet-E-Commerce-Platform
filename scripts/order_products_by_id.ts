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
if (args.length < 2) {
  console.error('Usage: tsx order_products_by_id.ts <input.csv> <output.csv>')
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
let idIdx = header.indexOf('id')
if (idIdx === -1) idIdx = 0

const body = rows.slice(1)
body.sort((a, b) => {
  const ai = a[idIdx] ?? ''
  const bi = b[idIdx] ?? ''
  const an = Number.parseInt(ai, 10)
  const bn = Number.parseInt(bi, 10)
  const aIsNum = Number.isFinite(an)
  const bIsNum = Number.isFinite(bn)
  if (aIsNum && bIsNum) return an - bn
  if (aIsNum) return -1
  if (bIsNum) return 1
  return ai.localeCompare(bi)
})

const outRows: string[][] = [header, ...body]
const outputText = stringifyCsv(outRows)
writeFileSync(outputPath, outputText, 'utf8')
console.log('Wrote', outputPath)
