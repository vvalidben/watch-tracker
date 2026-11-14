import type { CsvImportRow } from './enhancements'
import { isValidRating } from './ratings'
import { validateWatchDate } from './watchDates'

export const CSV_TEMPLATE = 'title,source,media_type,external_id,status,rating,notes,favorite,watched_at\r\nExample film,tmdb,movie,123,plan_to_watch,8.5,"My notes",false,\r\n'

/** RFC 4180 quoting, including multiline notes, escaped quotes, BOM and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false, closed = false
  const input = text.replace(/^\uFEFF/, '')
  for (let index = 0; index < input.length; index++) {
    const char = input[index]
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { field += '"'; index++ }
      else if (char === '"') { quoted = false; closed = true }
      else field += char
    } else if (char === '"') {
      if (field.length || closed) throw new Error('Unexpected quote in CSV field')
      quoted = true
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(field); field = ''; closed = false
      if (char !== ',') {
        if (row.some((value) => value.trim())) rows.push(row)
        row = []
        if (char === '\r' && input[index + 1] === '\n') index++
      }
    } else {
      if (closed && char.trim()) throw new Error('Unexpected text after a quoted CSV field')
      if (!closed) field += char
    }
  }
  if (quoted) throw new Error('Unclosed quoted CSV field')
  row.push(field)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

export interface ParsedImportRow { row: CsvImportRow; error: string | null }
export function parseLibraryCsv(contents: string): { rows: ParsedImportRow[]; fields: string[] } {
  const [header, ...records] = parseCsv(contents)
  if (!header) throw new Error('The CSV file is empty')
  const fields = header.map((value) => value.trim().toLowerCase())
  if (new Set(fields).size !== fields.length) throw new Error('CSV column names must be unique')
  for (const required of ['title', 'source', 'media_type', 'external_id']) if (!fields.includes(required)) throw new Error(`Missing required CSV column: ${required}`)
  if (records.length > 5000) throw new Error('Import up to 5,000 titles at a time')
  return { fields, rows: records.map((values, index) => {
    const value = (name: string): string => (values[fields.indexOf(name)] ?? '').trim()
    const source = value('source'), mediaType = value('media_type'), id = value('external_id'), title = value('title')
    const status = value('status') || 'plan_to_watch'
    const rating = value('rating') === '' ? null : Number(value('rating'))
    const favorite = value('favorite').toLowerCase()
    let error: string | null = null, watchedAt: string | null = null
    if (values.length !== fields.length) error = `Expected ${fields.length} columns, received ${values.length}`
    else if (!title) error = 'Title is required'
    else if (!['tmdb', 'anilist'].includes(source)) error = 'Source must be tmdb or anilist'
    else if (!['movie', 'tv', 'anime'].includes(mediaType)) error = 'Media type must be movie, tv or anime'
    else if ((source === 'anilist') !== (mediaType === 'anime')) error = 'Use AniList for anime and TMDB for films/TV'
    else if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) error = 'External ID must be a positive integer'
    else if (!['plan_to_watch', 'watching', 'completed', 'on_hold', 'dropped'].includes(status)) error = 'Unknown watch status'
    else if (!isValidRating(rating)) error = 'Rating must be 0–10 in half-point steps'
    else if (favorite && !['true', 'false', '1', '0'].includes(favorite)) error = 'Favorite must be true or false'
    else if (value('watched_at') && mediaType !== 'movie') error = 'watched_at is for films; log episode dates from the title page'
    if (!error && value('watched_at')) {
      try { watchedAt = validateWatchDate(value('watched_at')) } catch (cause) { error = (cause as Error).message }
    }
    return { error, row: { line: index + 2, title, source: source as CsvImportRow['source'], mediaType: mediaType as CsvImportRow['mediaType'],
      externalId: id, watchStatus: status as CsvImportRow['watchStatus'], rating, notes: value('notes') || null,
      favorite: favorite === 'true' || favorite === '1', watchedAt } }
  }) }
}
