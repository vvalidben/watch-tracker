import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UpcomingEpisode } from '@shared/enhancements'
import { PageTitle } from '@renderer/components/neon/PageTitle'

export function Upcoming(): JSX.Element {
  const navigate = useNavigate()
  const [episodes, setEpisodes] = useState<UpcomingEpisode[]>([])
  const [filter, setFilter] = useState<'upcoming' | 'available'>('upcoming')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [limit, setLimit] = useState(100)
  const cancelled = useRef(false)
  const load = useCallback(async () => {
    try {
      const result = await window.api.getUpcomingEpisodes()
      if (result.ok) setEpisodes(result.data); else setMessage(result.error)
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load(); return () => { cancelled.current = true } }, [load])
  async function refresh(): Promise<void> {
    setRefreshing(true); cancelled.current = false
    const errors: string[] = []
    let done = 0
    try {
      const library = await window.api.listLibrary({})
      const series = library.items.filter((item) => item.mediaItem.type !== 'movie' && item.mediaItem.source !== 'manual' && !['dropped', 'on_hold'].includes(item.libraryEntry.watchStatus))
      for (const { mediaItem: media } of series) {
        if (cancelled.current) break
        if (media.source === 'manual' || !media.sourceId) continue
        setMessage(`Refreshing ${done + 1} of ${series.length}: ${media.title}…`)
        const result = await window.api.refreshMetadata({ source: media.source, mediaType: media.type, externalId: media.sourceId })
        if (!result.ok) errors.push(`${media.title}: ${result.error}`)
        else errors.push(...result.data.warnings.map((warning) => `${media.title}: ${warning}`))
        done++
      }
      await load()
      setMessage(`${done} titles checked.${cancelled.current ? ' Refresh stopped.' : ''}${errors.length ? ` ${errors.join('; ')}` : ' Saved episode details are available offline.'}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
    finally { setRefreshing(false) }
  }
  const visible = episodes.filter((episode) => episode.available === (filter === 'available'))
  return <section className="wt-stack" style={{ gap: 24 }}>
    <PageTitle number="08" jp="放送" title="Episode schedule" subtitle="Upcoming air dates and unwatched episodes that have aired" />
    <div className="wt-panel wt-stack" style={{ padding: 20, gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="wt-btn wt-btn-yellow" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? 'Refreshing schedules…' : 'Refresh schedules'}</button>
        {refreshing && <button className="wt-ghost" onClick={() => { cancelled.current = true }}>Stop after this title</button>}
        {(['upcoming', 'available'] as const).map((option) => <button className={`wt-pill ${filter === option ? 'is-on' : ''}`} key={option} aria-pressed={filter === option} onClick={() => { setFilter(option); setLimit(100) }}>{option === 'upcoming' ? 'Upcoming' : 'Available to watch'}</button>)}
      </div>
      <span className="wt-sub">Uses saved provider air dates. Refresh schedules to download updates and offline episode details. Shows on hold or dropped are excluded. A broadcast date does not guarantee availability on your streaming service.</span>
      {message && <span role="status" style={{ fontSize: 13 }}>{message}</span>}
    </div>
    {loading ? <p className="wt-sub">Loading saved schedule…</p> : !visible.length ? <p className="wt-sub">{filter === 'upcoming' ? 'No upcoming dates are saved. Refresh schedules to check your tracked shows.' : 'No saved, aired episodes are waiting.'}</p> : <div className="wt-stack" style={{ gap: 10 }}>
      {visible.slice(0, limit).map((episode) => <button key={`${episode.source}:${episode.mediaType}:${episode.externalId}:${episode.seasonNumber}:${episode.episodeNumber}`} className="wt-row" style={{ display: 'flex', gap: 18, alignItems: 'center', textAlign: 'left', padding: 18 }} onClick={() => navigate(`/media/${episode.source}/${episode.mediaType}/${episode.externalId}`)}>
        <span className="wt-display" style={{ color: 'var(--wt-a2)', minWidth: 112, fontSize: 14 }}>{episode.airDate}</span>
        <span className="wt-stack" style={{ gap: 5 }}><strong>{episode.title}</strong><span className="wt-sub">S{episode.seasonNumber} · E{episode.episodeNumber}{episode.episodeTitle ? ` · ${episode.episodeTitle}` : ''}</span></span>
      </button>)}
      {visible.length > limit && <button className="wt-ghost" onClick={() => setLimit(limit + 100)}>Show more ({visible.length - limit} remaining)</button>}
    </div>}
  </section>
}
