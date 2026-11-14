export const CJK = /[぀-ヿ㐀-鿿ｦ-ﾟ]/

/** The original title when it's written in Japanese or Chinese script, otherwise null. Latin originals would just repeat the English title. */
export function japaneseTitle(originalTitle: string | null | undefined): string | null {
  return originalTitle && CJK.test(originalTitle) ? originalTitle : null
}
