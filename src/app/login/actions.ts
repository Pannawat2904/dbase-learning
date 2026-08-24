'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getSettings } from '@/utils/supabase/queries'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const settings = await getSettings()
  if (settings?.allowed_email_domain) {
    const allowedDomains = settings.allowed_email_domain.split(',').map((d: string) => {
      const trimmed = d.trim()
      return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
    })
    const isAllowed = allowedDomains.some((domain: string) => email.endsWith(domain))
    if (!isAllowed) {
      redirect('/login?error=อนุญาตเฉพาะอีเมลของสถานศึกษาเท่านั้น')
    }
  }

  const data = { email, password }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=Invalid email or password')
  }

  revalidatePath('/', 'layout')
  redirect('/student/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const settings = await getSettings()
  if (settings?.allowed_email_domain) {
    const allowedDomains = settings.allowed_email_domain.split(',').map((d: string) => {
      const trimmed = d.trim()
      return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
    })
    const isAllowed = allowedDomains.some((domain: string) => email.endsWith(domain))
    if (!isAllowed) {
      redirect('/login?error=อนุญาตเฉพาะอีเมลของสถานศึกษาเท่านั้น')
    }
  }

  const data = { email, password }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/login?error=Could not authenticate user')
  }

  revalidatePath('/', 'layout')
  redirect('/student/dashboard')
}

import { headers } from 'next/headers'

export async function loginWithGoogle() {
  const supabase = await createClient()
  
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const origin = `${protocol}://${host}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    redirect('/login?error=Could not initiate Google login')
  }

  if (data?.url) {
    redirect(data.url)
  }
}

export async function signout() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { logAccessEvent } = await import('@/utils/audit-logger')
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'นักเรียน'
    await logAccessEvent({
      studentId: user.id,
      userName: fullName,
      email: user.email || '-',
      role: 'student',
      event: 'logout',
      details: 'นักเรียนออกจากระบบ'
    })
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
