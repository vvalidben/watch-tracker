import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ViewingActions } from './ViewingActions'
import { WatchDateEditor } from './WatchDateEditor'
import type { NormalizedMedia } from '@shared/metadata'

const media: NormalizedMedia = { externalId: '42', source: 'tmdb', mediaType: 'movie', title: 'Film', originalTitle: null,
  poster: null, backdrop: null, description: null, releaseDate: null, status: 'finished', genres: [], rating: null, numberOfSeasons: null, numberOfEpisodes: null }
const logWatch = vi.fn(), editWatchDate = vi.fn()
beforeEach(() => {
  logWatch.mockReset().mockResolvedValue({ ok: true, data: null })
  editWatchDate.mockReset().mockResolvedValue({ ok: true, data: null })
  Object.assign(window, { api: { logWatch, editWatchDate } })
})
describe('historical watch controls', () => {
  it('logs a backdated watch with explicit media type and refreshes the parent', async () => {
    const changed = vi.fn()
    render(<ViewingActions media={media} onChange={changed} />)
    fireEvent.click(screen.getByText('Log a watch or start a rewatch'))
    fireEvent.change(screen.getByLabelText('Watched on'), { target: { value: '2025-01-01T20:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log watch' }))
    await waitFor(() => expect(logWatch).toHaveBeenCalledWith({ source: 'tmdb', mediaType: 'movie', externalId: '42', watchedAt: new Date('2025-01-01T20:00').toISOString() }))
    expect(changed).toHaveBeenCalledTimes(1)
  })
  it('submits a date correction by event ID', async () => {
    render(<WatchDateEditor eventId={7} watchedAt="2025-01-01T20:00:00Z" />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit watch date' }))
    fireEvent.change(screen.getByLabelText('Watch date'), { target: { value: '2025-01-03T20:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save date' }))
    await waitFor(() => expect(editWatchDate).toHaveBeenCalledWith({ eventId: 7, watchedAt: new Date('2025-01-03T20:00').toISOString() }))
  })
})
