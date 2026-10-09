export interface TrackNote {
  heading: string
  body: string
  artwork?: string
}

/**
 * Personal song notes live here, keyed by Spotify track ID.
 *
 * Example:
 * '4uLU6hMCjMI75M1A2tKUQC': {
 *   heading: 'The one that takes me back',
 *   body: 'Your personal note here.',
 *   artwork: '/art/track-01.webp'
 * }
 */
export const TRACK_NOTES: Record<string, TrackNote> = {}

export function getTrackNote(trackId: string, index: number): TrackNote {
  return TRACK_NOTES[trackId] ?? {
    heading: `Demo note · Track ${String(index + 1).padStart(2, '0')}`,
    body: 'Your personal note about why you chose this song will appear here.'
  }
}
