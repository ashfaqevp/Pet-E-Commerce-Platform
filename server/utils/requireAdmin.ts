import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

/**
 * Resolves the caller and asserts the admin role.
 * Identity comes from the Supabase session cookie (how every other admin page
 * calls its API); a Bearer token is accepted as a fallback.
 */
export async function requireAdmin(event: H3Event) {
  const supabase = adminSupabase()

  let user: { id: string } | null = null

  try {
    user = await serverSupabaseUser(event)
  }
  catch {
    user = null
  }

  if (!user) {
    const header = getRequestHeader(event, 'authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
    user = data.user
  }

  const { data: profile, error: roleErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (roleErr) throw createError({ statusCode: 500, statusMessage: roleErr.message })

  if ((profile?.role || '') !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Admins only' })

  return user
}
