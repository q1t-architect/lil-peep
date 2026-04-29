import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Ensure next is a relative path to prevent open-redirect
      const destination = next.startsWith('/') ? next : '/'
      return NextResponse.redirect(new URL(destination, request.url))
    }
  }

  // Error fallback — redirect to login with error indicator
  return NextResponse.redirect(new URL('/login?error=auth_callback', request.url))
}
