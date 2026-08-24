import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { verifyAdminCookie } from '@/utils/auth/admin'

export async function middleware(request: NextRequest) {
  // Check Teacher Admin routes
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
    const teacherAuthCookie = request.cookies.get('teacher_auth')?.value
    const isValidAdmin = await verifyAdminCookie(teacherAuthCookie)
    if (!isValidAdmin) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
