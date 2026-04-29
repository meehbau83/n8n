import { NextRequest, NextResponse } from 'next/server'

// Base URL for tracking link
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://latousa.com'

// Email sending (using Resend)
// If no RESEND_API_KEY is set, emails will be logged but not sent
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.log('[v0] Email notification (no API key configured):')
    console.log(`  To: ${to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Body: ${body}`)
    return true // Return true so flow continues
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Lato <noreply@latousa.com>',
        to: [to],
        subject,
        text: body,
      }),
    })

    if (!response.ok) {
      console.error('[v0] Email send failed:', await response.text())
      return false
    }

    console.log('[v0] Email sent successfully to:', to)
    return true
  } catch (error) {
    console.error('[v0] Email send error:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transaction_code, sender_email, amount } = body

    if (!transaction_code) {
      return NextResponse.json(
        { error: 'Transaction code is required' },
        { status: 400 }
      )
    }

    // Generate tracking link
    const trackingLink = `${BASE_URL}/history?code=${transaction_code}`

    const results: { email?: boolean } = {}

    // Send email notification if sender_email exists
    if (sender_email) {
      const subject = 'Lato - Giao dịch của bạn đã được tạo'
      const emailBody = `Chào bạn,

Giao dịch của bạn đã được tạo thành công.

Mã giao dịch:
${transaction_code}

Trạng thái:
Chờ biên nhận Zelle

Số tiền gửi:
$${amount || 0}

Bạn có thể kiểm tra trạng thái tại:

${trackingLink}

Cảm ơn bạn đã sử dụng Lato.`

      results.email = await sendEmail(sender_email, subject, emailBody)
    }

    return NextResponse.json({ 
      success: true, 
      trackingLink,
      notifications: results 
    })

  } catch (error) {
    console.error('[v0] Notification API error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
