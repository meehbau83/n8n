import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  // Log env var existence (never the value)
  console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)

  try {
    // Parse request body
    const body = await request.json()
    const { to, subject, message } = body

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: to' },
        { status: 400 }
      )
    }

    if (!subject) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: subject' },
        { status: 400 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: message' },
        { status: 400 }
      )
    }

    // Check for API key
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY is not configured' },
        { status: 500 }
      )
    }

    // Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: to,
      subject: subject,
      text: message,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      id: data?.id,
    })
  } catch (err) {
    console.error('Send test email error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
