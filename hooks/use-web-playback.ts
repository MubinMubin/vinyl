import { useEffect, useState, useCallback, useRef } from 'react'

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: typeof Spotify
  }
}

interface WebPlaybackPlayer {
  addListener: (event: string, callback: (state: any) => void) => boolean
  connect: () => Promise<boolean>
  disconnect: () => void
  getCurrentState: () => Promise<any>
  getVolume: () => Promise<number>
  setVolume: (volume: number) => Promise<void>
  seek: (position: number) => Promise<void>
}

export function useWebPlayback(token: string | null, isPremium: boolean) {
  const [player, setPlayer] = useState<WebPlaybackPlayer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<any>(null)
  const [isPaused, setIsPaused] = useState(true)
  const [position, setPosition] = useState(0)
  const [volume, setVolumeState] = useState(50)
  const [sdkError, setSdkError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'loading' | 'connecting' | 'ready' | 'error'>('idle')
  const playerRef = useRef<WebPlaybackPlayer | null>(null)
  const readyRef = useRef(false)

  const transferPlayback = useCallback(async (targetDeviceId: string) => {
    if (!token) return false

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [targetDeviceId],
          play: false
        })
      })

      return response.ok
    } catch (error) {
      console.error('Error transferring playback:', error)
      return false
    }
  }, [token])

  const playUri = useCallback(async (uri: string, contextUri?: string) => {
    if (!token || !deviceId) {
      throw new Error('Spotify browser player is not ready yet.')
    }

    const body: Record<string, unknown> = {}

    if (contextUri) {
      body.context_uri = contextUri
      if (uri) body.offset = { uri }
    } else if (uri) {
      body.uris = [uri]
    }

    const playUrl = new URL('https://api.spotify.com/v1/me/player/play')
    playUrl.searchParams.set('device_id', deviceId)

    const response = await fetch(playUrl.toString(), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      console.error('Spotify play request failed', response.status, bodyText)
      throw new Error('Spotify could not start this song.')
    }
  }, [token, deviceId])

  const setVolume = useCallback(async (volumePercent: number) => {
    if (!playerRef.current || !isReady) return false

    try {
      await playerRef.current.setVolume(volumePercent / 100)
      setVolumeState(volumePercent)
      return true
    } catch (error) {
      console.error('Error setting volume:', error)
      return false
    }
  }, [isReady])

  const getVolume = useCallback(async () => {
    if (!playerRef.current || !isReady) return null

    try {
      const currentVolume = await playerRef.current.getVolume()
      const volumePercent = Math.round(currentVolume * 100)
      setVolumeState(volumePercent)
      return volumePercent
    } catch (error) {
      console.error('Error getting volume:', error)
      return null
    }
  }, [isReady])

  const seek = useCallback(async (positionMs: number) => {
    if (!playerRef.current || !isReady) return false

    try {
      await playerRef.current.seek(positionMs)
      return true
    } catch (error) {
      console.error('Error seeking:', error)
      return false
    }
  }, [isReady])

  useEffect(() => {
    if (!isPremium || !token) {
      setConnectionStatus('idle')
      return
    }

    let disposed = false
    let timeoutId: number | undefined

    setSdkError(null)
    setConnectionStatus('loading')
    readyRef.current = false

    const fail = (message: string) => {
      if (disposed) return
      console.error(message)
      setSdkError(message)
      setConnectionStatus('error')
      setIsReady(false)
    }

    const initialisePlayer = () => {
      if (disposed || !window.Spotify || playerRef.current) return

      setConnectionStatus('connecting')

      const spotifyPlayer = new window.Spotify.Player({
        name: 'For Tuuli',
        getOAuthToken: async (cb: (freshToken: string) => void) => {
          try {
            const response = await fetch('/api/spotify/token', { cache: 'no-store' })
            if (!response.ok) {
              fail('Spotify session expired. Please sign out and reconnect Spotify.')
              return
            }
            const data = await response.json()
            cb(data.token)
          } catch {
            fail('Could not refresh the Spotify playback token.')
          }
        },
        volume: 0.5
      })

      spotifyPlayer.addListener('ready', async ({ device_id }) => {
        if (disposed) return
        readyRef.current = true
        setDeviceId(device_id)
        setIsReady(true)
        setSdkError(null)
        setConnectionStatus('ready')
        await transferPlayback(device_id)
      })

      spotifyPlayer.addListener('not_ready', () => {
        if (disposed) return
        readyRef.current = false
        setIsReady(false)
        setConnectionStatus('connecting')
      })

      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        fail(`Spotify player could not initialise: ${message}`)
      })

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        fail(`Spotify player authentication failed: ${message}. Please reconnect Spotify.`)
      })

      spotifyPlayer.addListener('account_error', ({ message }) => {
        fail(`Spotify account cannot use browser playback: ${message}`)
      })

      spotifyPlayer.addListener('playback_error', ({ message }) => {
        if (!disposed) setSdkError(`Spotify playback error: ${message}`)
      })

      spotifyPlayer.addListener('autoplay_failed', () => {
        if (!disposed) {
          setSdkError('Your browser blocked automatic playback. Tap a song or the play button to start.')
        }
      })

      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state || disposed) return
        setCurrentTrack(state.track_window.current_track)
        setIsPaused(state.paused)
        setPosition(state.position)
        setIsActive(!state.paused)
      })

      playerRef.current = spotifyPlayer as any
      setPlayer(spotifyPlayer as any)

      spotifyPlayer.connect()
        .then((success: boolean) => {
          if (!success) fail('Spotify browser player could not connect.')
        })
        .catch((error: unknown) => {
          console.error('Spotify SDK connect failed:', error)
          fail('Spotify browser player could not connect.')
        })

      timeoutId = window.setTimeout(() => {
        if (!readyRef.current && !disposed) {
          fail('Spotify player timed out while connecting. This is usually caused by a blocked Spotify connection or an unsupported browser setting.')
        }
      }, 12000)
    }

    window.onSpotifyWebPlaybackSDKReady = initialisePlayer

    if (window.Spotify) {
      initialisePlayer()
    } else {
      let script = document.querySelector<HTMLScriptElement>('script[src="https://sdk.scdn.co/spotify-player.js"]')

      if (!script) {
        script = document.createElement('script')
        script.src = 'https://sdk.scdn.co/spotify-player.js'
        script.async = true
        script.dataset.tuuliSpotifySdk = 'true'
        script.onerror = () => fail('Spotify playback library could not be loaded.')
        document.body.appendChild(script)
      } else {
        script.onerror = () => fail('Spotify playback library could not be loaded.')
      }
    }

    return () => {
      disposed = true
      if (timeoutId) window.clearTimeout(timeoutId)

      if (playerRef.current) {
        playerRef.current.disconnect()
        playerRef.current = null
      }

      setPlayer(null)
      setIsReady(false)
      readyRef.current = false
    }
  }, [isPremium, token, transferPlayback])

  return {
    player,
    isReady,
    deviceId,
    isActive,
    currentTrack,
    isPaused,
    position,
    volume,
    sdkError,
    connectionStatus,
    playUri,
    transferPlayback,
    setVolume,
    getVolume,
    seek
  }
}
