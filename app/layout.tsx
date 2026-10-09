import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://tuuli-vinyl-mubinmubins-projects.vercel.app'),
  title: 'For Tuuli — A Record Made for You',
  description: 'A private, personal Spotify-powered music gift.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  icons: {
    icon: '/record.svg',
    apple: '/record.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#efe7d8" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
html, body {
  margin: 0;
  min-height: 100%;
  background: #efe7d8;
}
body {
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
}
button, a, input {
  font: inherit;
}
`}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
