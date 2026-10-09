import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID

function getRedirectUri(request: NextRequest) {
  return (
    process.env.SPOTIFY_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/spotify/callback`
  )
}

// Request only the permissions this player actually uses.
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-read-email',
  'user-read-private',
  'streaming'
].join(' ')

export async function GET(request: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: 'Spotify is not configured yet.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const redirectUri = getRedirectUri(request)

  // Cryptographically secure anti-CSRF state.
  const state = randomBytes(32).toString('hex')

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    show_dialog: 'true'
  })

  const response = NextResponse.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`)
  response.headers.set('Cache-Control', 'no-store')
  response.cookies.set('spotify_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10
  })

  return response
}
