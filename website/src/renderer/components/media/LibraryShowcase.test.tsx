import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { LibraryItemDTO } from '@shared/library'
import { LibraryShowcase } from './LibraryShowcase'

function item(id: number, title: string, manual = false): LibraryItemDTO {
  return {
    mediaItem: { id, title, type: 'anime', originalTitle: null, source: manual ? 'manual' : 'anilist', sourceId: manual ? null : String(id), releaseDate: '2023-09-29', posterPath: null, backdropPath: null, runtimeMinutes: null, numberOfEpisodes: 28, overview: `The saved synopsis for ${title}.` },
    libraryEntry: { favorite: true, watchStatus: 'watching', rating: null },
    progress: { watchedEpisodes: 12, totalEpisodes: 28, percentage: 43 }
  } as LibraryItemDTO
}

function Location(): JSX.Element { return <output aria-label="Current route">{useLocation().pathname}</output> }
const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => <MemoryRouter>{children}<Location /></MemoryRouter>

describe('library showcase', () => {
  it('shows saved metadata and opens the selected title', () => {
    render(<LibraryShowcase items={[item(1, 'Frieren')]} total={24} onBrowse={vi.fn()} />, { wrapper })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Library')
    expect(screen.getByRole('heading', { level: 2, name: 'Frieren' })).toBeInTheDocument()
    expect(screen.getByText('The saved synopsis for Frieren.')).toBeInTheDocument()
    expect(screen.getByText('12 / 28 episodes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open title' }))
    expect(screen.getByRole('status', { name: 'Current route' })).toHaveTextContent('/media/anilist/anime/1')
  })

  it('cycles in both directions and preserves the selector controls', () => {
    render(<LibraryShowcase items={[item(1, 'Frieren'), item(2, 'Dr. STONE')]} total={2} onBrowse={vi.fn()} />, { wrapper })
    const next = screen.getByRole('button', { name: 'Next featured title' })
    next.focus()
    fireEvent.click(next)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Dr. STONE')
    expect(next).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Feature Dr. STONE' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(next)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Frieren')
    fireEvent.click(screen.getByRole('button', { name: 'Previous featured title' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Dr. STONE')
  })

  it('falls back safely when the selected item is removed', () => {
    const { rerender } = render(<LibraryShowcase items={[item(1, 'Frieren'), item(2, 'Dr. STONE')]} total={2} onBrowse={vi.fn()} />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: 'Feature Dr. STONE' }))
    rerender(<LibraryShowcase items={[item(1, 'Frieren')]} total={1} onBrowse={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Frieren')
    expect(screen.queryByRole('button', { name: 'Next featured title' })).not.toBeInTheDocument()
  })

  it('keeps unsupported manual entries visible and lets the user browse', () => {
    const browse = vi.fn()
    render(<LibraryShowcase items={[item(1, 'My local film', true)]} total={1} onBrowse={browse} />, { wrapper })
    expect(screen.getByRole('button', { name: 'Open title' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Browse collection' }))
    expect(browse).toHaveBeenCalledOnce()
  })
})
