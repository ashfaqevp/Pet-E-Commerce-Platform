import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'
import { deflateSync } from 'node:zlib'

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
const sheetOpt = Number(opts.sheet || 1)
const strictColumn = ('strictColumn' in opts) ? !['false','0','no'].includes(String(opts.strictColumn).toLowerCase()) : false
const clean = ('clean' in opts) ? !['false','0','no'].includes(String(opts.clean).toLowerCase()) : false

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

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c >>> 0
  }
  return t
})()

const crc32 = (buf) => {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

const pngChunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typ = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  const crcVal = crc32(Buffer.concat([typ, data]))
  crc.writeUInt32BE(crcVal, 0)
  return Buffer.concat([len, typ, data, crc])
}

const createWhitePng = (w = 1, h = 1) => {
  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const ihdrChunk = pngChunk('IHDR', ihdr)
  const rows = []
  for (let y = 0; y < h; y++) rows.push(Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 255)]))
  const idatData = deflateSync(Buffer.concat(rows))
  const idatChunk = pngChunk('IDAT', idatData)
  const iendChunk = pngChunk('IEND', Buffer.alloc(0))
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk])
}

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
  rId: s['r:id'] || s.id,
  target: relById.get(s['r:id'] || s.id),
  index: i + 1,
}))

await mkdir(outDir, { recursive: true })

const sharedStringsFile = zip.file('xl/sharedStrings.xml')
const sharedStringsXml = sharedStringsFile ? parser.parse(await sharedStringsFile.async('string')) : null

const results = []
// helper to resolve zip internal paths
const resolvePath = (p) => {
  if (!p) return null
  let t = String(p)
  t = t.replace(/^\//, '')
  if (t.startsWith('../')) t = `xl/${t.slice(3)}`
  if (!t.startsWith('xl/')) t = `xl/${t}`
  return t
}

{
  const sheet = sheetList.find(s => s.index === sheetOpt) || sheetList[0]
  const sheetPath = resolvePath(sheet.target)
  const sheetFile = zip.file(sheetPath)
  if (sheetFile) {
    const sheetXml = parser.parse(await sheetFile.async('string'))
    const sheetTitle = getCellText(sheetXml, sharedStringsXml, `${column}1`) || sheet.name
    const rows = sheetXml?.worksheet?.sheetData?.row || []
    const collect = (col) => {
      const list = []
      for (const r of Array.isArray(rows) ? rows : [rows]) {
        const rowIdx = Number(r.r || 0)
        if (rowIdx < 2) continue
        const txt = getCellText(sheetXml, sharedStringsXml, `${col}${rowIdx}`)
        if (txt && String(txt).trim().length) list.push({ row: rowIdx, text: String(txt) })
        else {
          const cells = Array.isArray(r.c) ? r.c : (r.c ? [r.c] : [])
          const hasCell = cells.some(c => String(c.r).startsWith(col))
          if (hasCell) list.push({ row: rowIdx, text: null })
        }
      }
      list.sort((a, b) => a.row - b.row)
      return list
    }
    let entries = collect(column)
    if (!strictColumn && entries.length < 100) entries = collect('B')
    let anchorsByRow = new Map()
    const sheetRelPath = `xl/worksheets/_rels/${path.basename(sheetPath)}.rels`
    const sheetRelsFile = zip.file(sheetRelPath)
    if (sheetRelsFile) {
      const sheetRelsXml = parser.parse(await sheetRelsFile.async('string'))
      const relationships = sheetRelsXml.Relationships?.Relationship || []
      const relsArr = Array.isArray(relationships) ? relationships : [relationships]
      const drawingRel = relsArr.find(r => String(r.Type).includes('/relationships/drawing'))
      if (drawingRel) {
        const drawingTarget = resolvePath(drawingRel.Target)
        const drawingFile = zip.file(drawingTarget)
        if (drawingFile) {
          const drawingXml = parser.parse(await drawingFile.async('string'))
          const drawingRelsPath = `${path.dirname(drawingTarget)}/_rels/${path.basename(drawingTarget)}.rels`
          const drawingRelsFile = zip.file(drawingRelsPath)
          if (drawingRelsFile) {
            const drawingRelsXml = parser.parse(await drawingRelsFile.async('string'))
            const dRels = drawingRelsXml.Relationships.Relationship
            const mediaMap = new Map((Array.isArray(dRels) ? dRels : [dRels]).map(r => [r.Id, resolvePath(r.Target)]))
            const anchors = drawingXml.wsDr?.twoCellAnchor || drawingXml.wsDr?.oneCellAnchor || []
            const anchorArr = Array.isArray(anchors) ? anchors : [anchors]
            anchorsByRow = new Map()
            for (const a of anchorArr) {
              const from = a.from || a['xdr:from'] || {}
              const pic = a.pic || a['xdr:pic'] || {}
              const blip = pic?.blipFill?.blip || pic?.['xdr:blipFill']?.['a:blip'] || pic?.['xdr:blipFill']?.blip
              const rId = blip?.['r:embed'] || blip?.embed
              if (!rId) continue
              const mediaTarget = mediaMap.get(rId)
              if (!mediaTarget) continue
              const colNum = Number(from.col ?? from['xdr:col'] ?? 0)
              const rowNum = Number(from.row ?? from['xdr:row'] ?? 0)
              const excelRow = rowNum + 1
              const list = anchorsByRow.get(excelRow) || []
              list.push({ col: colNum, target: mediaTarget })
              anchorsByRow.set(excelRow, list)
            }
          }
        }
      }
    }
    const sheetDir = path.join(outDir, slug(sheet.name))
    if (clean) {
      try { await rm(sheetDir, { recursive: true, force: true }) } catch {}
    }
    await mkdir(sheetDir, { recursive: true })
    let idx = 0
    for (const e of entries) {
      idx++
      const namePart = slug(e.text || sheetTitle)
      const rowAnchors = (anchorsByRow.get(e.row) || []).sort((a, b) => a.col - b.col)
      const chosen = rowAnchors[0]
      if (chosen) {
        const ext = path.extname(chosen.target).toLowerCase() || '.bin'
        const fileName = `${String(idx).padStart(3, '0')}-${namePart}${ext}`
        const mediaFile = zip.file(chosen.target)
        if (mediaFile) {
          const content = await mediaFile.async('nodebuffer')
          const outPath = path.join(sheetDir, fileName)
          await writeFile(outPath, content)
          results.push(outPath)
          continue
        }
      }
      const fileName = `${String(idx).padStart(3, '0')}-${namePart}.png`
      const outPath = path.join(sheetDir, fileName)
      const content = createWhitePng(1, 1)
      await writeFile(outPath, content)
      results.push(outPath)
    }
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

// Fallback: extract all media files if none mapped
const mediaKeys = Object.keys(zip.files).filter(k => k.startsWith('xl/media/'))
if (mediaKeys.length && results.length === 0) {
  const allDir = path.join(outDir, 'all-media')
  await mkdir(allDir, { recursive: true })
  for (const k of mediaKeys) {
    const file = zip.file(k)
    if (!file) continue
    const content = await file.async('nodebuffer')
    const name = path.basename(k)
    const outPath = path.join(allDir, name)
    await writeFile(outPath, content)
    results.push(outPath)
  }
}

console.log(JSON.stringify({ input: inputPath, outDir, files: results.length }))
