import { useEffect, useState } from 'react'
import { ExternalLink, Globe2, Sparkles } from 'lucide-react'
import { WATCH_COUNTRIES, type TitleExtras } from '@shared/discovery'
import type { NormalizedMedia } from '@shared/metadata'
import { DiscoveryCards, useCatalogueLibrary } from './DiscoveryCards'

const groupNames={stream:'Included with a subscription',free:'Watch for free',ads:'Free with ads',rent:'Rent',buy:'Buy'}
function readCountry():string {try {const value=localStorage.getItem('watch-tracker-watch-country');return WATCH_COUNTRIES.some(([code])=>code===value)?value!:'MA'}catch{return 'MA'}}
export function TitleDiscovery({media}:{media:NormalizedMedia}):JSX.Element {
  const [country,setCountry]=useState(readCountry)
  const [data,setData]=useState<TitleExtras|null>(null)
  const [error,setError]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [retry,setRetry]=useState(0)
  const library=useCatalogueLibrary()
  useEffect(()=>{
    let active=true
    setLoading(true);setData(null);setError(null)
    void window.api.getTitleExtras({source:media.source,mediaType:media.mediaType,externalId:media.externalId,country}).then(result=>{
      if(!active)return
      if(!result.ok)throw new Error(result.error)
      setData(result.data)
    }).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Could not load recommendations and streaming information.')}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[media.source,media.mediaType,media.externalId,country,retry])
  function changeCountry(value:string):void {setCountry(value);try{localStorage.setItem('watch-tracker-watch-country',value)}catch{/* Keep working when browser storage is unavailable. */}}
  const availability=data?.availability
  return <div className="wt-stack" style={{gap:28}}>
    <section className="wt-panel wt-watch-providers" aria-labelledby="watch-providers-heading">
      <div className="wt-discovery-heading"><div><span className="wt-label"><Globe2 size={12}/> FIND YOUR SCREEN</span><h2 className="wt-h3" id="watch-providers-heading">Where to watch</h2></div>{media.mediaType!=='anime'&&<label className="wt-watch-country">Country<select className="wt-select" value={country} onChange={event=>changeCountry(event.target.value)}>{WATCH_COUNTRIES.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>}</div>
      {loading?<p className="wt-sub" role="status">Checking streaming information…</p>:error||data?.availabilityError?<p className="wt-sub" role="alert">{error||data?.availabilityError} <button type="button" className="wt-ghost" onClick={()=>setRetry(value=>value+1)}>Try again</button></p>:availability&&<>
        {availability.groups.map(group=><div className="wt-provider-group" key={group.type}><h3>{groupNames[group.type]}</h3><div className="wt-provider-list">{group.providers.map(provider=><span className="wt-provider" key={provider.id}>{provider.logo&&<img src={provider.logo} alt="" loading="lazy" onError={event=>{event.currentTarget.hidden=true}}/>}<span>{provider.name}</span></span>)}</div></div>)}
        {availability.animeLinks.length>0&&<div className="wt-provider-list">{availability.animeLinks.map(link=><a key={link.name} className="wt-provider" href={link.url} target="_blank" rel="noopener noreferrer">{link.name}<ExternalLink size={13}/></a>)}</div>}
        {availability.groups.length===0&&availability.animeLinks.length===0&&<p className="wt-sub">{media.mediaType==='anime'?'No streaming links are listed for this anime.':'No streaming, rental or purchase listings were found in this country. Try another country or check the provider directly.'}</p>}
        {availability.link&&<a className="wt-ghost wt-provider-link" href={availability.link} target="_blank" rel="noopener noreferrer">See viewing options on TMDB <ExternalLink size={13}/></a>}
        <p className="wt-discovery-attribution">{availability.note}{availability.attribution==='JustWatch'&&<> <a href="https://www.justwatch.com/" target="_blank" rel="noopener noreferrer">Powered by JustWatch.</a></>}</p>
      </>}
    </section>
    <section aria-labelledby="recommendations-heading" className="wt-stack" style={{gap:18}}>
      <div className="wt-discovery-heading"><div><span className="wt-label"><Sparkles size={12}/> KEEP EXPLORING</span><h2 className="wt-h3" id="recommendations-heading">More like this</h2></div><span className="wt-sub">{media.source==='tmdb'?'TMDB':'AniList'} community recommendations</span></div>
      {loading?<p className="wt-sub" role="status">Finding related stories…</p>:error||data?.recommendationError?<p className="wt-sub" role="alert">{error||data?.recommendationError} <button type="button" className="wt-ghost" onClick={()=>setRetry(value=>value+1)}>Try again</button></p>:data?.recommendations.length?<DiscoveryCards items={data.recommendations} library={library} compact/>:<p className="wt-sub">No recommendations are listed yet for this title. Explore Discover for more ideas.</p>}
      {library.error&&<p className="wt-error" role="alert">{library.error}</p>}
    </section>
  </div>
}
