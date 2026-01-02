import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'

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
const input = opts.input || 'data/raw/Item List (11).xlsx'
const outDir = path.resolve(cwd, opts.outDir || 'data/extracted')
const column = String(opts.column || 'C').toUpperCase()
const makeZip = ('zip' in opts) ? !['false','0','no'].includes(String(opts.zip).toLowerCase()) : true

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', removeNSPrefix: true })

const getCellText = (sheetXml, sharedStrings, cellRef) => {
  const m = /([A-Z]+)(\d+)/.exec(cellRef)
  if (!m) return null
  const [_, col, row] = m
  const rows = sheetXml?.worksheet?.sheetData?.row || []
  const rowNode = rows.find(r => String(r.r) === String(row))
  if (!rowNode) return null
  const cells = Array.isArray(rowNode.c) ? rowNode.c : (rowNode.c ? [rowNode.c] : [])
  const cell = cells.find(c => String(c.r).startsWith(col))
  if (!cell) return null
  if (cell.is?.t) return String(cell.is.t)
  const t = cell.t || ''
  if (t === 's') {
    const idx = Number(cell.v || 0)
    const si = sharedStrings?.sst?.si
    const item = Array.isArray(si) ? si[idx] : (idx === 0 ? si : null)
    if (!item) return null
    if (typeof item.t === 'string') return item.t
    if (item.r) {
      const runs = Array.isArray(item.r) ? item.r : [item.r]
      return runs.map(r => (r.t ?? '')).join('')
    }
    return null
  }
  if (cell.v != null) return String(cell.v)
  return null
}

const slug = (s) => String(s || '').trim().toLowerCase()
  .replace(/[^a-z0-9\-_.\s]/g, '')
  .replace(/[\s]+/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 120)

const inputPath = path.resolve(cwd, input)
const buf = await readFile(inputPath)
const zip = await JSZip.loadAsync(buf)

const workbookXml = parser.parse(await zip.file('xl/workbook.xml').async('string'))
const workbookRelsXml = parser.parse(await zip.file('xl/_rels/workbook.xml.rels').async('string'))
const wbRels = workbookRelsXml.Relationships.Relationship
const relById = new Map((Array.isArray(wbRels) ? wbRels : [wbRels]).map(r => [r.Id, r.Target]))
const sheets = workbookXml.workbook.sheets.sheet
const sheetList = (Array.isArray(sheets) ? sheets : [sheets]).map((s, i) => ({
  name: s.name,
  rId: s['r:id'],
  target: relById.get(s['r:id']),
  index: i + 1,
}))

await mkdir(outDir, { recursive: true })

const sharedStringsFile = zip.file('xl/sharedStrings.xml')
const sharedStringsXml = sharedStringsFile ? parser.parse(await sharedStringsFile.async('string')) : null

const results = []
for (const sheet of sheetList) {
  const sheetXml = parser.parse(await zip.file(`xl/${sheet.target}`).async('string'))
  const sheetRelPath = `xl/worksheets/_rels/${path.basename(sheet.target)}.rels`
  const sheetRelsFile = zip.file(sheetRelPath)
  if (!sheetRelsFile) continue
  const sheetRelsXml = parser.parse(await sheetRelsFile.async('string'))
  const relationships = sheetRelsXml.Relationships?.Relationship || []
  const relsArr = Array.isArray(relationships) ? relationships : [relationships]
  const drawingRel = relsArr.find(r => String(r.Type).includes('/relationships/drawing'))
  if (!drawingRel) continue
  const drawingTarget = drawingRel.Target.replace(/^\.\./, 'xl')
  const drawingXml = parser.parse(await zip.file(drawingTarget).async('string'))
  const drawingRelsPath = `${path.dirname(drawingTarget)}/_rels/${path.basename(drawingTarget)}.rels`
  const drawingRelsXml = parser.parse(await zip.file(drawingRelsPath).async('string'))
  const dRels = drawingRelsXml.Relationships.Relationship
  const mediaMap = new Map((Array.isArray(dRels) ? dRels : [dRels]).map(r => [r.Id, r.Target.replace(/^\.\./, 'xl')]))

  const anchors = drawingXml.wsDr?.twoCellAnchor || drawingXml.wsDr?.oneCellAnchor || []
  const anchorArr = Array.isArray(anchors) ? anchors : [anchors]

  const sheetTitle = getCellText(sheetXml, sharedStringsXml, `${column}1`) || sheet.name

  for (const a of anchorArr) {
    const from = a.from || a['xdr:from'] || {}
    const pic = a.pic || a['xdr:pic'] || {}
    const blip = pic?.blipFill?.blip || pic?.['xdr:blipFill']?.['a:blip'] || pic?.['xdr:blipFill']?.blip
    const rId = blip?.['r:embed'] || blip?.embed
    if (!rId) continue
    const mediaTarget = mediaMap.get(rId)
    if (!mediaTarget) continue
    const col = Number(from.col ?? from['xdr:col'] ?? 0)
    const row = Number(from.row ?? from['xdr:row'] ?? 0)
    const excelRow = row + 1
    const rowTitle = getCellText(sheetXml, sharedStringsXml, `${column}${excelRow}`)
    const namePart = slug(rowTitle || sheetTitle)
    const ext = path.extname(mediaTarget).toLowerCase() || '.bin'
    const fileName = `${slug(sheetTitle)}-${excelRow}-${namePart || 'image'}${ext}`
    const content = await zip.file(mediaTarget).async('nodebuffer')
    const sheetDir = path.join(outDir, slug(sheet.name))
    await mkdir(sheetDir, { recursive: true })
    const outPath = path.join(sheetDir, fileName)
    await writeFile(outPath, content)
    results.push(outPath)
  }
}

if (makeZip) {
  const outZip = new JSZip()
  for (const p of results) {
    const data = await readFile(p)
    outZip.file(path.relative(outDir, p), data)
  }
  const base = path.basename(inputPath, path.extname(inputPath))
  const zipBuf = await outZip.generateAsync({ type: 'nodebuffer' })
  const zipPath = path.join(outDir, `${slug(base)}-images.zip`)
  await writeFile(zipPath, zipBuf)
}

console.log(JSON.stringify({ input: inputPath, outDir, files: results.length }))

