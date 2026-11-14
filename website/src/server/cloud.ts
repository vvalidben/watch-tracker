export interface Statement {
  bind(...values: unknown[]): Statement
  first<T>(): Promise<T | null>
  all<T>(): Promise<{results: T[]}>
  run(): Promise<{meta:{changes:number}}>
}
export interface CloudDatabase { prepare(query:string): Statement; batch(statements:Statement[]):Promise<{meta:{changes:number}}[]> }
export interface Bucket { get(key:string):Promise<{arrayBuffer():Promise<ArrayBuffer>;text():Promise<string>} | null>; put(key:string,value:Uint8Array|string):Promise<unknown>; delete(key:string|string[]):Promise<void>; list(options:{prefix:string;cursor?:string;limit?:number}):Promise<{objects:{key:string;uploaded:Date}[];truncated:boolean;cursor?:string}> }
export interface Env { DB:CloudDatabase; BUCKET:Bucket; TMDB_API_KEY?:string }
export interface LibraryHead { user_id:string; object_key:string|null; revision:number; config:string; updated_at:string }
export class ConflictError extends Error {}
export async function userKey(userId:string):Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(userId)))
  return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')
}
export async function getHead(env:Env,user:string):Promise<LibraryHead> {
  let head = await env.DB.prepare('SELECT * FROM libraries WHERE user_id = ?').bind(user).first<LibraryHead>()
  if (!head) {
    await env.DB.prepare('INSERT INTO libraries (user_id, updated_at) VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING').bind(user,new Date().toISOString()).run()
    head = await env.DB.prepare('SELECT * FROM libraries WHERE user_id = ?').bind(user).first<LibraryHead>()
  }
  if (!head) throw new Error('Your cloud library could not be opened')
  return head
}
export async function saveSnapshot(env:Env,head:LibraryHead,bytes:Uint8Array,config:string):Promise<number> {
  if (bytes.length > 20*1024*1024) throw new Error('The cloud library exceeds the 20 MB limit. Export a backup before reducing its size.')
  const id = crypto.randomUUID()
  const key = `libraries/${head.user_id}/${id}.sqlite`
  const created = new Date().toISOString()
  await env.BUCKET.put(key,bytes)
  const results = await env.DB.batch([
    env.DB.prepare('UPDATE libraries SET object_key = ?, revision = revision + 1, config = ?, updated_at = ? WHERE user_id = ? AND revision = ?').bind(key,config,created,head.user_id,head.revision),
    env.DB.prepare('INSERT INTO snapshots (id,user_id,object_key,created_at,size_bytes) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM libraries WHERE user_id = ? AND object_key = ?)').bind(id,head.user_id,key,created,bytes.length,head.user_id,key)
  ])
  if (results[0].meta.changes !== 1) {
    await env.BUCKET.delete(key)
    throw new ConflictError('Your library changed on another device. Retry the action.')
  }
  return head.revision+1
}
