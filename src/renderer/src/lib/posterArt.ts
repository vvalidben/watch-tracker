import { CJK, japaneseTitle } from '@shared/japaneseTitle'

export { japaneseTitle }

/** The large watermark character: the first kanji or kana of the original title, or else the title's first letter. */
export function posterGlyph(title: string, originalTitle: string | null | undefined): string {
  const cjk = originalTitle?.match(CJK)?.[0]
  if (cjk) return cjk
  const letter = title.match(/[\p{L}\p{N}]/u)?.[0]
  return letter ? letter.toUpperCase() : '★'
}

/** A stable pair of hues per title, so one title gets the same colors in search results and in the library. */
export function posterHues(title: string): { hue: number; hue2: number } {
  let hash = 0
  for (const char of title) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 3600
  }
  const hue = hash % 360
  return { hue, hue2: (hue + 60) % 360 }
}
