import { getHead,userKey,saveSnapshot,ConflictError,type Env } from './cloud'
import { openLibrary } from './database'
import { execute } from './operations'
import { assets } from './generated/assets'
import { libraryBytes,forgetLibrary } from './libraryCache'
import { deleteCloudData,pruneStorage } from './housekeeping'
import { validPreferences } from './preferences'

const json=(data:unknown,status=200,revision?:number)=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(revision===undefined?{}:{'X-Library-Revision':String(revision)})}})
export async function handleRequest(request:Request,env:Env,context?:{waitUntil(task:Promise<unknown>):void}):Promise<Response> {
  const url=new URL(request.url)
  if(url.pathname==='/api/auth') {
    const user=request.headers.get('oai-authenticated-user-id')
    let name=request.headers.get('oai-authenticated-user-full-name')
    if(name && request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8') {try{name=decodeURIComponent(name)}catch{name=null}}
    return json({ok:true,data:{configured:true,authenticated:Boolean(user),username:user?(name || request.headers.get('oai-authenticated-user-email') || 'Your account'):null}})
  }
  if(url.pathname.startsWith('/api/')) {
    const identity=request.headers.get('oai-authenticated-user-id')
    if(!identity) return json({error:'Sign in to access your cloud library.'},401)
    if(!env.DB || !env.BUCKET) return json({error:'Cloud storage is not configured.'},503)
    const user=await userKey(identity)
    if(url.pathname==='/api/revision' && request.method==='GET') {
      const head=await getHead(env,user)
      const config=JSON.parse(head.config)
      return json({revision:head.revision,updatedAt:head.updated_at,deleted:!!config.deleted,preferences:config.preferences??{}})
    }
    if(url.pathname!=='/api/rpc' || request.method!=='POST') return json({error:'Not found'},404)
    if(request.headers.get('origin')!==url.origin || request.headers.get('sec-fetch-site')==='cross-site') return json({error:'Same-origin requests are required.'},403)
    if(!request.headers.get('content-type')?.includes('application/json')) return json({error:'JSON is required'},415)
    if(Number(request.headers.get('content-length')??0)>8*1024*1024) return json({error:'The upload is too large'},413)
    let library:Awaited<ReturnType<typeof openLibrary>>|undefined
    try {
      const text=await request.text()
      if(text.length>8*1024*1024) return json({error:'The upload is too large'},413)
      const body=JSON.parse(text)
      if(typeof body.channel!=='string' || body.channel.length>70) return json({error:'Invalid operation'},400)
      const head=await getHead(env,user)
      const config=JSON.parse(head.config)
      if(body.expectedRevision!==undefined&&(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision!==head.revision))throw new ConflictError('Your cloud library changed. Sync again before replacing it.')
      if(body.channel==='account:status')return json({result:{ok:true,data:{deleted:!!config.deleted,purged:!!config.purged}}},200,head.revision)
      if(body.channel==='account:delete'){
        if(body.request?.confirmation!=='DELETE MY CLOUD DATA')return json({error:'Type DELETE MY CLOUD DATA to confirm'},400)
        await deleteCloudData(env,head);forgetLibrary(env,user)
        return json({result:{ok:true,data:null}})
      }
      if(body.channel==='account:startFresh'){
        if(!config.deleted||!config.purged)return json({error:'Finish deleting the old library first'},400)
        const updated=await env.DB.prepare("UPDATE libraries SET config = '{}', revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?").bind(new Date().toISOString(),user,head.revision).run()
        if(!updated.meta.changes)throw new ConflictError('Your library changed. Try again.')
        return json({result:{ok:true,data:null}},200,head.revision+1)
      }
      if(config.deleted)return json({error:'Your cloud library was deleted. Start a new library on the website to resume.',deleted:true},410)
      if(body.channel==='preferences:get')return json({result:{ok:true,data:config.preferences??{}}},200,head.revision)
      if(body.channel==='preferences:set'){
        config.preferences={...config.preferences,...validPreferences(body.request)}
        const updated=await env.DB.prepare('UPDATE libraries SET config = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?').bind(JSON.stringify(config),new Date().toISOString(),user,head.revision).run()
        if(!updated.meta.changes)throw new ConflictError('Your preferences changed. Try again.')
        return json({result:{ok:true,data:config.preferences}},200,head.revision+1)
      }
      library=await openLibrary(head.object_key?await libraryBytes(env,head.object_key):undefined)
      const operation=await execute(env,head,library,body.channel,body.request)
      let revision=head.revision
      const failed=operation.result && typeof operation.result==='object' && 'ok' in operation.result && operation.result.ok===false
      if(library.isDirty() && !failed) {
        revision=await saveSnapshot(env,head,operation.replacement??library.sqlite.export(),operation.config)
        const cleanup=pruneStorage(env,user).catch(()=>console.warn('[storage] Cleanup will retry after the next saved change'))
        if(context)context.waitUntil(cleanup);else await cleanup
      }
      if(!failed) for(const callback of operation.afterCommit) await callback().catch(()=>undefined)
      return json({result:operation.result},200,revision)
    } catch(error) {
      if(error instanceof ConflictError) return json({error:error.message},409)
      return json({error:error instanceof Error?error.message:'The operation failed. Please try again.'},400)
    } finally { library?.close() }
  }
  const file=assets[url.pathname] ?? (url.pathname==='/' || !url.pathname.split('/').pop()?.includes('.') ? assets['/index.html']:undefined)
  if(!file) return new Response('Not found',{status:404})
  const bytes=Uint8Array.from(atob(file.body),c=>c.charCodeAt(0))
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':file.type,'Cache-Control':url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com"}})
}
export default {fetch:handleRequest}
