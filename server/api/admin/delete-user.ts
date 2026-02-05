import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const caller = await serverSupabaseUser(event)
  if (!caller) {
    throw createError({ statusCode: 401, statusMessage: 'Auth required' })
  }

  const body = await readBody<{ userId?: string }>(event)
  const userId = (body?.userId || '').trim()
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId required' })
  }

  const config = useRuntimeConfig()
  const supabaseUrl = String(config.public.supabaseUrl || '')
  const serviceKey = String(config.supabaseServiceKey || '')
  if (!supabaseUrl || !serviceKey) {
    throw createError({ statusCode: 500, statusMessage: 'SERVICE_CONFIG_MISSING' })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: profile, error: roleErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle()
  if (roleErr) {
    throw createError({ statusCode: 500, statusMessage: roleErr.message })
  }
  if ((profile?.role || '') !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin only' })
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})

