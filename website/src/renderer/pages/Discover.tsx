import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Compass, Shuffle, TriangleAlert } from 'lucide-react'
import { PageTitle } from '@renderer/components/neon/PageTitle'
import { DiscoveryCards, catalogueKey, useCatalogueLibrary } from '@renderer/components/media/DiscoveryCards'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { ANIME_GENRES, DISCOVERY_GENRES, type DiscoverResponse, type DiscoveryMode } from '@shared/discovery'
import type { MediaType } from '@shared/metadata'

const modes: {id:DiscoveryMode;title:string;description:string}[]=[
  {id:'popular',title:'Popular now',description:'The stories everyone is finding.'},
  {id:'top-rated',title:'Top rated',description:'Community favourites worth your time.'},
  {id:'upcoming',title:'Coming soon',description:'Give your watchlist something to look forward to.'}
]
export function Discover():JSX.Element {
  const [params,setParams]=useSearchParams()
  const navigate=useNavigate()
  const type=(['movie','tv','anime'].includes(params.get('type')??'')?params.get('type'):'movie') as MediaType
  const mode=(modes.some(mode=>mode.id===params.get('mode'))?params.get('mode'):'popular') as DiscoveryMode
  const availableGenres=(type==='anime'?ANIME_GENRES:DISCOVERY_GENRES).filter(genre=>type!=='tv'||!['Horror','Romance','Thriller'].includes(genre))
  const genre=availableGenres.find(genre=>genre===params.get('genre'))??''
  const currentYear=new Date().getFullYear()
  const years=Array.from({length:currentYear-1900+6},(_,index)=>currentYear+5-index)
  const year=years.find(year=>String(year)===params.get('year'))
  const page=Math.max(1,Math.min(100,Math.trunc(Number(params.get('page')))||1))
  const [data,setData]=useState<DiscoverResponse|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [retry,setRetry]=useState(0)
  const [hideSaved,setHideSaved]=useState(false)
  const library=useCatalogueLibrary()
  useEffect(()=>{
    let active=true
    setLoading(true);setError(null);setData(null)
    void window.api.discoverMedia({mediaType:type,mode,genre:genre||undefined,year,page}).then(result=>{
      if(!active)return
      if(!result.ok)throw new Error(result.error)
      setData(result.data)
    }).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Could not load discoveries. Please try again.')}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[type,mode,genre,year,page,retry])
  function change(key:string,value:string):void {
    const next=new URLSearchParams(params)
    if(value)next.set(key,value);else next.delete(key)
    if(key!=='page')next.delete('page')
    if(key==='type')next.delete('genre')
    setParams(next)
  }
  const items=(data?.results??[]).filter(media=>!hideSaved||!library.keys.has(catalogueKey(media)))
  const selected=modes.find(item=>item.id===mode)!
  return <section className="wt-stack" style={{gap:25}}>
    <PageTitle number="09" jp="発見" title="Find your next favourite." subtitle="A whole world of films, series and anime. No search term needed."/>
    <div className="wt-discover-toolbar wt-panel">
      <div className="wt-discover-type" role="group" aria-label="Discover media type">
        {([['movie','Films'],['tv','Series'],['anime','Anime']] as const).map(([id,label])=><button key={id} type="button" className={`wt-pill${type===id?' is-on':''}`} aria-pressed={type===id} onClick={()=>change('type',id)}>{label}</button>)}
      </div>
      <div className="wt-discover-filters">
        <label>Genre<select className="wt-select" value={genre} onChange={event=>change('genre',event.target.value)}><option value="">All genres</option>{availableGenres.map(genre=><option key={genre}>{genre}</option>)}</select></label>
        <label>Release year<select className="wt-select" value={year??''} onChange={event=>change('year',event.target.value)}><option value="">Any year</option>{years.map(year=><option key={year}>{year}</option>)}</select></label>
        <button type="button" className="wt-ghost" disabled={!genre&&!year} onClick={()=>{const next=new URLSearchParams(params);next.delete('genre');next.delete('year');next.delete('page');setParams(next)}}>Reset filters</button>
      </div>
    </div>
    <div className="wt-discovery-modes" role="group" aria-label="Discovery sort order">
      {modes.map(item=><button key={item.id} type="button" className={mode===item.id?'is-on':''} aria-pressed={mode===item.id} onClick={()=>change('mode',item.id)}><span>{item.title}</span><small>{item.description}</small></button>)}
    </div>
    <div className="wt-discovery-heading"><div><span className="wt-label">YOUR NEXT CHAPTER</span><h2 className="wt-h3">{selected.title}{genre?` / ${genre}`:''}</h2></div><div className="wt-discovery-actions"><label><input type="checkbox" checked={hideSaved} onChange={event=>setHideSaved(event.target.checked)}/> Hide titles in my library</label><button type="button" className="wt-ghost" disabled={loading||items.length===0} onClick={()=>{const media=items[Math.floor(Math.random()*items.length)];navigate(`/media/${media.source}/${media.mediaType}/${media.externalId}`)}}><Shuffle size={14}/> Surprise me</button></div></div>
    {(error||library.error)&&<div className="wt-error" role="alert"><TriangleAlert size={16}/><span>{error||library.error}</span>{error&&<button type="button" className="wt-ghost" onClick={()=>setRetry(value=>value+1)}>Try again</button>}</div>}
    {loading?<div className="wt-discovery-grid" aria-label="Loading discoveries">{Array.from({length:10},(_,index)=><Skeleton key={index} className="h-80 rounded-2xl"/>)}</div>:<>
      {items.length>0?<DiscoveryCards items={items} library={library}/>:!error&&<div className="wt-panel wt-discovery-empty"><Compass size={32}/><h3>{data?.results.length?'You have these titles covered.':'No titles match these filters.'}</h3><p>{hideSaved&&data?.results.length?'Turn off “Hide titles in my library” or try the next page.':'Try a different genre, release year or catalogue.'}</p></div>}
      {data&&<div className="wt-discovery-pagination"><button type="button" className="wt-ghost" disabled={page===1} onClick={()=>change('page',String(page-1))}><ArrowLeft size={14}/> Previous</button><span>Page {page}</span><button type="button" className="wt-ghost" disabled={!data.hasNextPage} onClick={()=>change('page',String(page+1))}>Next <ArrowRight size={14}/></button></div>}
    </>}
    <p className="wt-discovery-attribution">Film and series discovery uses TMDB. Anime discovery uses AniList. Community scores are separate from your personal ratings.</p>
  </section>
}
