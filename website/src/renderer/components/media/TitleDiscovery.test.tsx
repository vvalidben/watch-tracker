import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TitleDiscovery } from './TitleDiscovery'
import type { NormalizedMedia } from '@shared/metadata'
import type { TitleExtras } from '@shared/discovery'

const media:NormalizedMedia={source:'tmdb',mediaType:'movie',externalId:'12',title:'A story',originalTitle:null,poster:null,backdrop:null,description:null,releaseDate:null,status:null,genres:[],rating:null,numberOfSeasons:null,numberOfEpisodes:null}
const empty:TitleExtras={recommendations:[],recommendationError:null,availabilityError:null,availability:{country:'MA',groups:[],link:null,attribution:'JustWatch',animeLinks:[],note:'Availability data from JustWatch via TMDB.'}}
const extras=vi.fn()
beforeEach(()=>{
  localStorage.clear()
  extras.mockReset().mockResolvedValue({ok:true,data:empty})
  window.api={...window.api,getTitleExtras:extras,listLibrary:vi.fn().mockResolvedValue({items:[]})}
})
function show():void {render(<MemoryRouter><TitleDiscovery media={media}/></MemoryRouter>)}
describe('title discovery sections',()=>{
  it('shows an honest empty regional result with JustWatch attribution',async()=>{
    show()
    expect(await screen.findByText(/No streaming, rental or purchase listings/)).toBeInTheDocument()
    expect(screen.getByRole('link',{name:'Powered by JustWatch.'})).toHaveAttribute('href','https://www.justwatch.com/')
    expect(screen.getByText(/No recommendations are listed yet/)).toBeInTheDocument()
  })
  it('persists country changes and ignores an earlier country request arriving late',async()=>{
    let finishOld!:(value:unknown)=>void
    extras.mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve}))
    show()
    await waitFor(()=>expect(extras).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByRole('combobox',{name:'Country'}),{target:{value:'US'}})
    await waitFor(()=>expect(extras).toHaveBeenLastCalledWith(expect.objectContaining({country:'US'})))
    await screen.findByText(/No streaming, rental or purchase listings/)
    expect(localStorage.getItem('watch-tracker-watch-country')).toBe('US')
    await act(async()=>finishOld({ok:true,data:{...empty,availability:{...empty.availability,groups:[{type:'stream',providers:[{id:'old',name:'Stale country result',logo:null}]}]}}}))
    expect(screen.queryByText('Stale country result')).not.toBeInTheDocument()
  })
  it('keeps streaming listings visible when only recommendations fail',async()=>{
    extras.mockResolvedValue({ok:true,data:{...empty,recommendationError:'Recommendations temporarily unavailable',availability:{...empty.availability,groups:[{type:'stream',providers:[{id:'8',name:'Netflix',logo:null}]}]}}})
    show()
    expect(await screen.findByText('Netflix')).toBeInTheDocument()
    expect(screen.getByText('Included with a subscription')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Recommendations temporarily unavailable')
    expect(screen.getByRole('button',{name:'Try again'})).toBeInTheDocument()
  })
})
