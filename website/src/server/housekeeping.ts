import { ConflictError, type Env, type LibraryHead } from './cloud'

export const SNAPSHOT_LIMIT = 11 // Current version plus ten recovery points.

export async function objectsUnder(env:Env,prefix:string) {
  const objects:{key:string;uploaded:Date}[]=[]
  let cursor:string|undefined
  do {
    const page=await env.BUCKET.list({prefix,cursor,limit:1000})
    objects.push(...page.objects)
    cursor=page.truncated?page.cursor:undefined
  } while(cursor)
  return objects
}

export async function pruneStorage(env:Env,user:string,now=Date.now()):Promise<void> {
  // All keys come from this account's records/prefix; never prune the live head.
  const old=await env.DB.prepare('SELECT id,object_key FROM snapshots WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1000 OFFSET ?').bind(user,SNAPSHOT_LIMIT).all<{id:string;object_key:string}>()
  for(const row of old.results) {
    const removed=await env.DB.prepare('DELETE FROM snapshots WHERE id = ? AND user_id = ? AND object_key NOT IN (SELECT object_key FROM libraries WHERE user_id = ? AND object_key IS NOT NULL)').bind(row.id,user,user).run()
    if(removed.meta.changes) await env.BUCKET.delete(row.object_key)
  }
  const previews=await objectsUnder(env,`previews/${user}/`)
  const expired=previews.filter(object=>now-new Date(object.uploaded).getTime()>60*60*1000).map(object=>object.key)
  if(expired.length) await env.BUCKET.delete(expired)
  // Interrupted writes can leave unreferenced files. A day's grace protects in-flight saves.
  const referenced=await env.DB.prepare('SELECT object_key FROM snapshots WHERE user_id = ? UNION SELECT object_key FROM libraries WHERE user_id = ?').bind(user,user).all<{object_key:string|null}>()
  const keep=new Set(referenced.results.map(row=>row.object_key))
  const orphans=(await objectsUnder(env,`libraries/${user}/`)).filter(object=>!keep.has(object.key)&&now-new Date(object.uploaded).getTime()>86400000)
  if(orphans.length) await env.BUCKET.delete(orphans.map(object=>object.key))
}

export async function deleteCloudData(env:Env,head:LibraryHead):Promise<void> {
  const config=JSON.parse(head.config)
  if(!config.deleted) {
    const updated=await env.DB.prepare("UPDATE libraries SET object_key = NULL, config = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?").bind('{"deleted":true}',new Date().toISOString(),head.user_id,head.revision).run()
    if(!updated.meta.changes) throw new ConflictError('Your library changed. Review it before deleting.')
  }
  // The tombstone blocks writes and stale desktop uploads throughout and after deletion.
  for(const prefix of [`libraries/${head.user_id}/`,`previews/${head.user_id}/`]) {
    const objects=await objectsUnder(env,prefix)
    for(let offset=0;offset<objects.length;offset+=100) await env.BUCKET.delete(objects.slice(offset,offset+100).map(object=>object.key))
  }
  await env.DB.prepare('DELETE FROM snapshots WHERE user_id = ?').bind(head.user_id).run()
  await env.DB.prepare('UPDATE libraries SET config = ? WHERE user_id = ? AND object_key IS NULL').bind('{"deleted":true,"purged":true}',head.user_id).run()
}
