import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Discover } from './Discover'
import type { NormalizedMedia } from '@shared/metadata'

const media:NormalizedMedia={source:'tmdb',mediaType:'movie',externalId:'12',title:'A new story',originalTitle:null,poster:null,backdrop:null,description:null,releaseDate:'2024-01-01',status:'finished',genres:['Action'],rating:8.2,numberOfSeasons:null,numberOfEpisodes:null}
const discover=vi.fn(),add=vi.fn()
function show():void {render(<MemoryRouter initialEntries={['/discover']}><Routes><Route path="/discover" element={<Discover/>}/><Route path="/media/:source/:mediaType/:id" element={<p>Title detail</p>}/></Routes></MemoryRouter>)}
beforeEach(()=>{
  discover.mockReset().mockResolvedValue({ok:true,data:{results:[media],page:1,hasNextPage:true}})
  add.mockReset().mockResolvedValue({ok:true,data:{}})
  window.api={...window.api,discoverMedia:discover,listLibrary:vi.fn().mockResolvedValue({items:[]}),addToLibrary:add}
})
describe('Discover screen',()=>{
  it('browses without a query, applies catalogue filters and resets paging',async()=>{
    show();expect(await screen.findByRole('button',{name:'View A new story'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:/^Next/}))
    await waitFor(()=>expect(discover).toHaveBeenLastCalledWith(expect.objectContaining({page:2})))
    fireEvent.change(screen.getByRole('combobox',{name:'Genre'}),{target:{value:'Action'}})
    await waitFor(()=>expect(discover).toHaveBeenLastCalledWith(expect.objectContaining({genre:'Action',page:1})))
    fireEvent.click(screen.getByRole('button',{name:'Anime',exact:true}))
    await waitFor(()=>expect(discover).toHaveBeenLastCalledWith(expect.objectContaining({mediaType:'anime',genre:undefined,page:1})))
  })
  it('saves a discovery, labels it and can hide saved titles',async()=>{
    show();fireEvent.click(await screen.findByRole('button',{name:'Add to library: A new story'}))
    expect(await screen.findByRole('button',{name:'In library: A new story'})).toBeDisabled()
    expect(add).toHaveBeenCalledWith({media})
    fireEvent.click(screen.getByRole('checkbox',{name:'Hide titles in my library'}))
    expect(screen.queryByRole('button',{name:'View A new story'})).not.toBeInTheDocument()
    expect(screen.getByRole('heading',{name:'You have these titles covered.'})).toBeInTheDocument()
  })
  it('reports provider failure and retries rather than presenting an empty catalogue',async()=>{
    discover.mockRejectedValueOnce(new Error('Could not reach the network'))
    show();expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the network')
    fireEvent.click(screen.getByRole('button',{name:'Try again'}))
    expect(await screen.findByRole('button',{name:'View A new story'})).toBeInTheDocument()
  })
  it('opens a real result with Surprise me',async()=>{
    show();await screen.findByRole('button',{name:'View A new story'})
    fireEvent.click(screen.getByRole('button',{name:'Surprise me'}))
    expect(await screen.findByText('Title detail')).toBeInTheDocument()
  })
})
