import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Upcoming } from './Upcoming'

const refreshMetadata = vi.fn()
beforeEach(() => {
  refreshMetadata.mockReset()
  Object.assign(window, { api: {
    getUpcomingEpisodes: vi.fn().mockResolvedValue({ ok: true, data: [
      { source: 'tmdb', mediaType: 'tv', externalId: '42', title: 'Future show', seasonNumber: 1, episodeNumber: 3, episodeTitle: 'Next', airDate: '2027-01-01', available: false },
      { source: 'tmdb', mediaType: 'tv', externalId: '43', title: 'Aired show', seasonNumber: 2, episodeNumber: 1, episodeTitle: 'Return', airDate: '2025-01-01', available: true }
    ] }), refreshMetadata
  } })
})
describe('episode schedule', () => {
  it('loads saved dates without refreshing providers and switches between upcoming and aired episodes', async () => {
    render(<MemoryRouter><Upcoming /></MemoryRouter>)
    expect(await screen.findByText('Future show')).toBeInTheDocument()
    expect(screen.queryByText('Aired show')).not.toBeInTheDocument()
    expect(refreshMetadata).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Available to watch' }))
    expect(screen.getByText('Aired show')).toBeInTheDocument()
    expect(screen.queryByText('Future show')).not.toBeInTheDocument()
  })
})
