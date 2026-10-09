import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.scdn.co",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.scdn.co https://i.scdn.co https://mosaic.scdn.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.spotify.com wss://*.spotify.com https://*.scdn.co",
    "media-src 'self' blob: https://*.spotify.com https://*.scdn.co",
    "frame-src https://*.spotify.com https://sdk.scdn.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3)$).*)',
  ],
}
