export interface GiftTrackNote {
  heading: string
  body: string
  artwork?: string
}

// Demo-only placeholders. Final personal notes will be added here after the repo is private.
const TRACK_NOTES: Record<string, GiftTrackNote> = {}

export function getGiftTrackNote(trackId: string, index: number): GiftTrackNote {
  return TRACK_NOTES[trackId] ?? {
    heading: `Track ${String(index + 1).padStart(2, '0')} · why this one`,
    body: 'Your personal note about why you chose this song will live here.'
  }
}
