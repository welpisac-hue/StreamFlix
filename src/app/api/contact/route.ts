import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { clientKey, rateLimit } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const rateLimitId = userId ? `contact:${userId}:${clientKey(request)}` : `contact:guest:${clientKey(request)}`

    const limited = await rateLimit(rateLimitId, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many messages. Try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limited.retryAfterSec) },
        }
      )
    }

    const body = await request.json()
    const name = String(body.name || '').trim().slice(0, 100)
    const email = String(body.email || '').trim().slice(0, 200)
    const subject = String(body.subject || '').trim().slice(0, 200)
    const message = String(body.message || '').trim().slice(0, 5000)

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    // Email delivery is not wired yet; log for operators and acknowledge receipt.
    // Do not echo CONTACT_EMAIL back to clients.
    console.log('Contact form submission:', {
      userId: userId || 'guest',
      username: session?.user?.username || 'Guest',
      name,
      email,
      subject,
      messageLength: message.length,
      message,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      message: 'Message received. Our team will review it shortly.',
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
