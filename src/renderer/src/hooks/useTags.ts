import { useCallback, useEffect, useState } from 'react'
import type { NormalizedMedia } from '@shared/metadata'
import type { TagDTO } from '@shared/tags'

export interface UseTagsResult {
  /** Tags attached to this media item. */
  tags: TagDTO[]
  /** Every tag that exists, for autocomplete suggestions. */
  allTags: TagDTO[]
  loading: boolean
  pending: boolean
  error: string | null
  /** Attaches an existing tag by name, or creates it first if it doesn't exist yet. */
  addTag: (name: string) => Promise<void>
  removeTag: (tagId: number) => Promise<void>
}

/** Personal tags for one movie/series/anime — entirely local, never synced with the metadata provider. */
export function useTags(media: NormalizedMedia): UseTagsResult {
  const [tags, setTags] = useState<TagDTO[]>([])
  const [allTags, setAllTags] = useState<TagDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    const [forMedia, all] = await Promise.all([
      window.api.listTagsForMedia({ media }),
      window.api.listTags()
    ])
    setTags(forMedia.tags)
    setAllTags(all.tags)
    // Depends on the whole `media` object (not just source/externalId,
    // like sibling hooks) because the whole object — not just those two
    // fields — is sent over IPC below; `media` is a stable reference for
    // the lifetime of one detail-page view, so this doesn't cause extra
    // re-fetching in practice.
  }, [media])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  async function addTag(name: string): Promise<void> {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    setPending(true)
    setError(null)
    const result = await window.api.attachTag({ media, tagName: trimmed })
    setPending(false)
    if (result.ok) {
      setTags(result.data.tags)
      // The tag may have just been created — refresh the all-tags list too, for autocomplete.
      window.api.listTags().then((response) => setAllTags(response.tags))
    } else {
      setError(result.error)
    }
  }

  async function removeTag(tagId: number): Promise<void> {
    setPending(true)
    setError(null)
    const result = await window.api.detachTag({ media, tagId })
    setPending(false)
    if (result.ok) {
      setTags(result.data.tags)
    } else {
      setError(result.error)
    }
  }

  return { tags, allTags, loading, pending, error, addTag, removeTag }
}
