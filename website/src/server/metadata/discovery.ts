import type { DiscoverRequest, DiscoverResponse, TitleExtrasRequest, TitleExtras, Availability, WatchGroup } from '@shared/discovery'
import { ANIME_GENRES, DISCOVERY_GENRES } from '@shared/discovery'
import type { NormalizedMedia } from '@shared/metadata'
import { fetchJson } from './httpClient'
import { normalizeMovie, normalizeTv, resolveGenreNames } from './tmdbMapper'
import type { TmdbMovieItem, TmdbTvItem } from './tmdbTypes'
import { normalizeAnime } from './anilistProvider'

const IMAGE_BASE = 'https://image.tmdb.org/t/p'
const movieGenres: Record<string, number> = { Action:28, Adventure:12, Animation:16, Comedy:35, Crime:80, Documentary:99, Drama:18, Family:10751, Fantasy:14, Horror:27, Mystery:9648, Romance:10749, 'Science Fiction':878, Thriller:53 }
const tvGenres: Record<string, number> = { Action:10759, Adventure:10759, Animation:16, Comedy:35, Crime:80, Documentary:99, Drama:18, Family:10751, Fantasy:10765, Mystery:9648, 'Science Fiction':10765 }
const genreNames = new Map<number,string>([...Object.entries(movieGenres), ...Object.entries(tvGenres)].map(([name,id])=>[id,name]))
genreNames.set(10759,'Action & Adventure'); genreNames.set(10765,'Sci-Fi & Fantasy')

