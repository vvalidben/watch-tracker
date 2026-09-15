import type { NormalizedMedia } from './metadata'

/**
 * Tags are purely personal organization — like notes and favorites, they
 * live only in this app's own tables and are never fetched from or synced
 * with TMDB/AniList. A tag is created lazily by name the first time it's
 * used and can be attached to any number of movies/series/anime.
 */
export interface TagDTO {
  id: number
  name: string
  color: string | null
}

export interface ListTagsResponse {
  tags: TagDTO[]
}

export interface ListTagsForMediaRequest {
  media: NormalizedMedia
}

export interface ListTagsForMediaResponse {
  tags: TagDTO[]
}

/** Finds an existing tag by name (case-insensitive) or creates one, then attaches it. */
export interface AttachTagRequest {
  media: NormalizedMedia
  tagName: string
}

export interface DetachTagRequest {
  media: NormalizedMedia
  tagId: number
}

/** Shared response shape for both attach and detach: the media item's tags after the change. */
export interface TagsForMediaResult {
  tags: TagDTO[]
}
