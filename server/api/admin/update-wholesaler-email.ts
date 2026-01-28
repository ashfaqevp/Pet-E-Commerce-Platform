import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

interface UpdateEmailBody {
  user_id: string
  email: string
}

export default defineEventHandler(async (event) => {
  const sessionClient = await serverSupabaseClient(event)
  const { data: sessionData, error: sessionErr } = await sessionClient.auth.getSession()
  if (sessionErr) throw createError({ statusCode: 401, statusMessage: sessionErr.message })
  const accessToken = sessionData?.session?.access_token || ''
  if (!accessToken) throw createError({ statusCode: 401, statusMessage: 'UNAUTHORIZED' })

  const config = useRuntimeConfig()
  const supabaseUrl = String(config.public.supabaseUrl || '')
  const supabaseAnonKey = String(config.public.supabaseAnonKey || '')
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const { data: userRes, error: userErr } = await userClient.auth.getUser()
  if (userErr) throw createError({ statusCode: 401, statusMessage: userErr.message })
  const caller = userRes?.user
  if (!caller) throw createError({ statusCode: 401, statusMessage: 'UNAUTHORIZED' })

  const { data: callerProfile, error: profileErr } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single<{ role: string | null }>()
  if (profileErr) throw createError({ statusCode: 500, statusMessage: profileErr.message })
  if ((callerProfile?.role || '') !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Admin only' })

  const body = (await readBody(event)) as UpdateEmailBody
  const userId = String(body.user_id || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'USER_ID_REQUIRED' })
  if (!email) throw createError({ statusCode: 400, statusMessage: 'EMAIL_REQUIRED' })

  const serviceKey = String(config.supabaseServiceKey || '')
  if (!supabaseUrl || !serviceKey) throw createError({ statusCode: 500, statusMessage: 'SERVICE_CONFIG_MISSING' })
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { email })
  if (updErr) throw createError({ statusCode: 500, statusMessage: updErr.message })

  return { success: true }
})

