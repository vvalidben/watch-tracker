import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, TriangleAlert } from 'lucide-react'
import { EmptyState } from '@renderer/components/layout/EmptyState'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { ConfirmDialog } from '@renderer/components/neon/ConfirmDialog'
import { PageTitle } from '@renderer/components/neon/PageTitle'
import { Poster } from '@renderer/components/neon/Poster'
import { useLibrary } from '@renderer/hooks/useLibrary'
import { invalidateWatchLog } from '@renderer/hooks/useWatchLog'
import { extractYear, formatShortDate, lengthText, mediaPath, mediaTypeLabel, metaLine } from '@renderer/lib/mediaFormatting'
import { mediaItemToOfflineNormalizedMedia } from '@shared/offlineMedia'
import type { LibraryItemDTO } from '@shared/library'

export function Watchlist(): JSX.Element {
  const navigate = useNavigate()
  const { items, loading, error, refresh } = useLibrary({ initialStatus: 'plan_to_watch', initialSort: 'recently_added' })
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function run(item: LibraryItemDTO, action: () => Promise<{ ok: true } | { ok: false; error: string }>): Promise<void> {
    setPendingId(item.mediaItem.id)
    setActionError(null)
    const result = await action()
    if (result.ok) {
      await refresh()
      invalidateWatchLog()
    } else {
      setActionError(result.error)
    }
    setPendingId(null)
  }

  /** A film has nothing to be partway through, so starting one marks it watched. */
  function start(item: LibraryItemDTO): void {
    const media = mediaItemToOfflineNormalizedMedia(item.mediaItem)
    if (!media) return
    const watchStatus = media.mediaType === 'movie' ? 'completed' : 'watching'
    void run(item, () => window.api.setWatchStatus({ media, watchStatus }))
  }

  function remove(item: LibraryItemDTO): void {
    const media = mediaItemToOfflineNormalizedMedia(item.mediaItem)
    if (!media) return
    void run(item, () => window.api.removeFromLibrary({ source: media.source, externalId: media.externalId }))
  }

  return (
    <section className="wt-stack" style={{ gap: 26 }}>
      <PageTitle
        number="03"
        jp="予定"
        title="Watchlist"
        subtitle={loading ? undefined : `${items.length} ${items.length === 1 ? 'title' : 'titles'} waiting, newest first`}
      />

      {(error || actionError) && (
        <div className="wt-error">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error ?? actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-[22px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing waiting"
          description="Titles you add stay here until you start them."
          action={
            <button type="button" className="wt-btn wt-btn-pink" onClick={() => navigate('/search')}>
              ＋ Add a title
            </button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,520px),1fr))', gap: 20 }}>
          {items.map((item, index) => {
            const { mediaItem } = item
            const path = mediaPath(mediaItem)
            const open = (): void => {
              if (path) navigate(path)
            }
            return (
              <div key={mediaItem.id} className="wt-rise" style={{ animationDelay: `${Math.min(index, 24) * 40}ms` }}>
                <div className="wt-card wt-card-cyan" style={{ position: 'relative', overflow: 'hidden', display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 22, padding: 20, borderRadius: 22, height: '100%', boxSizing: 'border-box' }}>
                  <span aria-hidden="true" className="wt-display" style={{ position: 'absolute', right: 14, top: -8, fontSize: 96, lineHeight: 1, color: 'transparent', WebkitTextStroke: '1.5px var(--wt-line-strong)' }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <button type="button" aria-label={`Open ${mediaItem.title}`} disabled={!path} style={{ cursor: path ? 'pointer' : 'default', alignSelf: 'start' }} onClick={open}>
                    <Poster
                      title={mediaItem.title}
                      originalTitle={mediaItem.originalTitle}
                      mediaType={mediaItem.type}
                      year={extractYear(mediaItem.releaseDate)}
                      image={mediaItem.posterPath}
                    />
                  </button>
                  <div className="wt-stack" style={{ position: 'relative', gap: 8, minWidth: 0 }}>
                    <button type="button" className="wt-display" disabled={!path} style={{ fontSize: 21, lineHeight: 1.15, textAlign: 'left', cursor: path ? 'pointer' : 'default' }} onClick={open}>
                      {mediaItem.title}
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wt-a2)' }}>
                      {metaLine(
                        mediaTypeLabel(mediaItem.type),
                        extractYear(mediaItem.releaseDate),
                        lengthText(mediaItem.type, mediaItem.runtimeMinutes, mediaItem.numberOfEpisodes)
                      )}
                    </span>
                    {mediaItem.overview && (
                      <p className="line-clamp-4" style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--wt-soft)' }}>
                        {mediaItem.overview}
                      </p>
                    )}
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button type="button" className="wt-btn wt-btn-pink" disabled={pendingId === mediaItem.id || !path} onClick={() => start(item)}>
                        {mediaItem.type === 'movie' ? '✓ Mark watched' : '▶ Start watching'}
                      </button>
                      <ConfirmDialog
                        trigger={
                          <button type="button" className="wt-quiet" disabled={pendingId === mediaItem.id || !path}>
                            Remove
                          </button>
                        }
                        title={`Remove ${mediaItem.title}?`}
                        description="This removes it from your library, along with any rating, notes, tags, and watch history you've recorded for it."
                        confirmLabel="Remove"
                        onConfirm={() => remove(item)}
                      />
                      <span style={{ fontSize: 11, color: 'var(--wt-muted)', marginLeft: 'auto' }}>
                        added {formatShortDate(item.libraryEntry.addedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
