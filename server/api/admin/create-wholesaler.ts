import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

interface CreateWholesalerBody {
  email: string
  password?: string
  full_name?: string
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

  const serviceKey = String(config.supabaseServiceKey || '')
  if (!supabaseUrl || !serviceKey) throw createError({ statusCode: 500, statusMessage: 'SERVICE_CONFIG_MISSING' })
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)
  const { data: callerProfile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single<{ role: string | null }>()
  if (profileErr) throw createError({ statusCode: 500, statusMessage: profileErr.message })
  if ((callerProfile?.role || '') !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Admin only' })

  const body = (await readBody(event)) as CreateWholesalerBody
  const email = String(body.email || '').trim().toLowerCase()
  if (!email) throw createError({ statusCode: 400, statusMessage: 'EMAIL_REQUIRED' })
  const fullName = typeof body.full_name === 'string' ? body.full_name : undefined
  const tempPassword = (typeof body.password === 'string' && body.password.length >= 8)
    ? body.password
    : `${Math.random().toString(36)}A1!${Date.now()}`

  const { data: createRes, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  })
  if (createErr) throw createError({ statusCode: 500, statusMessage: createErr.message })
  const newUserId = createRes?.user?.id
  if (!newUserId) throw createError({ statusCode: 500, statusMessage: 'USER_CREATE_FAILED' })

  const { error: updErr } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'wholesaler', full_name: fullName || null } as unknown as never)
    .eq('id', newUserId)
  if (updErr) throw createError({ statusCode: 500, statusMessage: updErr.message })

  const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '') || 'http://localhost:3000'
  const redirectTo = `${siteUrl}/reset-password`
  try {
    await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo })
  } catch {}

  return { success: true, user_id: newUserId }
})
