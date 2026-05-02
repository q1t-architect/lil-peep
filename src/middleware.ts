import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // --- Rate limiting for auth routes ---
  if (pathname === '/login') {
    const { allowed } = checkRateLimit(`login:${ip}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs)
    if (!allowed) {
      return new NextResponse('Too many login attempts. Please try again later.', { status: 429 })
    }
  }

  if (pathname === '/signup') {
    const { allowed } = checkRateLimit(`signup:${ip}`, RATE_LIMITS.signup.limit, RATE_LIMITS.signup.windowMs)
    if (!allowed) {
      return new NextResponse('Too many signup attempts. Please try again later.', { status: 429 })
    }
  }

  if (pathname === '/forgot-password') {
    const { allowed } = checkRateLimit(`passwordReset:${ip}`, RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs)
    if (!allowed) {
      return new NextResponse('Too many password reset attempts. Please try again later.', { status: 429 })
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
