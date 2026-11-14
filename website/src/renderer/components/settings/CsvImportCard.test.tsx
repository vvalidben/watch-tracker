import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CsvImportCard } from './CsvImportCard'

const preview = { token: 'server-preview', fileName: 'library.csv', rows: [{ line: 2, title: 'Film', source: 'tmdb', mediaType: 'movie', externalId: '42',
  watchStatus: 'completed', rating: 8, favorite: true, notes: null, watchedAt: null, duplicate: true, error: null }] }
const apply = vi.fn()
beforeEach(() => {
  apply.mockReset().mockResolvedValue({ ok: true, data: { imported: 0, merged: 1, skipped: 0, errors: [] } })
  Object.assign(window, { api: { previewCsvImport: vi.fn().mockResolvedValue({ ok: true, data: preview }), applyCsvImport: apply } })
})
describe('CSV import preview', () => {
  it('waits for explicit import and submits the server token and chosen duplicate mode', async () => {
    const onImported = vi.fn()
    render(<CsvImportCard onImported={onImported} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose CSV & preview' }))
    await screen.findByText('Film')
    expect(apply).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'merge' } })
    fireEvent.click(screen.getByRole('button', { name: 'Import valid rows' }))
    await waitFor(() => expect(apply).toHaveBeenCalledWith({ token: 'server-preview', mode: 'merge' }))
    expect(await screen.findByRole('status')).toHaveTextContent('1 merged')
    expect(onImported).toHaveBeenCalledTimes(1)
  })
  it('cancels a preview without changing the library', async () => {
    render(<CsvImportCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose CSV & preview' }))
    await screen.findByText('Film')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Film')).not.toBeInTheDocument()
    expect(apply).not.toHaveBeenCalled()
  })
})
