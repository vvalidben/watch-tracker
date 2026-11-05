import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readAppConfig, writeAppConfig } from '../config/appConfig'
import type { OpenedDatabase } from '../db/client'
import type { Repositories } from '../db/repositories'
import { createTestContext } from '../db/testUtils'
import type { AnimeTitleNames } from '../metadata/anilistProvider'
import { backfillAnimeTitles, runAnimeTitleBackfillOnce } from './backfillOriginalTitles'

let ctx: OpenedDatabase & { repositories: Repositories }
let configDir: string
let configPath: string

beforeEach(async () => {
  ctx = await createTestContext()
  configDir = mkdtempSync(join(tmpdir(), 'watch-tracker-backfill-'))
  configPath = join(configDir, 'app-config.json')
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  ctx.close()
  rmSync(configDir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

function addAnime(sourceId: string, originalTitle: string | null, romajiTitle: string | null = null) {
  return ctx.repositories.mediaItems.create({ type: 'anime', title: `Anime ${sourceId}`, originalTitle, romajiTitle, source: 'anilist', sourceId })
}

function titleNames(entries: Record<string, AnimeTitleNames>) {
  return vi.fn(async () => new Map(Object.entries(entries)))
}

describe('backfillAnimeTitles', () => {
  it('saves the Japanese and romaji titles and changes no other details', async () => {
    const before = await ctx.repositories.mediaItems.create({
      type: 'anime',
      title: 'Frieren',
      originalTitle: 'Sousou no Frieren',
      overview: 'An elf mage.',
      posterPath: 'https://cdn.test/frieren.jpg',
      numberOfEpisodes: 28,
      genres: ['Adventure'],
      source: 'anilist',
      sourceId: '154587'
    })

    const result = await backfillAnimeTitles(
      ctx.repositories,
      titleNames({ '154587': { native: '葬送のフリーレン', romaji: 'Sousou no Frieren' } }),
      { batchDelayMs: 0 }
    )

    const after = await ctx.repositories.mediaItems.getById(before.id)
    expect(after).toEqual({ ...before, originalTitle: '葬送のフリーレン', romajiTitle: 'Sousou no Frieren', updatedAt: after?.updatedAt })
    expect(result).toEqual({ checked: 1, updated: 1 })
  })

  it('fills in an original title that was never saved', async () => {
    const item = await addAnime('2', null)

    await backfillAnimeTitles(ctx.repositories, titleNames({ '2': { native: '蟲師', romaji: 'Mushishi' } }), { batchDelayMs: 0 })

    expect((await ctx.repositories.mediaItems.getById(item.id))?.originalTitle).toBe('蟲師')
  })

  it('adds the romaji title to a row that already has its Japanese title', async () => {
    const item = await addAnime('2', '蟲師')

    await backfillAnimeTitles(ctx.repositories, titleNames({ '2': { native: '蟲師', romaji: 'Mushishi' } }), { batchDelayMs: 0 })

    const after = await ctx.repositories.mediaItems.getById(item.id)
    expect(after?.originalTitle).toBe('蟲師')
    expect(after?.romajiTitle).toBe('Mushishi')
  })

  it('only looks up AniList rows missing a Japanese or romaji title', async () => {
    await addAnime('1', 'Romaji Name')
    await addAnime('2', '蟲師')
    await addAnime('3', '蟲師', 'Mushishi')
    await addAnime('4', 'Latin Native', 'Latin Native')
    await ctx.repositories.mediaItems.create({ type: 'tv', title: 'Severance', source: 'tmdb', sourceId: '5' })
    await ctx.repositories.mediaItems.create({ type: 'anime', title: 'Tracked by TMDB', source: 'tmdb', sourceId: '6' })
    await ctx.repositories.mediaItems.create({ type: 'anime', title: 'Typed by hand', source: 'manual', sourceId: null })
    const fetchTitles = titleNames({})

    await backfillAnimeTitles(ctx.repositories, fetchTitles, { batchDelayMs: 0 })

    const asked = (fetchTitles.mock.calls as unknown as [string[]][]).flatMap(([ids]) => ids)
    expect(asked.sort()).toEqual(['1', '2', '4'])
  })

  it.each([
    ['AniList has a Latin native title', { '1': { native: 'ONE PIECE', romaji: null } }],
    ['AniList has no names for it', {}]
  ])('keeps the saved value and reports no change when %s', async (_name, entries) => {
    const item = await addAnime('1', 'Romaji Name')

    const result = await backfillAnimeTitles(ctx.repositories, titleNames(entries), { batchDelayMs: 0 })

    expect((await ctx.repositories.mediaItems.getById(item.id))?.originalTitle).toBe('Romaji Name')
    expect(result).toEqual({ checked: 1, updated: 0 })
  })

  it('asks for at most 50 titles per request', async () => {
    for (let id = 1; id <= 51; id++) await addAnime(String(id), 'Romaji Name')
    const fetchTitles = titleNames({})

    const result = await backfillAnimeTitles(ctx.repositories, fetchTitles, { batchDelayMs: 0 })

    const sizes = (fetchTitles.mock.calls as unknown as [string[]][]).map(([ids]) => ids.length)
    expect(sizes).toEqual([50, 1])
    expect(result.checked).toBe(51)
  })

  it('makes no request when nothing needs a lookup', async () => {
    await addAnime('1', '蟲師', 'Mushishi')
    const fetchTitles = titleNames({})

    await backfillAnimeTitles(ctx.repositories, fetchTitles, { batchDelayMs: 0 })

    expect(fetchTitles).not.toHaveBeenCalled()
  })
})

describe('runAnimeTitleBackfillOnce', () => {
  it('does the work on the first launch and makes no requests on the next', async () => {
    const item = await addAnime('1', 'Romaji Name')
    const first = titleNames({ '1': { native: 'ローマ字', romaji: 'Romaji Name' } })
    await runAnimeTitleBackfillOnce({ repositories: ctx.repositories, configPath, fetchTitles: first, batchDelayMs: 0 })

    await addAnime('2', 'Another Romaji Name')
    const second = titleNames({ '2': { native: '別の名前', romaji: 'Another Romaji Name' } })
    await runAnimeTitleBackfillOnce({ repositories: ctx.repositories, configPath, fetchTitles: second, batchDelayMs: 0 })

    expect((await ctx.repositories.mediaItems.getById(item.id))?.originalTitle).toBe('ローマ字')
    expect(second).not.toHaveBeenCalled()
  })

  it('still runs when only the earlier Japanese-title pass was marked as done', async () => {
    const item = await addAnime('1', '蟲師')
    writeFileSync(configPath, JSON.stringify({ tmdbApiKey: null, defaultBackupDirectory: null, animeTitlesBackfilled: true }))

    await runAnimeTitleBackfillOnce({
      repositories: ctx.repositories,
      configPath,
      fetchTitles: titleNames({ '1': { native: '蟲師', romaji: 'Mushishi' } }),
      batchDelayMs: 0
    })

    expect((await ctx.repositories.mediaItems.getById(item.id))?.romajiTitle).toBe('Mushishi')
  })

  it('tries again on the next launch after a failure, keeping what it already saved', async () => {
    for (let id = 1; id <= 51; id++) await addAnime(String(id), 'Romaji Name')
    const first = await ctx.repositories.mediaItems.findBySource('anilist', '1')
    const failsOnSecondBatch = vi
      .fn<(ids: string[]) => Promise<Map<string, AnimeTitleNames>>>()
      .mockImplementationOnce(async (ids) => new Map(ids.map((id) => [id, { native: `題名${id}`, romaji: `Name ${id}` }])))
      .mockRejectedValueOnce(new Error('Could not reach the network'))

    await expect(
      runAnimeTitleBackfillOnce({ repositories: ctx.repositories, configPath, fetchTitles: failsOnSecondBatch, batchDelayMs: 0 })
    ).resolves.toBeUndefined()

    expect((await ctx.repositories.mediaItems.getById(first!.id))?.originalTitle).toMatch(/^題名/)
    const retry = titleNames({})
    await runAnimeTitleBackfillOnce({ repositories: ctx.repositories, configPath, fetchTitles: retry, batchDelayMs: 0 })
    expect((retry.mock.calls as unknown as [string[]][]).flatMap(([ids]) => ids)).toHaveLength(1)
  })

  it('keeps settings saved in another part of the app while the lookup was running', async () => {
    await addAnime('1', 'Romaji Name')
    const savesKeyMidway = vi.fn(async () => {
      writeAppConfig(configPath, { tmdbApiKey: 'saved-during-lookup', defaultBackupDirectory: null })
      return new Map<string, AnimeTitleNames>()
    })

    await runAnimeTitleBackfillOnce({ repositories: ctx.repositories, configPath, fetchTitles: savesKeyMidway, batchDelayMs: 0 })

    expect(readAppConfig(configPath)).toEqual({ tmdbApiKey: 'saved-during-lookup', defaultBackupDirectory: null, animeTitleBackfillDone: true })
  })
})
