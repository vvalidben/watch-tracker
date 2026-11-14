import type { ImportDuplicateMode, ImportPreview, ImportResult } from '@shared/enhancements'
import { parseLibraryCsv } from '@shared/csvImport'
import type { Repositories } from '../db/repositories'
import { getOrCreateMediaItem } from './ensureLocalMedia'
import { randomUUID } from 'node:crypto'

export async function previewCsvImport(repositories: Repositories, contents: string, fileName: string): Promise<{ preview: ImportPreview; fields: string[] }> {
  const parsed = parseLibraryCsv(contents)
  const seen = new Set<string>()
  const rows: ImportPreview['rows'] = []
  for (const { row, error } of parsed.rows) {
    const key = `${row.source}:${row.mediaType}:${row.externalId}`
    const existing = !error ? await repositories.mediaItems.findBySource(row.source, row.externalId, row.mediaType) : undefined
    const entry = existing ? await repositories.libraryEntries.getByMediaItemId(existing.id) : undefined
    rows.push({ ...row, error, duplicate: Boolean(entry) || seen.has(key) })
    if (!error) seen.add(key)
  }
  return { preview: { token: randomUUID(), fileName, columns: parsed.fields, rows }, fields: parsed.fields }
}

/** Server-owned preview rows are applied locally; imports never guess a provider match from a title. */
export async function applyCsvImport(repositories: Repositories, preview: ImportPreview, fields: string[], mode: ImportDuplicateMode): Promise<ImportResult> {
  if (mode !== 'skip' && mode !== 'merge') throw new Error('Choose skip or merge for duplicates')
  return repositories.transaction(async () => {
    const result: ImportResult = { imported: 0, merged: 0, skipped: 0, errors: [] }
    for (const row of preview.rows) {
      if (row.error) { result.skipped++; continue }
      try {
        const media = await getOrCreateMediaItem(repositories, { externalId: row.externalId, source: row.source, mediaType: row.mediaType,
          title: row.title, originalTitle: null, description: null, poster: null, backdrop: null, releaseDate: null,
          status: null, genres: [], rating: null, numberOfSeasons: null, numberOfEpisodes: null })
        let entry = await repositories.libraryEntries.getByMediaItemId(media.id)
        const duplicate = Boolean(entry)
        if (entry && mode === 'skip') { result.skipped++; continue }
        if (!entry) entry = await repositories.libraryEntries.add({ mediaItemId: media.id, watchStatus: row.watchStatus,
          rating: row.rating, notes: row.notes, favorite: row.favorite })
        else {
          if (fields.includes('status') && entry.watchStatus !== row.watchStatus) await repositories.libraryEntries.updateStatus(entry.id, row.watchStatus)
          if (fields.includes('rating')) await repositories.libraryEntries.rate(entry.id, row.rating)
          if (fields.includes('notes')) await repositories.libraryEntries.setNotes(entry.id, row.notes)
          if (fields.includes('favorite')) await repositories.libraryEntries.setFavorite(entry.id, row.favorite)
        }
        if (row.mediaType === 'movie' && row.watchedAt) {
          const events = await repositories.watchEvents.listForMovie(media.id)
          if (!events.some((event) => event.watchedAt === row.watchedAt)) await repositories.watchEvents.record(media.id, null, row.watchedAt)
          const updated = await repositories.watchEvents.listForMovie(media.id)
          await repositories.libraryEntries.setCompletedAt(entry.id, updated.at(-1)!.watchedAt)
          await repositories.libraryEntries.setRewatchCount(entry.id, Math.max(0, updated.length - 1))
        }
        if (duplicate) result.merged++; else result.imported++
      } catch (error) { result.errors.push(`Row ${row.line}: ${error instanceof Error ? error.message : String(error)}`) }
    }
    return result
  })
}
