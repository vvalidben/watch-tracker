import { afterEach,beforeEach,describe,expect,it } from 'vitest'
import { handleRequest } from '../src/server/worker'
import { localCloud } from '../scripts/local-cloud.mjs'
import { getHead,saveSnapshot,userKey,ConflictError,type Env } from '../src/server/cloud'

let cloud:Awaited<ReturnType<typeof localCloud>>
let env:Env
beforeEach(async()=>{cloud=await localCloud();env=cloud.env as unknown as Env})
afterEach(()=>cloud.close())
const media={externalId:'42',source:'anilist',mediaType:'anime',title:'Test series',originalTitle:null,description:'Integration fixture',poster:null,backdrop:null,releaseDate:'2025-01-01',status:'finished',genres:[],rating:null,numberOfSeasons:1,numberOfEpisodes:12}
async function rpc(user:string,channel:string,request?:unknown){
  const response=await handleRequest(new Request('https://watch.test/api/rpc',{method:'POST',headers:{origin:'https://watch.test','content-type':'application/json','oai-authenticated-user-id':user},body:JSON.stringify({channel,request})}),env)
  return {status:response.status,body:await response.json() as any,revision:response.headers.get('X-Library-Revision')}
}
describe('cloud website',()=>{
  it('requires identity and rejects cross-origin writes',async()=>{
    const anonymous=await handleRequest(new Request('https://watch.test/api/rpc',{method:'POST'}),env)
    expect(anonymous.status).toBe(401)
    const cross=await handleRequest(new Request('https://watch.test/api/rpc',{method:'POST',headers:{origin:'https://other.test','oai-authenticated-user-id':'a'}}),env)
    expect(cross.status).toBe(403)
  })
  it('keeps accounts isolated and persists across independent requests',async()=>{
    expect((await rpc('a','library:add',{media})).body.result.ok).toBe(true)
    expect((await rpc('a','library:list',{})).body.result.items).toHaveLength(1)
    expect((await rpc('b','library:list',{})).body.result.items).toHaveLength(0)
    const state=await rpc('a','library:getState',{source:'anilist',mediaType:'anime',externalId:'42'})
    expect(state.body.result.libraryEntry.watchStatus).toBe('plan_to_watch')
  })
  it('saves ratings and favourites and exports a desktop-compatible backup',async()=>{
    await rpc('a','library:add',{media})
    await rpc('a','library:rateMedia',{media,rating:8.5})
    await rpc('a','library:setFavorite',{media,favorite:true})
    const exported=await rpc('a','backup:export')
    expect(exported.body.result.data.formatVersion).toBe(2)
    expect(exported.body.result.data.data.libraryEntries[0]).toMatchObject({rating:8.5,favorite:true})
    const imported=await rpc('b','backup:import',{backup:exported.body.result.data})
    expect(imported.body.result.ok).toBe(true)
    expect((await rpc('b','library:list',{})).body.result.items[0].libraryEntry.rating).toBe(8.5)
  })
  it('does not replace a library when an imported backup is invalid',async()=>{
    await rpc('a','library:add',{media})
    const invalid=await rpc('a','backup:import',{backup:{formatVersion:999}})
    expect(invalid.status).toBe(400)
    expect((await rpc('a','library:list',{})).body.result.items).toHaveLength(1)
  })
  it('prevents another device from overwriting a newer revision',async()=>{
    const key=await userKey('a')
    const old=await getHead(env,key)
    await saveSnapshot(env,old,new Uint8Array([1]),'{}')
    await expect(saveSnapshot(env,old,new Uint8Array([2]),'{}')).rejects.toBeInstanceOf(ConflictError)
    const newest=await getHead(env,key)
    expect(newest.revision).toBe(1)
    expect(new Uint8Array(await (await env.BUCKET.get(newest.object_key!))!.arrayBuffer())).toEqual(new Uint8Array([1]))
  })
  it('owns CSV previews on the server and rejects another account’s token',async()=>{
    const preview=await rpc('a','library:previewCsv',{contents:'title,source,media_type,external_id\nFixture,anilist,anime,77',fileName:'fixture.csv'})
    expect(preview.body.result.ok).toBe(true)
    const token=preview.body.result.data.token
    expect((await rpc('b','library:applyCsv',{token,mode:'skip'})).status).toBe(400)
  })
  it('restores only snapshots belonging to the signed-in account',async()=>{
    await rpc('a','library:add',{media})
    await rpc('a','library:setFavorite',{media,favorite:true})
    const snapshots=(await rpc('a','backup:listAutomatic')).body.result.data.backups
    expect(snapshots.length).toBeGreaterThan(0)
    expect((await rpc('b','backup:restoreAutomatic',snapshots[0].name)).status).toBe(400)
    expect((await rpc('a','backup:restoreAutomatic',snapshots[0].name)).body.result.ok).toBe(true)
    expect((await rpc('a','library:list',{})).body.result.items[0].libraryEntry.favorite).toBe(false)
  })
})
