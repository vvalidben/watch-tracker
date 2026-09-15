import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readAppConfig, writeAppConfig } from './appConfig'

let dir: string
let filePath: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'watch-tracker-config-test-'))
  filePath = join(dir, 'app-config.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('readAppConfig', () => {
  it('returns defaults when the file does not exist yet', () => {
    expect(readAppConfig(filePath)).toEqual({ tmdbApiKey: null, defaultBackupDirectory: null })
  })

  it('returns defaults for a corrupted (non-JSON) file rather than throwing', () => {
    writeFileSync(filePath, '{ not valid json', 'utf-8')
    expect(readAppConfig(filePath)).toEqual({ tmdbApiKey: null, defaultBackupDirectory: null })
  })

  it('returns defaults for valid JSON that is not an object', () => {
    writeFileSync(filePath, '[1, 2, 3]', 'utf-8')
    expect(readAppConfig(filePath)).toEqual({ tmdbApiKey: null, defaultBackupDirectory: null })
  })

  it('treats a blank tmdbApiKey as unset', () => {
    writeFileSync(filePath, JSON.stringify({ tmdbApiKey: '   ' }), 'utf-8')
    expect(readAppConfig(filePath).tmdbApiKey).toBeNull()
  })

  it('round-trips a real config written by writeAppConfig', () => {
    writeAppConfig(filePath, { tmdbApiKey: 'abc123', defaultBackupDirectory: '/backups' })
    expect(readAppConfig(filePath)).toEqual({ tmdbApiKey: 'abc123', defaultBackupDirectory: '/backups' })
  })

  it('creates the parent directory if missing', () => {
    const nestedPath = join(dir, 'nested', 'app-config.json')
    writeAppConfig(nestedPath, { tmdbApiKey: null, defaultBackupDirectory: null })
    expect(readAppConfig(nestedPath)).toEqual({ tmdbApiKey: null, defaultBackupDirectory: null })
  })
})
