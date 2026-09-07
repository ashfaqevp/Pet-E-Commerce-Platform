import { createClient } from '@supabase/supabase-js'

/** Service-role client. Server-only — never import this from app/. */
export const adminSupabase = () => {
  const config = useRuntimeConfig()
  const url = String(config.public.supabaseUrl || '')
  const serviceKey = String(config.supabaseServiceKey || '')
  if (!url || !serviceKey) throw createError({ statusCode: 500, statusMessage: 'SERVICE_CONFIG_MISSING' })

  return createClient(url, serviceKey, { auth: { persistSession: false } })
}
