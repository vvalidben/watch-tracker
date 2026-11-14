import type { GetMediaDetailsRequest, MediaType, NormalizedMedia } from './metadata'

export type DiscoveryMode = 'popular' | 'top-rated' | 'upcoming'
export interface DiscoverRequest {
  mediaType: MediaType
  mode: DiscoveryMode
  genre?: string
  year?: number
  page?: number
}
export interface DiscoverResponse {
  results: NormalizedMedia[]
  page: number
  hasNextPage: boolean
}
export interface WatchProvider { id: string; name: string; logo: string | null }
export interface WatchGroup { type: 'stream' | 'free' | 'ads' | 'rent' | 'buy'; providers: WatchProvider[] }
export interface Availability {
  country: string
  groups: WatchGroup[]
  link: string | null
  attribution: 'JustWatch' | 'AniList'
  note: string
  animeLinks: { name: string; url: string }[]
}
export interface TitleExtrasRequest extends GetMediaDetailsRequest { country: string }
export interface TitleExtras {
  recommendations: NormalizedMedia[]
  recommendationError: string | null
  availability: Availability | null
  availabilityError: string | null
}

// Shared names map to each catalogue's genre IDs on the server.
export const DISCOVERY_GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Science Fiction', 'Thriller'] as const
export const ANIME_GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'] as const
export const WATCH_COUNTRIES = [
  ['MA', 'Morocco'], ['DZ', 'Algeria'], ['TN', 'Tunisia'], ['EG', 'Egypt'], ['SA', 'Saudi Arabia'], ['AE', 'United Arab Emirates'],
  ['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'], ['FR', 'France'], ['DE', 'Germany'], ['ES', 'Spain'],
  ['IT', 'Italy'], ['PT', 'Portugal'], ['NL', 'Netherlands'], ['AU', 'Australia'], ['BR', 'Brazil'], ['MX', 'Mexico'],
  ['IN', 'India'], ['JP', 'Japan'], ['KR', 'South Korea'], ['ZA', 'South Africa']
] as const