// Only public catalogue data is cached. Keys partition TMDB accounts; the cache is bounded.
const catalogueCache = new Map<string, { expires: number; data: Promise<unknown> }>()
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = catalogueCache.get(key)
  if (hit && hit.expires > Date.now()) return hit.data as Promise<T>
  if (catalogueCache.size >= 80) catalogueCache.delete(catalogueCache.keys().next().value!)
  const data = load().catch(error => { catalogueCache.delete(key); throw error })
  catalogueCache.set(key, { expires: Date.now() + 5 * 60_000, data })
  return data
}
function tmdb<T>(apiKey: string | null | undefined, path: string, params: Record<string,string> = {}): Promise<T> {
  if (!apiKey) throw new Error('Add a TMDB API key in Settings to discover films and series. Anime discovery works without a key.')
  const query = new URLSearchParams({ ...params, api_key: apiKey })
  return cached(`tmdb:${path}:${query}`, () => fetchJson<T>(`https://api.themoviedb.org/3/${path}?${query}`))
}
const ANIME_FIELDS = `id title { romaji english native } description(asHtml:false) coverImage { large } bannerImage startDate { year month day } status genres averageScore episodes`
async function animeQuery<T>(query: string, variables: Record<string,unknown>): Promise<T> {
  return cached(`anilist:${query}:${JSON.stringify(variables)}`, async () => {
    const result = await fetchJson<{data:T|null; errors?:{message:string}[]}>('https://graphql.anilist.co', {
      method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'}, body:JSON.stringify({query,variables})
    })
    if (!result.data || result.errors?.length) throw new Error('AniList could not load this catalogue. Please try again.')
    return result.data
  })
}
export function validateDiscover(value: unknown): DiscoverRequest & { page: number } {
  if (!value || typeof value !== 'object') throw new Error('Choose a catalogue to explore.')
  const request = value as DiscoverRequest
  if (!['movie','tv','anime'].includes(request.mediaType) || !['popular','top-rated','upcoming'].includes(request.mode)) throw new Error('Choose a valid catalogue and sort order.')
  const page = request.page ?? 1
  if (!Number.isInteger(page) || page < 1 || page > 100) throw new Error('Choose a page between 1 and 100.')
  if (request.year !== undefined && (!Number.isInteger(request.year) || request.year < 1900 || request.year > new Date().getUTCFullYear()+5)) throw new Error('Choose a valid release year.')
  const allowed: readonly string[] = request.mediaType === 'anime' ? ANIME_GENRES : DISCOVERY_GENRES
  if (request.genre && (typeof request.genre !== 'string' || !allowed.includes(request.genre))) throw new Error('Choose a valid genre.')
  if (request.mediaType === 'tv' && request.genre && !tvGenres[request.genre]) throw new Error('This genre is only available for films. Choose another genre for series.')
  return { mediaType:request.mediaType, mode:request.mode, genre:request.genre, year:request.year, page }
}
function mapTmdb(item: TmdbMovieItem | TmdbTvItem, type: 'movie'|'tv'): NormalizedMedia {
  const genres = resolveGenreNames(item, genreNames)
  return type === 'movie' ? normalizeMovie(item as TmdbMovieItem, genres, IMAGE_BASE) : normalizeTv(item as TmdbTvItem, genres, IMAGE_BASE)
}
export async function discoverMedia(value: unknown, apiKey?: string | null): Promise<DiscoverResponse> {
  const request = validateDiscover(value)
  const { mediaType:type, mode, page } = request
  if (type === 'anime') {
    const variables = {page, genre:request.genre || undefined, year:request.year, status:mode==='upcoming'?'NOT_YET_RELEASED':undefined, sort:mode==='top-rated'?['SCORE_DESC','POPULARITY_DESC']:['POPULARITY_DESC']}
    const result = await animeQuery<{Page:{pageInfo:{hasNextPage:boolean};media:Parameters<typeof normalizeAnime>[0][]}}>(
      `query($page:Int,$genre:String,$year:Int,$status:MediaStatus,$sort:[MediaSort]) { Page(page:$page,perPage:20) { pageInfo { hasNextPage } media(type:ANIME,isAdult:false,genre:$genre,seasonYear:$year,status:$status,sort:$sort) { ${ANIME_FIELDS} } } }`, variables)
    return { results:result.Page.media.map(normalizeAnime), page, hasNextPage:result.Page.pageInfo.hasNextPage && page<100 }
  }
  const params: Record<string,string> = {page:String(page), include_adult:'false', sort_by:mode==='top-rated'?'vote_average.desc':'popularity.desc'}
  if (mode === 'top-rated') params['vote_count.gte'] = '200'
  if (request.genre) params.with_genres=String((type==='movie'?movieGenres:tvGenres)[request.genre])
  if (request.year) params[type==='movie'?'primary_release_year':'first_air_date_year']=String(request.year)
  if (mode === 'upcoming') params[type==='movie'?'primary_release_date.gte':'first_air_date.gte']=new Date().toISOString().slice(0,10)
  const result = await tmdb<{results:(TmdbMovieItem|TmdbTvItem)[];total_pages:number}>(apiKey,`discover/${type}`,params)
  return { results:result.results.map(item=>mapTmdb(item,type)), page, hasNextPage:page<Math.min(100,result.total_pages) }
}
export function validateExtras(value: unknown): TitleExtrasRequest {
  const request = value as TitleExtrasRequest
  if (!request || !['movie','tv','anime'].includes(request.mediaType) || request.source !== (request.mediaType==='anime'?'anilist':'tmdb') || typeof request.externalId!=='string' || !/^[1-9]\d{0,9}$/.test(request.externalId)) throw new Error('Choose a valid title.')
  if (typeof request.country !== 'string' || !/^[A-Z]{2}$/.test(request.country)) throw new Error('Choose a valid country.')
  return request
}
type RawProvider = { provider_id:number; provider_name:string; logo_path:string|null }
type RawAvailability = Record<string,{link?:string;flatrate?:RawProvider[];free?:RawProvider[];ads?:RawProvider[];rent?:RawProvider[];buy?:RawProvider[]}>
function safeLink(value: unknown, host?: string): string | null {
  if (typeof value!=='string') return null
  try {const url=new URL(value);return url.protocol==='https:' && (!host || url.hostname===host) ? url.href : null} catch {return null}
}
export function mapAvailability(results: RawAvailability, country: string): Availability {
  const region=results[country]
  const groups: WatchGroup[]=[]
  for (const [raw,type] of [['flatrate','stream'],['free','free'],['ads','ads'],['rent','rent'],['buy','buy']] as const) {
    const unique=new Map((region?.[raw]??[]).map(provider=>[provider.provider_id,{id:String(provider.provider_id),name:provider.provider_name,logo:provider.logo_path?`${IMAGE_BASE}/w92${provider.logo_path}`:null}]))
    if (unique.size) groups.push({type,providers:[...unique.values()]})
  }
  return { country, groups, link:safeLink(region?.link,'www.themoviedb.org'), attribution:'JustWatch', animeLinks:[], note:'Availability data from JustWatch via TMDB. Plans and availability can change; check the provider before watching.' }
}
export async function getTitleExtras(value: unknown, apiKey?: string | null): Promise<TitleExtras> {
  const request=validateExtras(value)
  if (request.mediaType==='anime') {
    const result=await animeQuery<{Media:{recommendations:{nodes:{mediaRecommendation:Parameters<typeof normalizeAnime>[0]|null}[]};externalLinks:{site:string;url:string;type:string;isDisabled?:boolean}[]}}>(
      `query($id:Int) { Media(id:$id,type:ANIME,isAdult:false) { recommendations(perPage:12,sort:RATING_DESC) { nodes { mediaRecommendation { ${ANIME_FIELDS} isAdult } } } externalLinks { site url type isDisabled } } }`, {id:Number(request.externalId)})
    const recommendations=result.Media.recommendations.nodes.map(node=>node.mediaRecommendation).filter((media):media is Parameters<typeof normalizeAnime>[0]=>!!media && !(media as unknown as {isAdult:boolean}).isAdult).map(normalizeAnime)
    const links=new Map<string,{name:string;url:string}>()
    for (const link of result.Media.externalLinks) { const url=safeLink(link.url);if(url && link.type==='STREAMING' && !link.isDisabled) links.set(link.site,{name:link.site,url}) }
    return {recommendations,recommendationError:null,availabilityError:null,availability:{country:request.country,groups:[],link:null,attribution:'AniList',animeLinks:[...links.values()],note:'Streaming links from AniList. These are not country-specific availability checks; access and subscriptions vary by region.'}}
  }
  const root=`${request.mediaType}/${request.externalId}`
  const [recommendations,availability]=await Promise.allSettled([
    tmdb<{results:(TmdbMovieItem|TmdbTvItem)[]}>(apiKey,`${root}/recommendations`,{page:'1'}),
    tmdb<{results:RawAvailability}>(apiKey,`${root}/watch/providers`)
  ])
  const message=(error:unknown)=>error instanceof Error?error.message:'Could not load this information. Try again.'
  return {
    recommendations:recommendations.status==='fulfilled'?recommendations.value.results.filter(item=>!(item as TmdbMovieItem & {adult?:boolean}).adult).slice(0,12).map(item=>mapTmdb(item,request.mediaType as 'movie'|'tv')):[],
    recommendationError:recommendations.status==='rejected'?message(recommendations.reason):null,
    availability:availability.status==='fulfilled'?mapAvailability(availability.value.results,request.country):null,
    availabilityError:availability.status==='rejected'?message(availability.reason):null
  }
}
