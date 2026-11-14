import { describe, expect, it } from 'vitest'
import { parseCsv, parseLibraryCsv } from './csvImport'

const header = 'title,source,media_type,external_id,status,rating,notes,favorite,watched_at\n'
describe('CSV import validation', () => {
  it('parses BOM, escaped quotes, commas and multiline notes', () => {
    const result = parseLibraryCsv('\uFEFF' + header + '"A, film",tmdb,movie,42,completed,8.5,"Line 1\n""Line 2""",true,2025-01-01T12:00:00Z')
    expect(result.rows[0].error).toBeNull()
    expect(result.rows[0].row).toMatchObject({ title: 'A, film', notes: 'Line 1\n"Line 2"', favorite: true, watchedAt: '2025-01-01T12:00:00.000Z' })
  })
  it.each([
    ['A,tmdb,movie,1,completed,10.5,,,', 'Rating'],
    ['A,tmdb,movie,1,completed,8.3,,,', 'Rating'],
    ['A,tmdb,anime,1,watching,,,,', 'AniList'],
    ['A,tmdb,movie,no,completed,,,,', 'External ID'],
    ['A,tmdb,movie,1,bad,,,,', 'status'],
    ['A,tmdb,movie,1,completed,,,yes,', 'Favorite'],
    ['A,tmdb,movie,1,completed,,,,2999-01-01', 'future'],
    ['A,anilist,anime,1,completed,,,,2025-01-01', 'films']
  ])('reports an actionable row error: %s', (row, message) => {
    expect(parseLibraryCsv(header + row).rows[0].error).toContain(message)
  })
  it('keeps invalid rows in the preview instead of dropping them', () => {
    const result = parseLibraryCsv(header + 'A,tmdb,movie,1,plan_to_watch,,,,\nB,tmdb,movie,bad,completed,,,,')
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].error).toBeNull()
    expect(result.rows[1].error).not.toBeNull()
  })
  it('requires explicit provider IDs instead of guessing by title', () => {
    expect(() => parseLibraryCsv('title,rating\nA,8')).toThrow('source')
  })
  it('rejects malformed quoting and duplicate headers', () => {
    expect(() => parseCsv('"unclosed')).toThrow('Unclosed')
    expect(() => parseLibraryCsv('title,title,source,media_type,external_id\nA,A,tmdb,movie,1')).toThrow('unique')
  })
  it('supports minimal columns so merges can preserve omitted personal fields', () => {
    const result = parseLibraryCsv('title,source,media_type,external_id\r\nA,tmdb,movie,42\r\n')
    expect(result.fields).not.toContain('rating')
    expect(result.rows[0].error).toBeNull()
  })
})
