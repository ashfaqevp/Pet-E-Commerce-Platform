export type DimensionUnit = 'mm' | 'cm' | 'm' | 'inch'

export const DIMENSION_UNITS: { id: DimensionUnit; label: string }[] = [
  { id: 'mm',   label: 'Millimetre (mm)' },
  { id: 'cm',   label: 'Centimetre (cm)' },
  { id: 'm',    label: 'Metre (m)' },
  { id: 'inch', label: 'Inch (in)' },
]

/**
 * "20x15x10cm" -> { nums: ['20','15','10'], unit: 'cm' }
 * "20x15x10"   -> { nums: ['20','15','10'], unit: null }  (legacy, no suffix)
 */
export function parseDimension(raw: string): { nums: string[]; unit: DimensionUnit | null } {
  const m = String(raw).match(/^([\d.]+(?:x[\d.]+)*)([a-z]+)?$/i)
  const numPart = m?.[1] ?? String(raw)
  const unitPart = (m?.[2]?.toLowerCase() ?? null) as DimensionUnit | null
  const validUnit = unitPart && ['mm', 'cm', 'm', 'inch'].includes(unitPart) ? unitPart : null
  return { nums: numPart.split('x'), unit: validUnit }
}

/**
 * ('20x15x10cm') -> "20 × 15 × 10 cm"
 * ('20x15x10')   -> "20 × 15 × 10"
 */
export function formatDimensionLabel(raw: string): string {
  const { nums, unit } = parseDimension(raw)
  const dims = nums.join(' × ')
  return unit ? `${dims} ${unit}` : dims
}

/**
 * (20, 15, 10, 'cm') -> "20x15x10cm"
 * (20, 15, undefined, 'cm') -> "20x15cm"
 */
export function buildDimensionValue(
  l: number | undefined,
  w: number | undefined,
  h: number | undefined,
  unit: DimensionUnit,
): string | undefined {
  if (!l || !w) return undefined
  const dims = h != null ? `${l}x${w}x${h}` : `${l}x${w}`
  return `${dims}${unit}`
}
