import { useCallback, useEffect, useState } from 'react'

interface GiftSpotifyUser {
  display_name: string
  product: 'free' | 'premium'
  images: Array<{ url: string }>
}

export interface GiftSpotifyTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string }>
    release_date: string
  }
  duration_ms: number
}

interface GiftPlaybackState {
  is_playing: boolean
  progress_ms: number
  item: GiftSpotifyTrack | null
}

export function useGiftSpotify() {
  const [user, setUser] = useState<GiftSpotifyUser | null>(null)
  const [playbackState, setPlaybackState] = useState<GiftPlaybackState | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshPlayback = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/player', { cache: 'no-store' })
      if (response.status === 401) return null
      if (!response.ok) throw new Error('Playback state unavailable')
      const state = await response.json()
      setPlaybackState(state)
      return state
    } catch {
      return null
    }
  }, [])

  const loadSession = useCallback(async () => {
    try {
      const me = await fetch('/api/spotify/me', { cache: 'no-store' })
      if (me.status === 401) {
        setUser(null)
        setAccessToken(null)
        return
      }
      if (!me.ok) throw new Error('Could not load Spotify session')

      const profile = await me.json()
      setUser({
        display_name: profile.display_name || 'Spotify listener',
        product: profile.product,
        images: profile.images || [],
      })

      const tokenResponse = await fetch('/api/spotify/token', { cache: 'no-store' })
      if (!tokenResponse.ok) throw new Error('Could not load playback token')
      const { token } = await tokenResponse.json()
      setAccessToken(token)

      await refreshPlayback()
    } catch {
      setError('Spotify could not be connected.')
    } finally {
      setIsLoading(false)
    }
  }, [refreshPlayback])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    if (!user) return
    const interval = window.setInterval(
      refreshPlayback,
      playbackState?.is_playing ? 1000 : 4000
    )
    return () => window.clearInterval(interval)
  }, [user, playbackState?.is_playing, refreshPlayback])

  const control = useCallback(async (method: 'PUT' | 'POST', action: string) => {
    const response = await fetch('/api/spotify/player', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.message || 'Playback control failed.')
      return false
    }

    window.setTimeout(refreshPlayback, 250)
    return true
  }, [refreshPlayback])

  const play = useCallback(() => control('PUT', 'play'), [control])
  const pause = useCallback(() => control('PUT', 'pause'), [control])
  const next = useCallback(() => control('POST', 'next'), [control])
  const previous = useCallback(() => control('POST', 'previous'), [control])

  const logout = useCallback(async () => {
    await fetch('/api/auth/spotify/logout', { method: 'POST' })
    window.location.reload()
  }, [])

  return {
    user,
    playbackState,
    accessToken,
    isLoading,
    error,
    isAuthenticated: !!user,
    isPremium: user?.product === 'premium',
    play,
    pause,
    next,
    previous,
    refreshPlayback,
    logout,
  }
}
