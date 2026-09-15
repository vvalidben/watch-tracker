import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { Search } from './Search'
import { useBackNavigation } from '@renderer/hooks/useBackNavigation'
import { clearSearchResultsCache } from '@renderer/lib/searchResultsCache'
import type { NormalizedMedia, SearchMediaResponse } from '@shared/metadata'

/** A minimal stand-in for the real Details page — it only needs to exercise
 * the same back-navigation mechanism MediaDetail.tsx actually uses. */
function DetailsStub(): JSX.Element {
  const goBack = useBackNavigation('/search')
  return (
    <button type="button" onClick={goBack}>
      Back
    </button>
  )
}

/** Triggers `navigate(-1)` directly — the same call a real browser/mouse
 * back button makes — bypassing our own Back button entirely, to prove the
 * fix is genuine history/URL state rather than something only our button
 * knows how to do. */
function RawHistoryBackStub(): JSX.Element {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Browser Back
    </button>
  )
}

function media(overrides: Partial<NormalizedMedia>): NormalizedMedia {
  return {
    externalId: '1',
    source: 'tmdb',
    mediaType: 'movie',
    title: 'Untitled',
    originalTitle: null,
    poster: null,
    backdrop: null,
    description: null,
    releaseDate: null,
    status: null,
    genres: [],
    rating: null,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    ...overrides
  }
}

function mockSearchResponse(results: NormalizedMedia[]): SearchMediaResponse {
  return { results, errors: [] }
}

function renderApp(detailsElement: JSX.Element = <DetailsStub />) {
  return render(
    <MemoryRouter initialEntries={['/search']}>
      <Routes>
        <Route path="/search" element={<Search />} />
        <Route path="/media/:source/:mediaType/:externalId" element={detailsElement} />
      </Routes>
    </MemoryRouter>
  )
}

async function typeQuery(value: string) {
  const input = screen.getByPlaceholderText('Search movies, TV series, or anime…')
  fireEvent.change(input, { target: { value } })
}

describe('Search page: state preservation across Details → Back', () => {
  let searchMedia: ReturnType<typeof vi.fn>

  beforeEach(() => {
    clearSearchResultsCache()
    searchMedia = vi.fn()
    ;(window as unknown as { api: { searchMedia: typeof searchMedia } }).api = { searchMedia }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Test 1: query + type filter + results survive Details → Back', async () => {
    searchMedia.mockResolvedValue(mockSearchResponse([media({ externalId: '1', title: 'Attack on Titan', mediaType: 'tv' })]))
    renderApp()

    await typeQuery('attack')
    fireEvent.click(screen.getByRole('button', { name: 'TV Series' }))

    await waitFor(() => expect(screen.getByText('Attack on Titan')).toBeInTheDocument())
    expect(searchMedia).toHaveBeenCalledTimes(1)
    expect(searchMedia).toHaveBeenCalledWith({ query: 'attack', types: ['tv'] })

    fireEvent.click(screen.getByText('Attack on Titan'))
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    // Same query, same filter, same results — restored instantly. If the
    // "tv" filter hadn't survived, restoring would look up a different
    // cache key (or none), forcing a second, differently-filtered request —
    // so "still called exactly once" is direct proof the filter persisted.
    expect(screen.getByPlaceholderText('Search movies, TV series, or anime…')).toHaveValue('attack')
    expect(screen.getByText('Attack on Titan')).toBeInTheDocument()
    expect(searchMedia).toHaveBeenCalledTimes(1)
  })

  it('Test 2: a plain query with no filter survives Details → Back', async () => {
    searchMedia.mockResolvedValue(mockSearchResponse([media({ externalId: '2', title: 'Breaking Bad', mediaType: 'tv' })]))
    renderApp()

    await typeQuery('breaking bad')
    await waitFor(() => expect(screen.getByText('Breaking Bad')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Breaking Bad'))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByPlaceholderText('Search movies, TV series, or anime…')).toHaveValue('breaking bad')
    expect(screen.getByText('Breaking Bad')).toBeInTheDocument()
    expect(searchMedia).toHaveBeenCalledTimes(1)
  })

  it('Test 3: query + Movies filter survive Details → Back', async () => {
    searchMedia.mockResolvedValue(mockSearchResponse([media({ externalId: '3', title: 'Inception', mediaType: 'movie' })]))
    renderApp()

    await typeQuery('inception')
    fireEvent.click(screen.getByRole('button', { name: 'Movies' }))
    await waitFor(() => expect(screen.getByText('Inception')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Inception'))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByPlaceholderText('Search movies, TV series, or anime…')).toHaveValue('inception')
    expect(searchMedia).toHaveBeenCalledTimes(1)
  })

  it('Test 5: a raw browser/history back (not our Back button) also restores the previous search', async () => {
    searchMedia.mockResolvedValue(mockSearchResponse([media({ externalId: '4', title: 'The Matrix', mediaType: 'movie' })]))
    renderApp(<RawHistoryBackStub />)

    await typeQuery('matrix')
    await waitFor(() => expect(screen.getByText('The Matrix')).toBeInTheDocument())

    fireEvent.click(screen.getByText('The Matrix'))
    fireEvent.click(screen.getByRole('button', { name: 'Browser Back' }))

    expect(screen.getByPlaceholderText('Search movies, TV series, or anime…')).toHaveValue('matrix')
    expect(screen.getByText('The Matrix')).toBeInTheDocument()
    expect(searchMedia).toHaveBeenCalledTimes(1)
  })

  it('Test 6: repeated Details → Back round-trips do not corrupt or duplicate state', async () => {
    searchMedia.mockResolvedValue(mockSearchResponse([media({ externalId: '1', title: 'Attack on Titan', mediaType: 'tv' })]))
    renderApp()

    await typeQuery('attack')
    await waitFor(() => expect(screen.getByText('Attack on Titan')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Attack on Titan'))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByPlaceholderText('Search movies, TV series, or anime…')).toHaveValue('attack')

    fireEvent.click(screen.getByText('Attack on Titan'))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByPlaceholderText('Search movies, TV series, or anime…')).toHaveValue('attack')
    expect(screen.getByText('Attack on Titan')).toBeInTheDocument()

    // Every visit reused the one cached search — never re-fetched.
    expect(searchMedia).toHaveBeenCalledTimes(1)
  })
})
