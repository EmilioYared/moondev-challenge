import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const path = req.nextUrl.pathname

  // Check auth session
  const { data: { session }, error } = await supabase.auth.getSession()

  if (!session) {
    // Redirect to login if not authenticated
    if (path !== '/') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return res
  }

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()

  // Role-based routing
  if (userData?.role === 'developer') {
    if (path === '/evaluate') {
      return NextResponse.redirect(new URL('/submit', req.url))
    }
  } else if (userData?.role === 'evaluator') {
    if (path === '/submit') {
      return NextResponse.redirect(new URL('/evaluate', req.url))
    }
  }

  return res
}

// Specify which routes should be protected
export const config = {
  matcher: ['/', '/submit', '/evaluate']
}