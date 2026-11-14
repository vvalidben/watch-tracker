import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { LibraryItemDTO } from '@shared/library'
import { LibraryItemCard } from './LibraryItemCard'

function libraryItem(originalTitle: string | null): LibraryItemDTO {
  return {
    mediaItem: {
      id: 1,
      type: 'anime',
      title: 'Frieren',
      originalTitle,
      posterPath: 'https://cdn.test/frieren.jpg',
      releaseDate: '2023-09-29',
      runtimeMinutes: null,
      source: 'anilist',
      sourceId: '154587'
    },
    libraryEntry: { watchStatus: 'watching', rating: null, favorite: false, completedAt: null },
    progress: null,
    lastWatchedAt: null
  } as unknown as LibraryItemDTO
}

function renderCard(item: LibraryItemDTO): void {
  render(
    <MemoryRouter>
      <LibraryItemCard item={item} />
    </MemoryRouter>
  )
}

describe('LibraryItemCard', () => {
  it('names the title in text when real artwork replaces the generated poster', () => {
    renderCard(libraryItem(null))
    expect(screen.getByText('Frieren')).toBeInTheDocument()
  })

  it('shows the Japanese title alongside it', () => {
    renderCard(libraryItem('葬送のフリーレン'))
    expect(screen.getByText('葬送のフリーレン')).toBeInTheDocument()
  })

  it('leaves out a romaji original title', () => {
    renderCard(libraryItem('Sousou no Frieren'))
    expect(screen.queryByText('Sousou no Frieren')).not.toBeInTheDocument()
  })
})
