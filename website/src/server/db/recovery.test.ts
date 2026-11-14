import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabaseWithRecovery } from './recovery'
import { createRepositories } from './repositories'

const migrationsFolder = join(__dirname, '..', '..', '..', 'drizzle', 'migrations')

let workDir: string
let dbPath: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'watch-tracker-recovery-test-'))
  dbPath = join(workDir, 'watch-tracker.db')
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe('openDatabaseWithRecovery', () => {
  it('does not replace a healthy library when migration setup is missing', async () => {
    const original = await openDatabaseWithRecovery({ filePath: dbPath, migrationsFolder })
    await createRepositories(original.opened).mediaItems.create({ type: 'movie', title: 'Keep me', source: 'manual' })
    original.opened.close()
    const contents = readFileSync(dbPath)
    await expect(openDatabaseWithRecovery({ filePath: dbPath, migrationsFolder: join(workDir, 'missing-migrations') })).rejects.toThrow()
    expect(readFileSync(dbPath)).toEqual(contents)
    expect(readdirSync(workDir).some((name) => name.includes('.corrupted-'))).toBe(false)
  })
  it('opens normally with no recovery when there is nothing to recover from', async () => {
    const result = await openDatabaseWithRecovery({ filePath: dbPath, migrationsFolder })

    expect(result.recoveredFrom).toBeNull()
    const repositories = createRepositories({ db: result.opened.db, persist: result.opened.persist })
    expect(await repositories.mediaItems.list()).toEqual([])
    result.opened.close()
  })

  it('recovers from a corrupted database file by moving it aside and starting fresh', async () => {
    writeFileSync(dbPath, 'this is not a valid sqlite file, just garbage bytes')

    const result = await openDatabaseWithRecovery({ filePath: dbPath, migrationsFolder })

    expect(result.recoveredFrom).not.toBeNull()
    // The corrupted file was moved, not deleted — its content is preserved for manual recovery.
    expect(existsSync(result.recoveredFrom!)).toBe(true)
    expect(readFileSync(result.recoveredFrom!, 'utf-8')).toBe('this is not a valid sqlite file, just garbage bytes')

    // A fresh, working database now exists at the original path.
    expect(existsSync(dbPath)).toBe(true)
    const repositories = createRepositories({ db: result.opened.db, persist: result.opened.persist })
    expect(await repositories.mediaItems.list()).toEqual([])
    result.opened.close()
  })

  it('creates any missing parent directories for a fresh database, same as opening normally', async () => {
    const nestedPath = join(workDir, 'nested', 'watch-tracker.db')

    const result = await openDatabaseWithRecovery({ filePath: nestedPath, migrationsFolder })

    expect(result.recoveredFrom).toBeNull()
    expect(existsSync(nestedPath)).toBe(true)
    result.opened.close()
  })
})
