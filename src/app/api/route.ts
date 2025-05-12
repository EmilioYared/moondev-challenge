import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { NextRequest } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { submissionId, action, feedback } = await request.json()

    // Verify evaluator authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify evaluator role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userData?.role !== 'evaluator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get submission and developer details
    const { data: submission } = await supabase
      .from('submissions')
      .select(`
        *,
        developer:user_id (
          email,
          full_name
        )
      `)
      .eq('id', submissionId)
      .single()

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Send email notification
    await resend.emails.send({
      from: 'MoonDev <notifications@yourdomain.com>',
      to: submission.developer.email,
      subject: action === 'accepted' ? 'Welcome to MoonDev!' : 'MoonDev Application Update',
      html: `
        <div>
          <h1>${action === 'accepted' ? 'Congratulations!' : 'Application Update'}</h1>
          <p>Dear ${submission.developer.full_name},</p>
          <p>${feedback}</p>
          ${action === 'accepted' 
            ? '<p>Welcome to the team! We\'ll be in touch shortly with next steps.</p>' 
            : '<p>Thank you for your interest in joining our team.</p>'
          }
        </div>
      `
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    )
  }
}

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  const { data: { session } } = await supabase.auth.getSession()

  // Protect routes
  if (!session) {
    // If not logged in, redirect to login page
    if (request.nextUrl.pathname !== '/') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  } else {
    // If logged in, check role and redirect if necessary
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userData?.role === 'developer' && request.nextUrl.pathname === '/evaluate') {
      return NextResponse.redirect(new URL('/submit', request.url))
    }

    if (userData?.role === 'evaluator' && request.nextUrl.pathname === '/submit') {
      return NextResponse.redirect(new URL('/evaluate', request.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/', '/submit', '/evaluate']
}