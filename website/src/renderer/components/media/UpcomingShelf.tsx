import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UpcomingEpisode } from '@shared/enhancements'

export function UpcomingShelf({ revision = '' }: { revision?: string }): JSX.Element | null {
  const navigate = useNavigate()
  const [episodes, setEpisodes] = useState<UpcomingEpisode[]>([])
  useEffect(() => {
    let cancelled = false
    window.api.getUpcomingEpisodes().then((result) => {
      if (cancelled || !result.ok) return
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
      setEpisodes(result.data.filter((episode) => episode.available && episode.airDate >= cutoff.toISOString().slice(0, 10)).slice(-4).reverse())
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [revision])
  if (!episodes.length) return null
  return <div className="wt-stack" style={{ gap: 14 }}>
    <div className="wt-section-head"><h2 className="wt-h2">New episodes available</h2><button className="wt-link" onClick={() => navigate('/upcoming')}>Episode schedule →</button></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
      {episodes.map((episode) => <button className="wt-card wt-stack" style={{ gap: 8, textAlign: 'left' }} key={`${episode.source}:${episode.mediaType}:${episode.externalId}:${episode.seasonNumber}:${episode.episodeNumber}`} onClick={() => navigate(`/media/${episode.source}/${episode.mediaType}/${episode.externalId}`)}>
        <strong>{episode.title}</strong><span className="wt-sub">S{episode.seasonNumber} · E{episode.episodeNumber} · {episode.airDate}</span>
      </button>)}
    </div>
  </div>
}
