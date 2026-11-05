import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT_VERSION, migrateV1ToV2, parseBackupFile, type BackupFileV1, type LatestBackupFile } from './backup'

function makeMediaItem(overrides: Partial<LatestBackupFile['data']['mediaItems'][number]> = {}) {
  return {
    id: 1,
    type: 'movie' as const,
    title: 'A Movie',
    originalTitle: null,
    overview: null,
    posterPath: null,
    backdropPath: null,
    releaseDate: null,
    airingStatus: null,
    runtimeMinutes: null,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    genres: null,
    source: 'manual' as const,
    sourceId: null,
    externalIds: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('romajiTitle on a media item', () => {
  it('is optional, so backups taken before it existed still load', () => {
    expect(parseBackupFile(makeValidV2File()).ok).toBe(true)
    expect(parseBackupFile(makeValidV2File({ mediaItems: [makeMediaItem({ romajiTitle: 'Sousou no Frieren' })] })).ok).toBe(true)
  })

  it('rejects a value that is not text', () => {
    const file = makeValidV2File({ mediaItems: [makeMediaItem({ romajiTitle: 7 as unknown as string })] })
    expect(parseBackupFile(file)).toMatchObject({ ok: false, error: expect.stringMatching(/romajiTitle/) })
  })
})

function makeValidV2File(overrides: Partial<LatestBackupFile['data']> = {}): LatestBackupFile {
  return {
    formatVersion: 2,
    exportedAt: '2026-01-01T00:00:00.000Z',
    appVersion: '0.1.0',
    data: {
      mediaItems: [makeMediaItem()],
      seasons: [],
      episodes: [],
      libraryEntries: [
        {
          id: 1,
          mediaItemId: 1,
          watchStatus: 'completed',
          rating: 9,
          favorite: true,
          notes: 'Great movie.',
          rewatchCount: 0,
          addedAt: '2026-01-01T00:00:00.000Z',
          startedAt: null,
          completedAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z'
        }
      ],
      episodeProgress: [],
      seasonRatings: [],
      watchEvents: [{ id: 1, mediaItemId: 1, episodeId: null, watchedAt: '2026-01-02T00:00:00.000Z' }],
      tags: [{ id: 1, name: 'Cozy', color: null, createdAt: '2026-01-01T00:00:00.000Z' }],
      mediaTags: [{ mediaItemId: 1, tagId: 1 }],
      settings: {},
      ...overrides
    }
  }
}

describe('parseBackupFile — valid input', () => {
  it('accepts a well-formed current-version backup and returns it unchanged', () => {
    const file = makeValidV2File()

    const result = parseBackupFile(file)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.backup).toEqual(file)
    }
  })

  it('accepts an empty library backup', () => {
    const file = makeValidV2File({
      mediaItems: [],
      libraryEntries: [],
      watchEvents: [],
      tags: [],
      mediaTags: []
    })

    const result = parseBackupFile(file)

    expect(result.ok).toBe(true)
  })
})

