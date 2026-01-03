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

export type AdminOrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'completed'
  | 'confirmed'
  | 'awaiting_payment'

const ALLOWED_TRANSITIONS: Record<AdminOrderStatus, AdminOrderStatus[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['completed', 'returned'],
  cancelled: [],
  returned: [],
  completed: [],
  confirmed: ['processing', 'cancelled'],
  awaiting_payment: ['confirmed', 'cancelled'],
}

const REQUIRE_PAID: Set<AdminOrderStatus> = new Set(['shipped', 'delivered', 'completed'])

export const canOrderTransition = (
  from: string | null | undefined,
  to: string,
  payment_status: string | null | undefined,
  payment_method?: string | null | undefined,
): { allowed: boolean; reason?: string } => {
  const current = ((from || 'pending') as string).toLowerCase() as AdminOrderStatus
  const target = (to as string).toLowerCase() as AdminOrderStatus
  const allowedTargets = ALLOWED_TRANSITIONS[current] || []
  if (!allowedTargets.includes(target)) return { allowed: false, reason: 'Not allowed from current status' }
  const pay = ((payment_status || '').toLowerCase())
  const method = (payment_method || '').toLowerCase()
  const isCOD = method === 'cod'
  if (isCOD) {
    if (target === 'completed' && pay !== 'paid') return { allowed: false, reason: 'Payment required before completing COD order' }
  } else {
    if (REQUIRE_PAID.has(target) && pay !== 'paid') return { allowed: false, reason: 'Payment required before shipping or completing' }
  }
  return { allowed: true }
}
