"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Disc3,
  Heart,
  LogOut,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
} from "lucide-react"
import { useGiftSpotify } from "@/hooks/use-gift-spotify"
import { useWebPlayback } from "@/hooks/use-web-playback"
import styles from "./gift-player.module.css"

interface GiftNote {
  heading: string
  body: string
  artwork?: string
}

interface GiftTrack {
  id: string
  uri: string
  name: string
  duration_ms: number
  explicit: boolean
  artists: Array<{ id: string; name: string }>
  album: {
    id?: string
    name?: string
    release_date?: string
    images: Array<{ url: string; width?: number; height?: number }>
  }
  note: GiftNote
}

interface GiftPlaylist {
  id: string
  name: string
  description?: string
  images: Array<{ url: string; width?: number; height?: number }>
  uri: string
  total: number
  tracks: GiftTrack[]
}

function formatTime(ms = 0) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export default function GiftPlayer() {
  const {
    user,
    playbackState,
    accessToken,
    isLoading,
    error,
    isAuthenticated,
    isPremium,
    play,
    pause,
    next,
    previous,
    refreshPlayback,
    logout,
  } = useGiftSpotify()

  const {
    isReady: playbackReady,
    sdkError,
    connectionStatus,
    playUri,
    seek,
    activateElement,
  } = useWebPlayback(accessToken, isPremium)

  const [playlist, setPlaylist] = useState<GiftPlaylist | null>(null)
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [playlistError, setPlaylistError] = useState<string | null>(null)
  const [pendingTrackId, setPendingTrackId] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setPlaylist(null)
      return
    }

    let cancelled = false

    async function loadPlaylist() {
      setPlaylistLoading(true)
      setPlaylistError(null)

      try {
        const response = await fetch("/api/spotify/playlist", { cache: "no-store" })
        if (!response.ok) throw new Error("Playlist unavailable")
        const data = await response.json()
        if (!cancelled) setPlaylist(data)
      } catch {
        if (!cancelled) setPlaylistError("The demo record could not be loaded.")
      } finally {
        if (!cancelled) setPlaylistLoading(false)
      }
    }

    loadPlaylist()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (playbackState?.item?.id && playbackState.item.id === pendingTrackId) {
      setPendingTrackId(null)
      setSwitching(false)
    }
  }, [playbackState?.item?.id, pendingTrackId])

  const activeTrackId = playbackState?.item?.id || pendingTrackId

  const activeIndex = useMemo(() => {
    if (!playlist || !activeTrackId) return -1
    return playlist.tracks.findIndex((track) => track.id === activeTrackId)
  }, [playlist, activeTrackId])

  const activeTrack =
    activeIndex >= 0 && playlist
      ? playlist.tracks[activeIndex]
      : playlist?.tracks[0] || null

  const isPlaying = !!playbackState?.is_playing
  const progressMs =
    playbackState?.item?.id === activeTrack?.id ? playbackState?.progress_ms || 0 : 0
  const progress =
    activeTrack?.duration_ms ? Math.min(100, (progressMs / activeTrack.duration_ms) * 100) : 0

  const art =
    activeTrack?.note?.artwork ||
    activeTrack?.album?.images?.[0]?.url ||
    playlist?.images?.[0]?.url ||
    "/placeholder_album.png"

  async function playTrack(track: GiftTrack) {
    activateElement()
    if (!playlist || !playbackReady || !isPremium || switching) return

    setSwitching(true)
    setPendingTrackId(track.id)

    try {
      await playUri(track.uri, playlist.uri)
      window.setTimeout(refreshPlayback, 350)
      window.setTimeout(() => setSwitching(false), 1000)
    } catch {
      setSwitching(false)
      setPendingTrackId(null)
    }
  }

  async function togglePlayback() {
    activateElement()
    if (!playlist || !isPremium || switching) return

    if (!playbackState?.item && playlist.tracks[0]) {
      await playTrack(playlist.tracks[0])
      return
    }

    if (isPlaying) {
      await pause()
    } else {
      await play()
    }
  }

  async function handleSeek(value: number) {
    if (!activeTrack || !seek || !playbackReady) return
    const positionMs = Math.round((value / 100) * activeTrack.duration_ms)
    await seek(positionMs)
    window.setTimeout(refreshPlayback, 150)
  }

  if (isLoading) {
    return (
      <main className={styles.loadingScreen}>
        <div className={styles.loadingRecord}>
          <Disc3 />
        </div>
        <p>Opening the record…</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className={styles.loginScreen}>
        <div className={styles.paperGlow} />
        <section className={styles.loginCard}>
          <div className={styles.kicker}>
            <Heart size={13} fill="currentColor" />
            FOR TUULI
          </div>

          <div className={styles.loginArtwork}>
            <div className={styles.loginSleeve}>
              <div className={styles.coverStamp}>SIDE A</div>
              <div className={styles.coverTitle}>A record made for you.</div>
              <div className={styles.coverSubtitle}>songs, small stories, and a few memories</div>
            </div>
            <div className={styles.loginVinyl}>
              <div className={styles.vinylGrooves} />
              <div className={styles.vinylLabel}>T</div>
            </div>
          </div>

          <h1>A little record, just for you.</h1>
          <p className={styles.loginCopy}>
            Connect Spotify to play the music. Your Spotify password is entered on Spotify,
            never on this site.
          </p>

          <a className={styles.spotifyButton} href="/api/auth/spotify/login">
            <span className={styles.spotifyDot}>●</span>
            Continue with Spotify
          </a>

          <p className={styles.loginPrivacy}>
            Playback uses Spotify · access can be revoked from Spotify at any time
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.shell}>
      <div className={styles.paperTexture} />

      <header className={styles.header}>
        <div>
          <div className={styles.kicker}>
            <Heart size={12} fill="currentColor" />
            FOR TUULI
          </div>
          <div className={styles.headerTitle}>A record made for you</div>
        </div>

        <button className={styles.accountButton} onClick={logout} type="button">
          <span>{user?.display_name}</span>
          <LogOut size={15} />
        </button>
      </header>

      {playlistLoading ? (
        <section className={styles.loadingInline}>Pressing the demo record…</section>
      ) : playlistError || !playlist ? (
        <section className={styles.errorCard}>
          <strong>Couldn’t load the record.</strong>
          <span>{playlistError || "Try reconnecting Spotify."}</span>
        </section>
      ) : (
        <div className={styles.layout}>
          <section className={styles.playerColumn}>
            <div className={styles.artStage}>
              <div className={styles.sleeveWrap}>
                <div className={styles.sleeve}>
                  <Image
                    src={art}
                    alt={activeTrack ? `${activeTrack.name} artwork` : "Record artwork"}
                    fill
                    className={styles.sleeveImage}
                    priority
                  />
                  <div className={styles.sleeveShade} />
                  <div className={styles.sleeveTop}>
                    <span>FOR TUULI</span>
                    <span>{activeIndex >= 0 ? String(activeIndex + 1).padStart(2, "0") : "A"}</span>
                  </div>
                  <div className={styles.sleeveBottom}>
                    <span className={styles.sleeveTrack}>{activeTrack?.name || playlist.name}</span>
                    <span className={styles.sleeveArtist}>
                      {activeTrack?.artists?.map((artist) => artist.name).join(", ") || "Demo record"}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.vinylWrap}>
                <div
                  className={`${styles.vinyl} ${isPlaying ? styles.vinylPlaying : ""}`}
                  aria-hidden="true"
                >
                  <div className={styles.vinylGrooves} />
                  <div className={styles.vinylHighlight} />
                  <div className={styles.vinylCenter}>
                    <span>T</span>
                    <small>{activeIndex >= 0 ? String(activeIndex + 1).padStart(2, "0") : "A"}</small>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.nowPlaying}>
              <div className={styles.nowPlayingMeta}>
                <span className={styles.eyebrow}>
                  {isPlaying
                    ? "NOW PLAYING"
                    : playbackReady
                      ? "READY TO PLAY"
                      : connectionStatus === "error"
                        ? "PLAYER NEEDS ATTENTION"
                        : "CONNECTING PLAYER"}
                </span>
                <h1>{activeTrack?.name || playlist.name}</h1>
                <p>{activeTrack?.artists?.map((artist) => artist.name).join(", ")}</p>
              </div>

              <div className={styles.controls}>
                <button
                  type="button"
                  aria-label="Previous song"
                  onClick={previous}
                  disabled={!playbackState?.item || switching}
                >
                  <SkipBack size={20} fill="currentColor" />
                </button>

                <button
                  type="button"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className={styles.playButton}
                  onClick={togglePlayback}
                  disabled={!isPremium || !playbackReady || switching}
                >
                  {isPlaying ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}
                </button>

                <button
                  type="button"
                  aria-label="Next song"
                  onClick={next}
                  disabled={!playbackState?.item || switching}
                >
                  <SkipForward size={20} fill="currentColor" />
                </button>
              </div>

              <div className={styles.progressRow}>
                <span>{formatTime(progressMs)}</span>
                <input
                  className={styles.progress}
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progress}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                  disabled={!activeTrack || !playbackReady}
                  aria-label="Song progress"
                />
                <span>{formatTime(activeTrack?.duration_ms || 0)}</span>
              </div>

              {!isPremium && (
                <div className={styles.notice}>
                  Spotify Premium is required for playback inside this gift.
                </div>
              )}

              {isPremium && !playbackReady && !sdkError && (
                <div className={styles.notice}>Connecting the private Spotify player…</div>
              )}

              {sdkError && <div className={styles.notice}>{sdkError}</div>}
              {error && <div className={styles.notice}>{error}</div>}
            </div>
          </section>

          <aside className={styles.storyColumn}>
            <section className={styles.noteCard}>
              <div className={styles.notePin}>✦</div>
              <div className={styles.noteEyebrow}>WHY I CHOSE THIS ONE</div>
              <h2>{activeTrack?.note.heading}</h2>
              <p>{activeTrack?.note.body}</p>
              <div className={styles.noteSignoff}>— your liner note goes here</div>
            </section>

            <section className={styles.trackPanel}>
              <div className={styles.trackPanelHeader}>
                <div>
                  <span className={styles.eyebrow}>THE RECORD</span>
                  <h2>{playlist.name}</h2>
                </div>
                <div className={styles.trackCount}>{playlist.total} tracks</div>
              </div>

              <div className={styles.trackList}>
                {playlist.tracks.map((track, index) => {
                  const selected = track.id === activeTrackId
                  return (
                    <button
                      type="button"
                      className={`${styles.trackRow} ${selected ? styles.trackRowActive : ""}`}
                      onClick={() => playTrack(track)}
                      disabled={!isPremium || !playbackReady || switching}
                      key={track.id}
                    >
                      <span className={styles.trackNumber}>
                        {selected && isPlaying ? (
                          <span className={styles.equaliser}>
                            <i />
                            <i />
                            <i />
                          </span>
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>

                      <span className={styles.trackThumb}>
                        {track.album.images?.[0]?.url && (
                          <Image src={track.album.images[0].url} alt="" fill className={styles.trackThumbImage} />
                        )}
                      </span>

                      <span className={styles.trackText}>
                        <strong>{track.name}</strong>
                        <small>{track.artists.map((artist) => artist.name).join(", ")}</small>
                      </span>

                      <span className={styles.trackDuration}>{formatTime(track.duration_ms)}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <footer className={styles.footer}>
              <span><Sparkles size={13} /> demo edition</span>
              <span>Playback by Spotify</span>
            </footer>
          </aside>
        </div>
      )}
    </main>
  )
}
