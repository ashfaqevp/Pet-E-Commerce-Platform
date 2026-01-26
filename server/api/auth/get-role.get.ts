import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr) throw createError({ statusCode: 401, statusMessage: userErr.message })
  const user = userRes?.user
  if (!user) throw createError({ statusCode: 401, statusMessage: 'UNAUTHORIZED' })

  const config = useRuntimeConfig()
  const url = String(config.public.supabaseUrl || '')
  const serviceKey = String(config.supabaseServiceKey || '')
  if (!url || !serviceKey) throw createError({ statusCode: 500, statusMessage: 'SERVICE_CONFIG_MISSING' })

  const admin = createClient(url, serviceKey)
  const { data: profile, error } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string | null }>()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { role: profile?.role || null }
})

