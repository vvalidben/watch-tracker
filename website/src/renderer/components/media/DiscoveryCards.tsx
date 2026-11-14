import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, Star } from 'lucide-react'
import { Poster } from '@renderer/components/neon/Poster'
import { extractYear, mediaTypeLabel } from '@renderer/lib/mediaFormatting'
import type { NormalizedMedia } from '@shared/metadata'

export const catalogueKey = (media: Pick<NormalizedMedia,'source'|'mediaType'|'externalId'>): string => `${media.source}:${media.mediaType}:${media.externalId}`

export function useCatalogueLibrary() {
  const [keys,setKeys]=useState(new Set<string>())
  const [pending,setPending]=useState(new Set<string>())
  const [error,setError]=useState<string|null>(null)
  const inFlight=useRef(new Set<string>())
  useEffect(()=>{
    let active=true
    const refresh=()=>{void window.api.listLibrary({}).then(response=>{
      if(active)setKeys(new Set(response.items.map(item=>`${item.mediaItem.source}:${item.mediaItem.type}:${item.mediaItem.sourceId}`)))
    }).catch(()=>{if(active)setError('Could not read your library. Your saved titles will be checked when you add them.')})}
    refresh()
    window.addEventListener('watch-tracker-cloud-change',refresh)
    return()=>{active=false;window.removeEventListener('watch-tracker-cloud-change',refresh)}
  },[])
  async function add(media:NormalizedMedia):Promise<void> {
    const key=catalogueKey(media)
    if(inFlight.current.has(key)||keys.has(key))return
    inFlight.current.add(key);setPending(new Set(inFlight.current));setError(null)
    try {
      const result=await window.api.addToLibrary({media})
      if(!result.ok)throw new Error(result.error)
      setKeys(previous=>new Set(previous).add(key))
    } catch(reason) { setError(reason instanceof Error?reason.message:'Could not add this title. Please try again.') }
    finally {inFlight.current.delete(key);setPending(new Set(inFlight.current))}
  }
  return {keys,pending,error,add}
}
export function DiscoveryCards({items,library,compact=false}:{items:NormalizedMedia[];library:ReturnType<typeof useCatalogueLibrary>;compact?:boolean}):JSX.Element {
  const navigate=useNavigate()
  return <div className={`wt-discovery-grid${compact?' is-compact':''}`}>
    {items.map((media,index)=>{
      const key=catalogueKey(media), saved=library.keys.has(key), pending=library.pending.has(key)
      return <article className="wt-discovery-card wt-rise" key={key} style={{animationDelay:`${Math.min(index,10)*35}ms`}}>
        <button type="button" className="wt-discovery-cover" onClick={()=>navigate(`/media/${media.source}/${media.mediaType}/${media.externalId}`)} aria-label={`View ${media.title}`}>
          <Poster title={media.title} originalTitle={media.originalTitle} mediaType={media.mediaType} year={extractYear(media.releaseDate)} image={media.poster}/>
          {media.rating!==null&&<span className="wt-discovery-score"><Star size={11} fill="currentColor"/>{media.rating.toFixed(1)}<span className="sr-only"> out of 10, community rating</span></span>}
          <span className="wt-discovery-open" aria-hidden="true">Explore this story <span>↗</span></span>
        </button>
        <div className="wt-discovery-card-body">
          <span className="wt-discovery-meta">{mediaTypeLabel(media.mediaType)}<i/>{extractYear(media.releaseDate)||'Date to be announced'}</span>
          <button type="button" className="wt-discovery-title" onClick={()=>navigate(`/media/${media.source}/${media.mediaType}/${media.externalId}`)}>{media.title}</button>
          <span className="wt-discovery-genres">{media.genres.slice(0,2).join(' / ')||'A new story to discover'}</span>
          <button type="button" className={`wt-discovery-add${saved?' is-saved':''}`} disabled={saved||pending} onClick={()=>void library.add(media)} aria-label={`${saved?'In library':pending?'Adding':'Add to library'}: ${media.title}`}>
            {saved?<Check size={13}/>:<Plus size={13}/>} {saved?'In your library':pending?'Adding…':'Add to library'}
          </button>
        </div>
      </article>
    })}
  </div>
}
