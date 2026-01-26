import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

interface AdminUsersQuery {
  search?: string
  role?: 'all' | 'customer' | 'wholesaler'
  page?: number
  pageSize?: number
  sortBy?: 'created_at' | 'email'
  ascending?: boolean
}

interface AdminUserRow {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  phone: string | null
  created_at: string
}

export default defineEventHandler(async (event) => {
  const caller = await serverSupabaseUser(event)
  if (!caller) throw createError({ statusCode: 401, statusMessage: 'Auth session missing!' })

  const config = useRuntimeConfig()
  const supabaseUrl = String(config.public.supabaseUrl || '')
  const serviceKey = String(config.supabaseServiceKey || '')
  if (!supabaseUrl || !serviceKey) throw createError({ statusCode: 500, statusMessage: 'SERVICE_CONFIG_MISSING' })

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: profile, error: roleErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle()
  if (roleErr) throw createError({ statusCode: 500, statusMessage: roleErr.message })
  if ((profile?.role || '') !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Admin only' })

  const q = getQuery(event)
  const query: AdminUsersQuery = {
    search: typeof q.search === 'string' ? q.search.trim() : undefined,
    role: q.role === 'customer' || q.role === 'wholesaler' ? (q.role as 'customer' | 'wholesaler') : 'all',
    page: Number.parseInt(String(q.page || '1'), 10) || 1,
    pageSize: Number.parseInt(String(q.pageSize || '10'), 10) || 10,
    sortBy: q.sortBy === 'email' ? 'email' : 'created_at',
    ascending: String(q.ascending) === 'true',
  }

  const page = Math.max(1, query.page || 1)
  const pageSize = Math.min(200, Math.max(1, query.pageSize || 10))

  const { data: authRes, error: authErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (authErr) throw createError({ statusCode: 500, statusMessage: authErr.message })
  const authUsers = (authRes?.users || []) as Array<{ id: string; email?: string | null; created_at?: string | Date }>
  const ids = authUsers.map(u => u.id)
  console.log('AUTH USERS COUNT:', authUsers.length)

  let profQ = admin
    .from('profiles')
    .select('id, full_name, phone, role, created_at')
    .in('id', ids)

  if (query.role && query.role !== 'all') profQ = profQ.eq('role', query.role)

  const { data: profiles, error: pErr } = await profQ
  if (pErr) throw createError({ statusCode: 500, statusMessage: pErr.message })
  console.log('PROFILES COUNT:', Array.isArray(profiles) ? profiles.length : 0)

  const profById = new Map<string, { id: string; full_name?: string | null; phone?: string | null; role?: string | null; created_at?: string | Date }>((profiles || []).map(p => [String((p as { id: string }).id), p as { id: string; full_name?: string | null; phone?: string | null; role?: string | null; created_at?: string | Date }]))

  let merged = authUsers.map((u) => {
    const p = profById.get(String(u.id))
    const created = typeof (u?.created_at) === 'string' ? (u?.created_at as string) : (u?.created_at ? new Date(u.created_at as Date).toISOString() : (p && typeof p.created_at === 'string' ? p.created_at : p?.created_at ? new Date(p.created_at as Date).toISOString() : new Date().toISOString()))
    return {
      id: String(u.id),
      email: u.email ?? null,
      full_name: p?.full_name ?? null,
      role: (p?.role ?? 'customer'),
      phone: p?.phone ?? null,
      created_at: created,
    } as AdminUserRow
  })

  if (query.role && query.role !== 'all') {
    merged = merged.filter(r => (r.role === query.role))
  }

  if (query.search && query.search.length) {
    const s = query.search.toLowerCase()
    merged = merged.filter(r => (r.email?.toLowerCase().includes(s) || r.full_name?.toLowerCase().includes(s)))
  }

  if (query.sortBy === 'email') {
    merged = merged.sort((a, b) => {
      const ae = a.email || ''
      const be = b.email || ''
      return query.ascending ? ae.localeCompare(be) : be.localeCompare(ae)
    })
  } else {
    merged = merged.sort((a, b) => {
      const at = new Date(a.created_at).getTime()
      const bt = new Date(b.created_at).getTime()
      return query.ascending ? at - bt : bt - at
    })
  }

  const count = merged.length
  const start = (page - 1) * pageSize
  const rows = merged.slice(start, start + pageSize)

  return { rows, count }
})
