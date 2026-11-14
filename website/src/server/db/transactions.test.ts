import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestDatabase } from './testUtils'
import { createRepositories } from './repositories'

let opened: Awaited<ReturnType<typeof createTestDatabase>>
beforeEach(async () => { opened = await createTestDatabase() })
afterEach(() => { opened.close() })
describe('serialized repository transactions', () => {
  it('flushes a multi-row import once', async () => {
    const persist = vi.fn()
    const repos = createRepositories({ db: opened.db, persist })
    await repos.transaction(async () => {
      for (let index = 0; index < 100; index++) {
        const media = await repos.mediaItems.create({ source: 'tmdb', sourceId: String(index), type: 'movie', title: `Film ${index}` })
        await repos.libraryEntries.add({ mediaItemId: media.id })
      }
    })
    expect(persist).toHaveBeenCalledTimes(1)
    expect(await repos.libraryEntries.list()).toHaveLength(100)
  })
  it('rolls back a failed transaction without capturing another request in its rollback', async () => {
    const persist = vi.fn()
    const repos = createRepositories({ db: opened.db, persist })
    let release!: () => void, entered!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const ready = new Promise<void>((resolve) => { entered = resolve })
    const failure = repos.transaction(async () => {
      await repos.mediaItems.create({ source: 'manual', type: 'movie', title: 'Rollback' })
      entered(); await gate; throw new Error('import failed')
    })
    await ready
    const otherRequest = repos.mediaItems.create({ source: 'manual', type: 'movie', title: 'Keep' })
    release()
    await expect(failure).rejects.toThrow('import failed')
    await otherRequest
    expect((await repos.mediaItems.list()).map((media) => media.title)).toEqual(['Keep'])
    expect(persist).toHaveBeenCalledTimes(1)
  })
})
