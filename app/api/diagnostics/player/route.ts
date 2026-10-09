import { NextRequest, NextResponse } from 'next/server'

const NO_STORE = {
  'Cache-Control': 'no-store, private, max-age=0',
  Pragma: 'no-cache',
}

function clean(value: unknown, max = 300) {
  if (typeof value !== 'string') return ''
  return value.slice(0, max)
}

export async function POST(request: NextRequest) {
  // Only accept diagnostics from an authenticated Spotify session.
  if (!request.cookies.get('spotify_access_token')?.value) {
    return NextResponse.json({ ok: false }, { status: 401, headers: NO_STORE })
  }

  try {
    const body = await request.json()

    const event = clean(body?.event, 80)
    const message = clean(body?.message, 400)
    const detail = clean(body?.detail, 400)
    const userAgent = clean(body?.userAgent, 500)
    const secureContext = !!body?.secureContext
    const mediaKeys = !!body?.mediaKeys
    const visibility = clean(body?.visibility, 40)

    console.info('[spotify-player-diag]', {
      event,
      message,
      detail,
      secureContext,
      mediaKeys,
      visibility,
      userAgent,
    })

    return NextResponse.json({ ok: true }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: NO_STORE })
  }
}
