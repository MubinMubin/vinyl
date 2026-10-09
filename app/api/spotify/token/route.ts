import { NextRequest, NextResponse } from 'next/server'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, private, max-age=0',
  'Pragma': 'no-cache'
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401, headers: NO_STORE_HEADERS }
    )
  }

  // The Web Playback SDK needs a short-lived access token in browser memory.
  // Never persist this token to localStorage/sessionStorage.
  return NextResponse.json(
    { token: accessToken },
    { headers: NO_STORE_HEADERS }
  )
}
