import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Route classification helpers
// ---------------------------------------------------------------------------

/**
 * Routes that require an authenticated session.
 * Checked in order — first match wins.
 */
function isProtectedRoute(pathname: string): boolean {
  // /listing/new
  if (pathname === '/listing/new') return true

  // /listing/:id/edit  (exactly 3 segments: '', 'listing', id, 'edit')
  const listingEditMatch = /^\/listing\/[^/]+\/edit(\/.*)?$/.test(pathname)
  if (listingEditMatch) return true

  // /profile — exact only (not /profile/[id] which is public)
  if (pathname === '/profile') return true

  // /profile/edit
  if (pathname === '/profile/edit') return true

  // /messages and /messages/*
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return true

  // /notifications
  if (pathname === '/notifications') return true

  return false
}

/**
 * Auth pages — redirect already-logged-in users away from these.
 */
function isAuthPage(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password'
  )
}

// ---------------------------------------------------------------------------
// Main helper
// ---------------------------------------------------------------------------

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Always call getUser() to refresh the session.
  // Do not remove — Server Components depend on up-to-date cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, searchParams } = request.nextUrl

  // --- Unauthenticated user hitting a protected route ---
  if (!user && isProtectedRoute(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // --- Authenticated user hitting a login/signup page ---
  if (user && isAuthPage(pathname)) {
    const redirectTo = searchParams.get('redirect')
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/'
    homeUrl.search = ''
    return NextResponse.redirect(homeUrl)
  }

  return supabaseResponse
}
