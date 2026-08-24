import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSettings } from '@/utils/supabase/queries'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/student/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      if (user?.email) {
        const settings = await getSettings()
        if (settings?.allowed_email_domain) {
          const allowedDomains = settings.allowed_email_domain.split(',').map((d: string) => {
            const trimmed = d.trim()
            return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
          })
          const userEmail = user.email;
          const isAllowed = allowedDomains.some((domain: string) => userEmail.endsWith(domain))
          if (!isAllowed) {
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/login?error=อนุญาตเฉพาะอีเมลของสถานศึกษาเท่านั้น`)
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate with Google`)
}
