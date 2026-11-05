import type { MediaType, MetadataSource } from './metadata'

/** One "marked watched" action, resolved to something a person can read. Backed by the append-only watch_events ledger. */
export interface WatchLogEntry {
  mediaItemId: number
  title: string
  mediaType: MediaType
  source: MetadataSource | 'manual'
  sourceId: string | null
  numberOfSeasons: number | null
  watchedAt: string
  /** Null for a movie-level event. */
  seasonNumber: number | null
  /** Null for a movie-level event. */
  episodeNumber: number | null
}

export interface GetWatchLogResponse {
  /** Newest first. */
  entries: WatchLogEntry[]
}

export function isFilmEntry(entry: Pick<WatchLogEntry, 'episodeNumber'>): boolean {
  return entry.episodeNumber === null
}

/** "Film", "E5", or "S2 · E5" — the season is only spelled out when it adds information. */
export function watchLogLabel(entry: WatchLogEntry): string {
  if (isFilmEntry(entry)) return 'Film'
  const showSeason = (entry.numberOfSeasons ?? 1) > 1 || entry.seasonNumber !== 1
  return `${showSeason ? `S${entry.seasonNumber} · ` : ''}E${entry.episodeNumber}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The local calendar day ("YYYY-MM-DD") a timestamp falls on — a late-night watch belongs to the day the user experienced it. */
export function localDayKey(iso: string): string | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : dayKeyOf(date)
}

export function todayKey(now: Date = new Date()): string {
  return dayKeyOf(now)
}

export interface CalendarDayTitle {
  mediaItemId: number
  title: string
  count: number
}

export interface CalendarDay {
  dayKey: string
  dayOfMonth: number
  inMonth: boolean
  entries: WatchLogEntry[]
  /** The day's entries collapsed per title, in first-seen order. */
  titles: CalendarDayTitle[]
}

/** Every day of whole Monday-first weeks covering the given month (`monthIndex` is 0-based), with that day's entries attached. */
export function buildCalendarMonth(year: number, monthIndex: number, entries: readonly WatchLogEntry[]): CalendarDay[] {
  const byDay = new Map<string, WatchLogEntry[]>()
  for (const entry of entries) {
    const key = localDayKey(entry.watchedAt)
    if (key === null) continue
    const list = byDay.get(key)
    if (list) list.push(entry)
    else byDay.set(key, [entry])
  }

  const first = new Date(year, monthIndex, 1)
  const leadingDays = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(year, monthIndex, 1 - leadingDays + index)
    const dayKey = dayKeyOf(date)
    const dayEntries = byDay.get(dayKey) ?? []

    const titles = new Map<number, CalendarDayTitle>()
    for (const entry of dayEntries) {
      const existing = titles.get(entry.mediaItemId)
      if (existing) existing.count += 1
      else titles.set(entry.mediaItemId, { mediaItemId: entry.mediaItemId, title: entry.title, count: 1 })
    }

    return {
      dayKey,
      dayOfMonth: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
      entries: dayEntries,
      titles: [...titles.values()]
    }
  })
}

export function countMonthEntries(
  entries: readonly WatchLogEntry[],
  year: number,
  monthIndex: number
): { episodes: number; films: number } {
  const prefix = `${year}-${pad(monthIndex + 1)}-`
  const inMonth = entries.filter((entry) => localDayKey(entry.watchedAt)?.startsWith(prefix))
  const films = inMonth.filter(isFilmEntry).length
  return { episodes: inMonth.length - films, films }
}