describe('parseBackupFile — invalid/corrupted input', () => {
  it('rejects null', () => {
    const result = parseBackupFile(null)
    expect(result.ok).toBe(false)
  })

  it('rejects a plain array', () => {
    const result = parseBackupFile([1, 2, 3])
    expect(result.ok).toBe(false)
  })

  it('rejects a string (e.g. a non-JSON file that parsed to a primitive)', () => {
    const result = parseBackupFile('not a backup')
    expect(result.ok).toBe(false)
  })

  it('rejects a missing formatVersion', () => {
    const file = makeValidV2File() as unknown as Record<string, unknown>
    delete (file as { formatVersion?: unknown }).formatVersion

    const result = parseBackupFile(file)
    expect(result.ok).toBe(false)
  })

  it('rejects a non-integer formatVersion', () => {
    const result = parseBackupFile({ ...makeValidV2File(), formatVersion: 1.5 })
    expect(result.ok).toBe(false)
  })

  it('rejects a formatVersion from a newer, unrecognized app version', () => {
    const result = parseBackupFile({ ...makeValidV2File(), formatVersion: BACKUP_FORMAT_VERSION + 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/newer version/i)
  })

  it('rejects a missing exportedAt', () => {
    const file = makeValidV2File() as unknown as Record<string, unknown>
    delete (file as { exportedAt?: unknown }).exportedAt

    expect(parseBackupFile(file).ok).toBe(false)
  })

  it('rejects a missing data section', () => {
    const result = parseBackupFile({ formatVersion: 2, exportedAt: '2026-01-01T00:00:00.000Z' })
    expect(result.ok).toBe(false)
  })

  it('rejects a table that is not an array', () => {
    const file = makeValidV2File()
    const result = parseBackupFile({ ...file, data: { ...file.data, mediaItems: 'oops' } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/mediaItems/)
  })

  it('rejects a row missing a required field', () => {
    const file = makeValidV2File()
    const brokenMediaItem = { ...file.data.mediaItems[0] } as Record<string, unknown>
    delete brokenMediaItem.title

    const result = parseBackupFile({ ...file, data: { ...file.data, mediaItems: [brokenMediaItem] } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/mediaItems\[0\]/)
  })

  it('rejects a row with an invalid enum value', () => {
    const file = makeValidV2File()
    const badItem = { ...file.data.mediaItems[0], type: 'podcast' }

    const result = parseBackupFile({ ...file, data: { ...file.data, mediaItems: [badItem] } })
    expect(result.ok).toBe(false)
  })

  it('rejects duplicate ids within the same table', () => {
    const file = makeValidV2File()
    const duplicated = [file.data.mediaItems[0], { ...file.data.mediaItems[0] }]

    const result = parseBackupFile({ ...file, data: { ...file.data, mediaItems: duplicated } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/duplicate id/i)
  })

  it('rejects a dangling foreign-key reference (season pointing at a media item that does not exist)', () => {
    const file = makeValidV2File()
    const orphanSeason = { id: 1, mediaItemId: 999, seasonNumber: 1, title: null, overview: null, posterPath: null, airDate: null }

    const result = parseBackupFile({ ...file, data: { ...file.data, seasons: [orphanSeason] } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/references mediaItems id 999/)
  })

  it('rejects a dangling tag reference in mediaTags', () => {
    const file = makeValidV2File()

    const result = parseBackupFile({
      ...file,
      data: { ...file.data, mediaTags: [{ mediaItemId: 1, tagId: 999 }] }
    })

    expect(result.ok).toBe(false)
  })

  it('rejects settings that is not an object', () => {
    const file = makeValidV2File()

    const result = parseBackupFile({ ...file, data: { ...file.data, settings: 'nope' } })

    expect(result.ok).toBe(false)
  })
})

describe('migrateV1ToV2', () => {
  const v1: BackupFileV1 = {
    formatVersion: 1,
    exportedAt: '2025-06-01T00:00:00.000Z',
    appVersion: '0.0.1',
    data: {
      mediaItems: [makeMediaItem()],
      seasons: [],
      episodes: [],
      libraryEntries: [
        {
          id: 1,
          mediaItemId: 1,
          watchStatus: 'completed',
          rating: 8,
          favorite: false,
          notes: null,
          rewatchCount: 0,
          addedAt: '2025-06-01T00:00:00.000Z',
          startedAt: null,
          completedAt: '2025-06-01T00:00:00.000Z',
          updatedAt: '2025-06-01T00:00:00.000Z'
        }
      ],
      episodeProgress: []
    }
  }

  it('preserves every V1 field unchanged', () => {
    const v2 = migrateV1ToV2(v1)

    expect(v2.data.mediaItems).toEqual(v1.data.mediaItems)
    expect(v2.data.libraryEntries).toEqual(v1.data.libraryEntries)
    expect(v2.exportedAt).toBe(v1.exportedAt)
    expect(v2.appVersion).toBe(v1.appVersion)
  })

  it('defaults every table introduced in V2 to empty', () => {
    const v2 = migrateV1ToV2(v1)

    expect(v2.formatVersion).toBe(2)
    expect(v2.data.seasonRatings).toEqual([])
    expect(v2.data.watchEvents).toEqual([])
    expect(v2.data.tags).toEqual([])
    expect(v2.data.mediaTags).toEqual([])
    expect(v2.data.settings).toEqual({})
  })
})

describe('parseBackupFile — version migration end to end', () => {
  it('reads a real V1 file all the way through to a valid, current-format result', () => {
    const v1: BackupFileV1 = {
      formatVersion: 1,
      exportedAt: '2025-06-01T00:00:00.000Z',
      appVersion: '0.0.1',
      data: {
        mediaItems: [makeMediaItem({ id: 5, title: 'Old Backup Movie' })],
        seasons: [],
        episodes: [],
        libraryEntries: [
          {
            id: 1,
            mediaItemId: 5,
            watchStatus: 'watching',
            rating: null,
            favorite: false,
            notes: null,
            rewatchCount: 0,
            addedAt: '2025-06-01T00:00:00.000Z',
            startedAt: '2025-06-01T00:00:00.000Z',
            completedAt: null,
            updatedAt: '2025-06-01T00:00:00.000Z'
          }
        ],
        episodeProgress: []
      }
    }

    const result = parseBackupFile(v1)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.backup.formatVersion).toBe(2)
      expect(result.backup.data.mediaItems[0].title).toBe('Old Backup Movie')
      expect(result.backup.data.tags).toEqual([])
      expect(result.backup.data.watchEvents).toEqual([])
      expect(result.backup.data.settings).toEqual({})
    }
  })

  it('rejects a V1 file whose core data is itself invalid', () => {
    const brokenV1 = {
      formatVersion: 1,
      exportedAt: '2025-06-01T00:00:00.000Z',
      appVersion: '0.0.1',
      data: {
        mediaItems: [{ id: 'not-a-number' }],
        seasons: [],
        episodes: [],
        libraryEntries: [],
        episodeProgress: []
      }
    }

    const result = parseBackupFile(brokenV1)

    expect(result.ok).toBe(false)
  })
})
