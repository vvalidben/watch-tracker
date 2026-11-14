import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Settings } from './Settings'
vi.mock('@renderer/auth/AuthContext', () => ({ useAuth: () => ({ state: { username: 'Tester', authenticated: true, configured: true }, pending: false, error: null }) }))

describe('Settings after CSV import', () => {
  it('refreshes the library count and the new safety snapshot without navigation', async () => {
    const databaseInfo = (count: number) => ({ filePath: 'test.db', fileSizeBytes: 1024, mediaItemCount: count, libraryEntryCount: count })
    Object.assign(window, { api: {
      getAppVersion: vi.fn().mockResolvedValue('0.1.0'),
      getAppConfig: vi.fn().mockResolvedValue({ tmdbApiKey: null, tmdbConfiguredViaEnv: false, defaultBackupDirectory: null }),
      getDatabaseInfo: vi.fn().mockResolvedValueOnce(databaseInfo(2)).mockResolvedValue(databaseInfo(3)),
      listAutomaticBackups: vi.fn().mockResolvedValueOnce({ ok: true, data: { directory: 'backups', backups: [] } })
        .mockResolvedValue({ ok: true, data: { directory: 'backups', backups: [{ name: 'watch-tracker-import-1-test.db', createdAt: '2026-01-01T12:00:00Z', sizeBytes: 1024 }] } }),
      previewCsvImport: vi.fn().mockResolvedValue({ ok: true, data: { token: 'test', fileName: 'test.csv', rows: [
        { line: 2, title: 'Film', source: 'tmdb', mediaType: 'movie', externalId: '42', watchStatus: 'plan_to_watch', rating: null, notes: null, favorite: false, watchedAt: null, duplicate: false, error: null }
      ] } }),
      applyCsvImport: vi.fn().mockResolvedValue({ ok: true, data: { imported: 1, merged: 0, skipped: 0, errors: [] } })
    } })
    render(<Settings />)
    expect(await screen.findByText('2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Choose CSV & preview' }))
    await screen.findByText('Film')
    fireEvent.click(screen.getByRole('button', { name: 'Import valid rows' }))
    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Automatic backup' })).toBeInTheDocument()
  })
})
