import { registered } from './ipc/authenticatedIpc'
import { registerLibraryIpc } from './ipc/library'
import { registerMetadataIpc } from './ipc/metadata'
import { registerDashboardIpc } from './ipc/dashboard'
import { registerStatisticsIpc } from './ipc/statistics'
import { registerWatchLogIpc } from './ipc/watchLog'
import { registerTagsIpc } from './ipc/tags'
import { createMetadataService } from './metadata'
import { discoverMedia, getTitleExtras } from './metadata/discovery'
import { withLocalMetadata } from './metadata/localMetadata'
import { listUpcomingEpisodes } from './library/upcoming'
import { refreshMetadata } from './library/refreshMetadata'
import { startRewatch, logWatch, editWatchDate } from './library/rewatch'
import { previewCsvImport, applyCsvImport } from './library/csvImport'
import { buildBackupFile } from './backup/exportBackup'
import { parseBackupFile } from '@shared/backup'
import { CSV_TEMPLATE } from '@shared/csvImport'
import { openLibrary,validateDatabase } from './database'
import { episodeProgress,episodes,libraryEntries,mediaItems,mediaTags,seasonRatings,seasons,tags,watchEvents } from './db/schema'
import type { Env,LibraryHead } from './cloud'

export async function execute(env:Env,head:LibraryHead,library:Awaited<ReturnType<typeof openLibrary>>,channel:string,request:any) {
  const repositories=library.repositories
  const config=JSON.parse(head.config) as {tmdbApiKey?:string|null}
  const service=withLocalMetadata(createMetadataService(config.tmdbApiKey || env.TMDB_API_KEY),repositories)
  const ok=(data:unknown)=>({ok:true,data})
  const afterCommit:(()=>Promise<unknown>)[]=[]
  let replacement:Uint8Array|undefined
  let result:unknown
  switch(channel) {
    case 'metadata:discover': result=ok(await discoverMedia(request,config.tmdbApiKey || env.TMDB_API_KEY));break
    case 'metadata:extras': result=ok(await getTitleExtras(request,config.tmdbApiKey || env.TMDB_API_KEY));break
    case 'app:get-version': result='1.0.0 Web';break
    case 'app:getDatabaseStatus': result={ok:true,recoveredFromCorruption:false,corruptedFilePath:null,error:null,dbPath:'Your private cloud library'};break
    case 'app:getConfig': result={tmdbApiKey:null,tmdbConfiguredViaEnv:Boolean(config.tmdbApiKey || env.TMDB_API_KEY),defaultBackupDirectory:'Browser downloads'};break
    case 'app:setTmdbApiKey': {
      if(request?.apiKey!==null && typeof request?.apiKey!=='string') throw new Error('Enter a valid TMDB key')
      config.tmdbApiKey=request.apiKey?.trim()||null
      if(config.tmdbApiKey && config.tmdbApiKey.length>512) throw new Error('The TMDB key is too long')
      library.markDirty();result=ok(null);break
    }
    case 'app:getDatabaseInfo': result={filePath:'Private cloud library',fileSizeBytes:library.sqlite.export().length,mediaItemCount:(await repositories.mediaItems.list()).length,libraryEntryCount:(await repositories.libraryEntries.list()).length};break
    case 'library:upcoming': result=ok(await listUpcomingEpisodes(repositories));break
    case 'library:refreshMetadata': result=ok(await refreshMetadata(repositories,service,request));break
    case 'library:startRewatch': await startRewatch(repositories,request);result=ok(null);break
    case 'library:logWatch': await logWatch(repositories,service,request);result=ok(null);break
    case 'library:editWatchDate': await editWatchDate(repositories,request);result=ok(null);break
    case 'library:csvTemplate': result=ok(CSV_TEMPLATE);break
    case 'library:previewCsv': {
      if(typeof request?.contents!=='string' || request.contents.length>5*1024*1024) throw new Error('Choose a CSV smaller than 5 MB')
      const pending=await previewCsvImport(repositories,request.contents,String(request.fileName??'library.csv').slice(0,150))
      await env.BUCKET.put(`previews/${head.user_id}/${pending.preview.token}.json`,JSON.stringify({...pending,createdAt:Date.now()}))
      result=ok(pending.preview);break
    }
    case 'library:applyCsv': {
      if(!/^[a-f0-9-]{36}$/.test(request?.token??'')) throw new Error('Preview the CSV again')
      const key=`previews/${head.user_id}/${request.token}.json`
      const object=await env.BUCKET.get(key)
      if(!object) throw new Error('Choose and preview the CSV again')
      const pending=JSON.parse(await object.text())
      if(Date.now()-pending.createdAt>3600000) throw new Error('The preview expired. Choose the CSV again.')
      result=ok(await applyCsvImport(repositories,pending.preview,pending.fields,request.mode))
      afterCommit.push(()=>env.BUCKET.delete(key));break
    }
    case 'backup:export': result=ok(await buildBackupFile(library.db,'1.0.0-web'));break
    case 'backup:import': {
      const parsed=parseBackupFile(request?.backup)
      if(!parsed.ok) throw new Error(parsed.error)
      const restored=await openLibrary()
      try {
        const data=parsed.backup.data
        for(const [table,rows] of [[mediaItems,data.mediaItems],[tags,data.tags],[seasons,data.seasons],[libraryEntries,data.libraryEntries],[episodes,data.episodes],[seasonRatings,data.seasonRatings],[episodeProgress,data.episodeProgress],[watchEvents,data.watchEvents],[mediaTags,data.mediaTags]] as const) {
          for(let offset=0;offset<rows.length;offset+=100) await restored.db.insert(table as any).values(rows.slice(offset,offset+100) as any)
        }
        validateDatabase(restored.sqlite);replacement=restored.sqlite.export()
      } finally { restored.close() }
      library.markDirty();result=ok({cancelled:false,restarting:true,exportedAt:parsed.backup.exportedAt});break
    }
    case 'backup:listAutomatic': {
      const records=await env.DB.prepare('SELECT id,created_at,size_bytes FROM snapshots WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 10 OFFSET 1').bind(head.user_id).all<{id:string;created_at:string;size_bytes:number}>()
      result=ok({directory:'Private cloud safety snapshots',backups:records.results.map(row=>({name:row.id,createdAt:row.created_at,sizeBytes:row.size_bytes}))});break
    }
    case 'backup:restoreAutomatic': {
      const snapshot=await env.DB.prepare('SELECT object_key,created_at FROM snapshots WHERE id = ? AND user_id = ?').bind(request,head.user_id).first<{object_key:string;created_at:string}>()
      if(!snapshot) throw new Error('Snapshot not found in your account')
      const object=await env.BUCKET.get(snapshot.object_key)
      if(!object) throw new Error('The snapshot file is unavailable')
      const restored=await openLibrary(new Uint8Array(await object.arrayBuffer()))
      try { validateDatabase(restored.sqlite);replacement=restored.sqlite.export() } finally { restored.close() }
      library.markDirty();result=ok({cancelled:false,restarting:true,exportedAt:snapshot.created_at});break
    }
    default: result=await registered(()=>{
      registerLibraryIpc(repositories,service);registerMetadataIpc(service,repositories);registerDashboardIpc(repositories);registerStatisticsIpc(repositories);registerWatchLogIpc(repositories);registerTagsIpc(repositories)
    },channel,request)
  }
  return {result,config:JSON.stringify(config),replacement,afterCommit}
}
