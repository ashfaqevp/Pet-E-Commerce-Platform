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

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'failed'
export type StatusCategory = 'success' | 'failed' | 'warning' | 'info'
export interface StatusStyle {
  category: StatusCategory
  variant: BadgeVariant
}

const STATUS_VARIANT: Record<StatusCategory, BadgeVariant> = {
  success: 'success',
  failed: 'failed',
  warning: 'warning',
  info: 'info',
}

export const orderStatusStyle = (status: string | null | undefined): StatusStyle => {
  const s = (status || '').toLowerCase()
  let category: StatusCategory
  switch (s) {
    case 'completed':
    case 'delivered':
    case 'confirmed':
      category = 'success'
      break
    case 'cancelled':
    case 'returned':
      category = 'failed'
      break
    case 'awaiting_payment':
      category = 'warning'
      break
    case 'pending':
    default:
      category = 'info'
  }
  return { category, variant: STATUS_VARIANT[category] }
}

export const paymentStatusStyle = (status: string | null | undefined): StatusStyle => {
  const s = (status || '').toLowerCase()
  let category: StatusCategory
  switch (s) {
    case 'paid':
      category = 'success'
      break
    case 'failed':
      category = 'failed'
      break
    case 'unpaid':
    case 'pending':
      category = 'warning'
      break
    default:
      category = 'info'
  }
  return { category, variant: STATUS_VARIANT[category] }
}
