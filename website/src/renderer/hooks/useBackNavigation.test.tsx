import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useBackNavigation } from './useBackNavigation'

function DetailsPage({ fallback }: { fallback: string }): JSX.Element {
  const goBack = useBackNavigation(fallback)
  return (
    <button type="button" onClick={goBack}>
      Back
    </button>
  )
}

function CurrentPath(): JSX.Element {
  const location = useLocation()
  return <div data-testid="current-path">{location.pathname}</div>
}

function renderAt(entries: string[], initialIndex: number, fallback = '/search') {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
      <CurrentPath />
      <Routes>
        <Route path="/a" element={<div>Page A</div>} />
        <Route path="/search" element={<div>Search Page</div>} />
        <Route path="/media/:id" element={<DetailsPage fallback={fallback} />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('useBackNavigation', () => {
  it('navigates back to the actual previous entry when one exists', async () => {
    const user = userEvent.setup()
    renderAt(['/search', '/media/1'], 1)

    expect(screen.getByTestId('current-path')).toHaveTextContent('/media/1')
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByTestId('current-path')).toHaveTextContent('/search')
  })

  it('falls back to the given path when there is no previous entry (e.g. a direct/reload navigation)', async () => {
    const user = userEvent.setup()
    // A single-entry history means this location has react-router's
    // 'default' key, the same as a fresh page load with nothing to go back to.
    renderAt(['/media/1'], 0, '/search')

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByTestId('current-path')).toHaveTextContent('/search')
  })

  it('does not pop an extra history entry when triggered twice in quick succession', async () => {
    renderAt(['/a', '/search', '/media/1'], 2)

    const backButton = screen.getByRole('button', { name: 'Back' })
    // Simulate a fast double-click: both events fire before React unmounts
    // this component in response to the first one.
    fireEvent.click(backButton)
    fireEvent.click(backButton)

    expect(screen.getByTestId('current-path')).toHaveTextContent('/search')
  })
})
