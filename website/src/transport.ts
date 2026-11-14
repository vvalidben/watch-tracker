type SyncState='saving'|'saved'|'offline'|'error'
let revision:number|null=null
let syncState:SyncState='saved'
export function getSyncState():SyncState{return syncState}
export function reportSync(state:SyncState):void { syncState=state;window.dispatchEvent(new CustomEvent('watch-tracker-sync',{detail:state})) }
let requests:Promise<unknown>=Promise.resolve()
function send(channel:string,request?:unknown):Promise<any> {
  const response=requests.then(()=>performSend(channel,request))
  requests=response.catch(()=>undefined)
  return response
}
async function performSend(channel:string,request?:unknown):Promise<any> {
  const mutation=!/^(library:(list|get|upcoming|csvTemplate)|metadata:|dashboard:|statistics:|watchLog:|tags:list|app:get|preferences:get|account:status|backup:(export|listAutomatic))/.test(channel)
  if(mutation)reportSync('saving')
  try {
    for(let attempt=0;attempt<3;attempt++) {
      const response=await fetch('/api/rpc',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel,request})})
      if(response.status===409 && attempt<2) continue
      const payload=await response.json()
      if(!response.ok) throw new Error(payload.error || 'The cloud request failed')
      const current=response.headers.get('X-Library-Revision')
      if(current!==null) revision=Number(current)
      if(mutation)reportSync(payload.result?.ok===false?'error':'saved')
      return payload.result
    }
  } catch(error) { reportSync(navigator.onLine?'error':'offline');throw error }
}
// Used by web-only settings. File import/export stays behind rpc's browser adapter.
export const cloudCall=send
function chooseFile(accept:string):Promise<File|null> {
  return new Promise(resolve=>{
    const input=document.createElement('input');input.type='file';input.accept=accept
    input.addEventListener('change',()=>resolve(input.files?.[0]??null),{once:true})
    input.addEventListener('cancel',()=>resolve(null),{once:true})
    input.click()
  })
}
function download(name:string,contents:string,type:string):void {
  const url=URL.createObjectURL(new Blob([contents],{type}));const link=document.createElement('a')
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000)
}
export async function pollCloud():Promise<void> {
  if(document.hidden) return
  try {
    const response=await fetch('/api/revision',{credentials:'same-origin',cache:'no-store'})
    if(!response.ok) {reportSync('error');return}
    const data=await response.json()
    if(revision!==null && data.revision!==revision) window.dispatchEvent(new Event('watch-tracker-cloud-change'))
    revision=data.revision
    if(data.preferences)window.dispatchEvent(new CustomEvent('watch-tracker-preferences-remote',{detail:data.preferences}))
    if(data.deleted)window.dispatchEvent(new Event('watch-tracker-account-deleted'))
    if(syncState==='offline')reportSync('saved')
  } catch { reportSync('offline') }
}
export async function rpc(channel:string,request?:any):Promise<any> {
  if(channel==='auth:status') return (await fetch('/api/auth',{credentials:'same-origin',cache:'no-store'})).json()
  if(channel==='auth:logout') { window.location.assign('/signout-with-chatgpt?return_to=%2F');return {ok:true,data:{configured:true,authenticated:false,username:null}} }
  if(channel.startsWith('auth:')) return {ok:false,error:'Your online account is managed through Sign in with ChatGPT.'}
  if(channel==='app:quit') { window.location.reload();return }
  try {
    if(channel==='library:csvTemplate') {
      const result=await send(channel)
      if(result.ok) download('watch-tracker-template.csv',result.data,'text/csv')
      return result.ok?{ok:true,data:'watch-tracker-template.csv'}:result
    }
    if(channel==='library:previewCsv') {
      const file=await chooseFile('.csv,text/csv')
      if(!file) return {ok:true,data:null}
      if(file.size>5*1024*1024) return {ok:false,error:'Choose a CSV smaller than 5 MB'}
      return send(channel,{contents:await file.text(),fileName:file.name})
    }
    if(channel==='backup:export') {
      const result=await send(channel)
      const name=`watch-tracker-backup-${new Date().toISOString().slice(0,10)}.json`
      if(result.ok) download(name,JSON.stringify(result.data,null,2),'application/json')
      return result.ok?{ok:true,data:{cancelled:false,filePath:name}}:result
    }
    if(channel==='backup:import') {
      const file=await chooseFile('.json,application/json')
      if(!file) return {ok:true,data:{cancelled:true,restarting:false,exportedAt:null}}
      if(file.size>7*1024*1024) return {ok:false,error:'Choose a JSON backup smaller than 7 MB'}
      if(!window.confirm('Replace your online library with this backup? A cloud safety snapshot is kept before the change.')) return {ok:true,data:{cancelled:true,restarting:false,exportedAt:null}}
      const result=await send(channel,{backup:JSON.parse(await file.text())})
      if(result.ok) setTimeout(()=>window.location.reload(),500)
      return result
    }
    if(channel==='backup:restoreAutomatic' && !window.confirm('Restore this cloud snapshot and replace your current library?')) return {ok:true,data:{cancelled:true,restarting:false,exportedAt:null}}
    const result=await send(channel,request)
    if(channel==='backup:restoreAutomatic' && result.ok) setTimeout(()=>window.location.reload(),500)
    return result
  } catch(error) {
    const message=error instanceof Error?error.message:'The request failed. Try again when you have a connection.'
    if(/^(library:(add|remove|set|rate|start|log|edit|refresh|apply|preview)|tags:(attach|detach)|backup:|app:set)/.test(channel)) return {ok:false,error:message}
    throw error
  }
}
