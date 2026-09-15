import { ipcMain } from 'electron'
import type {
  AttachTagRequest,
  DetachTagRequest,
  ListTagsForMediaRequest,
  ListTagsForMediaResponse,
  ListTagsResponse,
  TagsForMediaResult
} from '@shared/tags'
import type { IpcResult } from '@shared/ipcResult'
import type { Repositories } from '../db/repositories'
import { toTagDTO } from '../library/dto'
import { getOrCreateMediaItem } from '../library/ensureLocalMedia'

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function resultOf<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    return { ok: false, error: toMessage(error) }
  }
}

export function registerTagsIpc(repositories: Repositories): void {
  ipcMain.handle('tags:list', async (): Promise<ListTagsResponse> => {
    try {
      return { tags: (await repositories.tags.list()).map(toTagDTO) }
    } catch (error) {
      console.error('[tags] list failed', error)
      return { tags: [] }
    }
  })

  ipcMain.handle(
    'tags:listForMedia',
    async (_event, request: ListTagsForMediaRequest): Promise<ListTagsForMediaResponse> => {
      try {
        const mediaItem = await repositories.mediaItems.findBySource(request.media.source, request.media.externalId)
        if (!mediaItem) return { tags: [] }
        return { tags: (await repositories.tags.listForMediaItem(mediaItem.id)).map(toTagDTO) }
      } catch (error) {
        console.error('[tags] listForMedia failed', error)
        return { tags: [] }
      }
    }
  )

  ipcMain.handle('tags:attachToMedia', (_event, request: AttachTagRequest): Promise<IpcResult<TagsForMediaResult>> =>
    resultOf(async () => {
      const name = request.tagName.trim()
      if (name.length === 0) throw new Error('Tag name cannot be empty')

      const mediaItem = await getOrCreateMediaItem(repositories, request.media)
      // Reuse an existing tag by name (case-insensitive) rather than create
      // a near-duplicate — "Anime" and "anime" should be the same tag.
      const existing = await repositories.tags.list()
      const tag =
        existing.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase()) ??
        (await repositories.tags.create(name))

      await repositories.tags.attachToMediaItem(mediaItem.id, tag.id)
      return { tags: (await repositories.tags.listForMediaItem(mediaItem.id)).map(toTagDTO) }
    })
  )

  ipcMain.handle('tags:detachFromMedia', (_event, request: DetachTagRequest): Promise<IpcResult<TagsForMediaResult>> =>
    resultOf(async () => {
      const mediaItem = await getOrCreateMediaItem(repositories, request.media)
      await repositories.tags.detachFromMediaItem(mediaItem.id, request.tagId)
      return { tags: (await repositories.tags.listForMediaItem(mediaItem.id)).map(toTagDTO) }
    })
  )
}
