import assert from 'node:assert/strict'
import { localCloud } from './local-cloud.mjs'

// Reproduce the production environment that previously failed with:
// Cannot read properties of undefined (reading 'href'). No location shim.
globalThis.WorkerGlobalScope=class WorkerGlobalScope {}
globalThis.self=globalThis
assert.equal(globalThis.location,undefined)
assert.equal(globalThis.document,undefined)

const {default:worker}=await import('../dist/server/index.js')
const cloud=await localCloud()
async function rpc(user,channel,request) {
  const response=await worker.fetch(new Request('https://watch.test/api/rpc',{
    method:'POST',headers:{origin:'https://watch.test','content-type':'application/json','oai-authenticated-user-id':user},
    body:JSON.stringify({channel,request})
  }),cloud.env)
  const body=await response.json()
  assert.equal(response.status,200,`${channel}: ${JSON.stringify(body)}`)
  return body.result
}
try {
  const status=await rpc('worker-user','app:getDatabaseStatus')
  assert.equal(status.ok,true)
  const empty=await rpc('worker-user','library:list',{})
  assert.deepEqual(empty.items,[])
  const media={externalId:'42',source:'anilist',mediaType:'anime',title:'Worker regression fixture',originalTitle:null,description:null,poster:null,backdrop:null,releaseDate:null,status:'finished',genres:[],rating:null,numberOfSeasons:1,numberOfEpisodes:12}
  assert.equal((await rpc('worker-user','library:add',{media})).ok,true)
  assert.equal((await rpc('worker-user','library:list',{})).items[0].mediaItem.title,media.title)
  assert.deepEqual((await rpc('other-worker-user','library:list',{})).items,[])
  const backup=await rpc('worker-user','backup:export')
  assert.equal(backup.ok,true)
  assert.equal(backup.data.data.libraryEntries.length,1)
  console.log('Production-like Worker checks passed: startup without self.location, saved library, account isolation, and backup export.')
} finally {cloud.close()}
