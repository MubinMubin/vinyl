import { NextRequest, NextResponse } from 'next/server'

const SPOTIFY_API = 'https://api.spotify.com/v1'
const PLAYLIST_ID = process.env.SPOTIFY_PLAYLIST_ID

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

  if (!PLAYLIST_ID) {
    return NextResponse.json(
      { error: 'Playlist is not configured' },
      { status: 503, headers: NO_STORE_HEADERS }
    )
  }

  const headers = { Authorization: `Bearer ${accessToken}` }

  try {
    const playlistResponse = await fetch(
      `${SPOTIFY_API}/playlists/${encodeURIComponent(PLAYLIST_ID)}?fields=id,name,description,images,uri,owner(display_name),tracks(total)`,
      { headers, cache: 'no-store' }
    )

    if (playlistResponse.status === 401) {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401, headers: NO_STORE_HEADERS }
      )
    }

    if (!playlistResponse.ok) {
      return NextResponse.json(
        { error: 'Could not load playlist' },
        { status: playlistResponse.status, headers: NO_STORE_HEADERS }
      )
    }

    const playlist = await playlistResponse.json()

    const tracks: any[] = []
    let nextUrl: string | null =
      `${SPOTIFY_API}/playlists/${encodeURIComponent(PLAYLIST_ID)}/tracks?limit=100`

    while (nextUrl) {
      const tracksResponse = await fetch(nextUrl, { headers, cache: 'no-store' })

      if (!tracksResponse.ok) {
        return NextResponse.json(
          { error: 'Could not load playlist tracks' },
          { status: tracksResponse.status, headers: NO_STORE_HEADERS }
        )
      }

      const page = await tracksResponse.json()
      for (const item of page.items || []) {
        const track = item?.track
        if (!track || track.type !== 'track' || !track.id) continue

        tracks.push({
          id: track.id,
          uri: track.uri,
          name: track.name,
          duration_ms: track.duration_ms,
          explicit: !!track.explicit,
          artists: (track.artists || []).map((artist: any) => ({
            id: artist.id,
            name: artist.name
          })),
          album: {
            id: track.album?.id,
            name: track.album?.name,
            release_date: track.album?.release_date,
            images: track.album?.images || []
          }
        })
      }

      nextUrl = page.next || null
    }

    return NextResponse.json(
      {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        images: playlist.images || [],
        uri: playlist.uri,
        owner: playlist.owner,
        total: tracks.length,
        tracks
      },
      { headers: NO_STORE_HEADERS }
    )
  } catch (error) {
    console.error('Error loading curated playlist:', error)
    return NextResponse.json(
      { error: 'Failed to load playlist' },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}
