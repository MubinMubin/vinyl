"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Music2, Play } from "lucide-react"
import { getTrackNote } from "@/lib/track-notes"

interface CuratedTrack {
  id: string
  uri: string
  name: string
  duration_ms: number
  artists: Array<{ id: string; name: string }>
  album: {
    id?: string
    name?: string
    images: Array<{ url: string; width?: number; height?: number }>
  }
}

interface CuratedPlaylist {
  id: string
  name: string
  uri: string
  images: Array<{ url: string; width?: number; height?: number }>
  total: number
  tracks: CuratedTrack[]
}

interface CuratedPlaylistPanelProps {
  currentTrackId?: string | null
  canPlay: boolean
  onPlayTrack: (uri: string, contextUri: string) => Promise<void> | void
}

function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function CuratedPlaylistPanel({
  currentTrackId,
  canPlay,
  onPlayTrack,
}: CuratedPlaylistPanelProps) {
  const [playlist, setPlaylist] = useState<CuratedPlaylist | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadPlaylist() {
      try {
        setLoading(true)
        const response = await fetch("/api/spotify/playlist", { cache: "no-store" })
        if (!response.ok) throw new Error("Could not load playlist")
        const data = await response.json()
        if (!cancelled) setPlaylist(data)
      } catch {
        if (!cancelled) setLoadError("Could not load the demo playlist.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPlaylist()
    return () => {
      cancelled = true
    }
  }, [])

  const activeIndex = useMemo(
    () => playlist?.tracks.findIndex((track) => track.id === currentTrackId) ?? -1,
    [playlist, currentTrackId]
  )

  const activeTrack =
    activeIndex >= 0 && playlist ? playlist.tracks[activeIndex] : null
  const activeNote =
    activeTrack && activeIndex >= 0
      ? getTrackNote(activeTrack.id, activeIndex)
      : null

  if (loading) {
    return (
      <aside className="fixed left-4 top-20 bottom-24 z-40 w-80 rounded-2xl border bg-background/95 p-5 shadow-xl backdrop-blur">
        <div className="text-sm text-muted-foreground">Loading the record…</div>
      </aside>
    )
  }

  if (loadError || !playlist) {
    return (
      <aside className="fixed left-4 top-20 z-40 w-80 rounded-2xl border bg-background/95 p-5 shadow-xl backdrop-blur">
        <div className="text-sm text-muted-foreground">{loadError}</div>
      </aside>
    )
  }

  return (
    <aside className="fixed left-4 top-20 bottom-24 z-40 flex w-80 flex-col overflow-hidden rounded-2xl border bg-background/95 shadow-2xl backdrop-blur">
      <div className="border-b p-5">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          The record
        </div>
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 flex-none overflow-hidden rounded-md bg-muted">
            {playlist.images?.[0]?.url ? (
              <Image src={playlist.images[0].url} alt="" fill className="object-cover" />
            ) : (
              <Music2 className="absolute left-3 top-3 h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{playlist.name}</h2>
            <p className="text-xs text-muted-foreground">
              {playlist.total} tracks · demo playlist
            </p>
          </div>
        </div>
      </div>

      <div className="border-b bg-muted/30 p-5">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Why this one
        </div>
        {activeNote ? (
          <>
            <div className="mb-1 text-sm font-semibold">{activeNote.heading}</div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {activeNote.body}
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pick a song and its personal note will appear here.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {playlist.tracks.map((track, index) => {
          const isActive = track.id === currentTrackId
          return (
            <button
              key={track.id}
              type="button"
              disabled={!canPlay}
              onClick={() => onPlayTrack(track.uri, playlist.uri)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                isActive ? "bg-foreground text-background" : "hover:bg-muted"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <div className="w-6 text-center text-[11px] tabular-nums opacity-60">
                {isActive ? <Play className="mx-auto h-3.5 w-3.5 fill-current" /> : String(index + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{track.name}</div>
                <div className={`truncate text-xs ${isActive ? "opacity-70" : "text-muted-foreground"}`}>
                  {track.artists.map((artist) => artist.name).join(", ")}
                </div>
              </div>
              <div className="text-[11px] tabular-nums opacity-50">
                {formatDuration(track.duration_ms)}
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
