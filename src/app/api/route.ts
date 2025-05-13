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

    // Log for debugging
    console.log("API called with:", { submissionId, action, feedback });
    console.log("Resend API Key exists:", !!process.env.RESEND_API_KEY);

    // Verify evaluator authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get submission details
    const { data: submission } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Send email notification using Resend
    const emailResult = await resend.emails.send({
      from: 'MoonDev <yaredemilio@gmail.com>',
      to: [submission.email],
      subject: action === 'accepted' ? 'Welcome to the Team!' : 'Your MoonDev Application',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: ${action === 'accepted' ? '#10B981' : '#EF4444'};">
            ${action === 'accepted' ? 'Congratulations! 🎉' : 'Thank You for Your Application'}
          </h1>
          <p>Dear ${submission.full_name},</p>
          <p>${feedback}</p>
          ${action === 'accepted' 
            ? '<p>We are excited to welcome you to our team!</p>' 
            : '<p>Thank you for your interest in MoonDev.</p>'}
          <p>Best regards,<br>MoonDev Team</p>
        </div>
      `
    });

    console.log('Email sent successfully:', emailResult);
    return NextResponse.json({ success: true, emailResult })
  } catch (error: any) {
    console.error('Notification error:', error);
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