import type { Env } from './cloud'

// Immutable bytes only, scoped to each storage binding and versioned object key.
// Each request still gets its own SQL connection. Never share a mutable database.
const caches=new WeakMap<object,Map<string,Uint8Array>>()
const MAX_BYTES=4*1024*1024
export async function libraryBytes(env:Env,key:string):Promise<Uint8Array> {
  let cache=caches.get(env.BUCKET)
  if(!cache){cache=new Map();caches.set(env.BUCKET,cache)}
  const cached=cache.get(key)
  if(cached){cache.delete(key);cache.set(key,cached);return cached.slice()}
  const object=await env.BUCKET.get(key)
  if(!object) throw new Error('Your library file is unavailable. Please try again; no data was replaced.')
  const bytes=new Uint8Array(await object.arrayBuffer())
  if(bytes.length<=MAX_BYTES){
    let used=[...cache.values()].reduce((total,item)=>total+item.length,0)
    while(cache.size&&used+bytes.length>MAX_BYTES){const first=cache.keys().next().value!;used-=cache.get(first)!.length;cache.delete(first)}
    cache.set(key,bytes.slice())
  }
  return bytes
}
export function forgetLibrary(env:Env,user:string):void {
  const cache=caches.get(env.BUCKET)
  if(cache)for(const key of cache.keys())if(key.startsWith(`libraries/${user}/`))cache.delete(key)
}
