import { describe, expect, it } from 'vitest'
import { japaneseTitle, posterGlyph, posterHues } from './posterArt'

describe('japaneseTitle', () => {
  it('returns an original title written in kanji or kana', () => {
    expect(japaneseTitle('葬送のフリーレン')).toBe('葬送のフリーレン')
    expect(japaneseTitle('モンスター')).toBe('モンスター')
  })

  it('returns null for a Latin-script original or a missing one', () => {
    expect(japaneseTitle('Severance')).toBeNull()
    expect(japaneseTitle(null)).toBeNull()
    expect(japaneseTitle(undefined)).toBeNull()
  })
})

describe('posterGlyph', () => {
  it('prefers the first CJK character of the original title', () => {
    expect(posterGlyph('Frieren', '葬送のフリーレン')).toBe('葬')
  })

  it('falls back to the first letter of the title, uppercased', () => {
    expect(posterGlyph('severance', 'Severance')).toBe('S')
    expect(posterGlyph('"Odd" Taxi', null)).toBe('O')
  })

  it('never returns an empty glyph for a title with no letters', () => {
    expect(posterGlyph('...', null)).toBe('★')
  })
})

describe('posterHues', () => {
  it('is stable for one title and stays on the color wheel', () => {
    const hues = posterHues('Attack on Titan')

    expect(posterHues('Attack on Titan')).toEqual(hues)
    expect(hues.hue).toBeGreaterThanOrEqual(0)
    expect(hues.hue).toBeLessThan(360)
    expect(hues.hue2).toBe((hues.hue + 60) % 360)
  })

  it('tells titles of the same length apart', () => {
    expect(posterHues('Monster').hue).not.toBe(posterHues('Mushshi').hue)
  })
})
