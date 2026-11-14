import { useEffect, useState } from 'react'
import type { TagDTO } from '@shared/tags'

/** Every tag that exists, for the Library page's tag filter. */
export function useAllTags(): TagDTO[] {
  const [tags, setTags] = useState<TagDTO[]>([])

  useEffect(() => {
    let cancelled = false
    window.api.listTags().then((response) => {
      if (!cancelled) setTags(response.tags)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return tags
}
