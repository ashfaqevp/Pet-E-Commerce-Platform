export const formatOmanPhone = (v: string | null | undefined): string => {
  const digits = (v || '').replace(/[^0-9]/g, '')
  if (!digits) return '—'
  const local = digits.startsWith('968') ? digits.slice(3) : digits
  const normalized = local.slice(0, 8)
  if (normalized.length < 8) return `+968 ${normalized}`
  return `+968 ${normalized.slice(0, 4)} ${normalized.slice(4, 8)}`
}

export const formatOMR = (v: number | string | null | undefined): string => {
  const n = Number(v ?? 0)
  return new Intl.NumberFormat('en-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n)
}
