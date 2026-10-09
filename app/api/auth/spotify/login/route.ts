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

// Scopes needed for playback control and reading user data
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-read-playback-position',
  'user-read-email',
  'user-read-private',
  'streaming',
  'app-remote-control'
].join(' ')

export async function GET(request: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: 'Spotify is not configured yet.' },
      { status: 503 }
    )
  }

  const redirectUri = getRedirectUri(request)

  // Generate cryptographically secure random state for CSRF protection
  const state = randomBytes(32).toString('hex')

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    show_dialog: 'true'
  })

  const authUrl = `${SPOTIFY_AUTH_URL}?${params.toString()}`

  // Set state in cookie for verification
  const response = NextResponse.redirect(authUrl)
  response.cookies.set('spotify_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10
  })

  return response
}
