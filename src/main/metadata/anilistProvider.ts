import type { MediaStatus, MediaType, NormalizedEpisode, NormalizedMedia, NormalizedSeason } from '@shared/metadata'
import { ProviderError } from './errors'
import { fetchJson } from './httpClient'
import type { MediaSearchProvider } from './provider'

export interface AniListConfig {
  apiUrl?: string
}

interface AniListFuzzyDate {
  year: number | null
  month: number | null
  day: number | null
}

interface AniListMedia {
  id: number
  title: { romaji: string | null; english: string | null }
  description: string | null
  coverImage: { large: string | null } | null
  bannerImage: string | null
  startDate: AniListFuzzyDate | null
  status: string | null
  genres: string[]
  averageScore: number | null
  episodes: number | null
}

interface AniListStreamingEpisode {
  title: string | null
  thumbnail: string | null
}

interface AniListGraphQLResponse<T> {
  data: T | null
  errors?: { message: string }[]
}

const SEARCH_QUERY = `
  query ($search: String, $perPage: Int) {
    Page(perPage: $perPage) {
      media(search: $search, type: ANIME) {
        id
        title { romaji english }
        description(asHtml: false)
        coverImage { large }
        bannerImage
        startDate { year month day }
        status
        genres
        averageScore
        episodes
      }
    }
  }
`

const DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english }
      description(asHtml: false)
      coverImage { large }
      bannerImage
      startDate { year month day }
      status
      genres
      averageScore
      episodes
    }
  }
`

// AniList has no real "seasons" model (a sequel cour is its own Media entry
// entirely), so getEpisodes always represents a single implicit season.
// streamingEpisodes is unofficial (sourced from streaming sites) but is the
// only source of per-episode titles AniList's API offers.
const EPISODES_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      streamingEpisodes { title thumbnail }
    }
  }
`

function formatStartDate(date: AniListFuzzyDate | null): string | null {
  if (!date?.year) return null
  const month = String(date.month ?? 1).padStart(2, '0')
  const day = String(date.day ?? 1).padStart(2, '0')
  return `${date.year}-${month}-${day}`
}

function mapStatus(status: string | null): MediaStatus | null {
  switch (status) {
    case 'RELEASING':
    case 'HIATUS':
      return 'airing'
    case 'FINISHED':
      return 'finished'
    case 'NOT_YET_RELEASED':
      return 'upcoming'
    case 'CANCELLED':
      return 'cancelled'
    default:
      return null
  }
}

/**
 * AniList's `description(asHtml: false)` still leaves the odd `<br>` in
 * (typically around a trailing "(Source: ...)" line) — normalize those to
 * newlines and strip anything else that looks like a tag.
 */
function cleanDescription(description: string | null): string | null {
  if (!description) return null
  return description
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
}

/** streamingEpisodes titles usually look like "Episode 12 - The Journey Home". */
function parseStreamingTitle(raw: string | null, fallbackNumber: number): { number: number; title: string | null } {
  if (!raw) return { number: fallbackNumber, title: null }
  const match = /^Episode\s+(\d+)\s*-\s*(.*)$/i.exec(raw.trim())
  if (!match) return { number: fallbackNumber, title: raw.trim() || null }
  const parsedNumber = Number(match[1])
  return {
    number: Number.isNaN(parsedNumber) ? fallbackNumber : parsedNumber,
    title: match[2].trim() || null
  }
}

function normalize(media: AniListMedia): NormalizedMedia {
  const title = media.title.english ?? media.title.romaji ?? 'Untitled'
  const originalTitle = media.title.romaji && media.title.romaji !== title ? media.title.romaji : null

  return {
    externalId: String(media.id),
    source: 'anilist',
    mediaType: 'anime',
    title,
    originalTitle,
    poster: media.coverImage?.large ?? null,
    backdrop: media.bannerImage ?? null,
    description: cleanDescription(media.description),
    releaseDate: formatStartDate(media.startDate),
    status: mapStatus(media.status),
    genres: media.genres ?? [],
    rating: typeof media.averageScore === 'number' ? media.averageScore / 10 : null,
    numberOfSeasons: null,
    numberOfEpisodes: media.episodes ?? null
  }
}

export function createAniListProvider(config: AniListConfig = {}): MediaSearchProvider {
  const apiUrl = config.apiUrl ?? 'https://graphql.anilist.co'

  async function query<T>(graphqlQuery: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetchJson<AniListGraphQLResponse<T>>(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: graphqlQuery, variables })
    })

    if (!response.data) {
      const message = response.errors?.map((e) => e.message).join('; ') || 'AniList returned no data'
      throw new ProviderError('unknown', message)
    }
    return response.data
  }

  return {
    source: 'anilist',
    supportedTypes: ['anime'],

    async search(searchQuery: string, type: MediaType): Promise<NormalizedMedia[]> {
      if (type !== 'anime') return []
      const data = await query<{ Page: { media: AniListMedia[] } }>(SEARCH_QUERY, {
        search: searchQuery,
        perPage: 20
      })
      return data.Page.media.map(normalize)
    },

    async getDetails(externalId: string, type: MediaType): Promise<NormalizedMedia> {
      if (type !== 'anime') {
        throw new ProviderError('unknown', `AniList does not support media type "${type}"`)
      }
      const data = await query<{ Media: AniListMedia | null }>(DETAILS_QUERY, { id: Number(externalId) })
      if (!data.Media) {
        throw new ProviderError('unknown', `No AniList entry found for id ${externalId}`)
      }
      return normalize(data.Media)
    },

    async getSeasons(externalId: string, type: MediaType): Promise<NormalizedSeason[]> {
      if (type !== 'anime') return []
      const data = await query<{ Media: AniListMedia | null }>(DETAILS_QUERY, { id: Number(externalId) })
      if (!data.Media) return []

      return [
        {
          seasonNumber: 1,
          title: null,
          overview: null,
          poster: null,
          airDate: null,
          episodeCount: data.Media.episodes ?? null
        }
      ]
    },

    async getEpisodes(externalId: string, type: MediaType, seasonNumber: number): Promise<NormalizedEpisode[]> {
      if (type !== 'anime' || seasonNumber !== 1) return []

      const data = await query<{
        Media: { episodes: number | null; streamingEpisodes: AniListStreamingEpisode[] } | null
      }>(EPISODES_QUERY, { id: Number(externalId) })
      if (!data.Media) return []

      if (data.Media.streamingEpisodes.length > 0) {
        return data.Media.streamingEpisodes.map((episode, index) => {
          const { number, title } = parseStreamingTitle(episode.title, index + 1)
          return { episodeNumber: number, title, overview: null, airDate: null, runtimeMinutes: null }
        })
      }

      const totalEpisodes = data.Media.episodes ?? 0
      return Array.from({ length: totalEpisodes }, (_, index) => ({
        episodeNumber: index + 1,
        title: null,
        overview: null,
        airDate: null,
        runtimeMinutes: null
      }))
    }
  }
}
