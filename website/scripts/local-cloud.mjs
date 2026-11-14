import initialize from 'sql.js/dist/sql-asm.js'
import fs from 'node:fs'
import path from 'node:path'

/** Local-only D1/R2 equivalents for integration checks and the portable preview. */
export async function localCloud(directory) {
  const SQL=await initialize()
  if(directory)fs.mkdirSync(path.join(directory,'objects'),{recursive:true})
  const file=directory&&path.join(directory,'cloud.sqlite')
  const sqlite=file&&fs.existsSync(file)?new SQL.Database(fs.readFileSync(file)):new SQL.Database()
  const migration=fs.readFileSync(new URL('../drizzle/0000_amazing_tombstone.sql',import.meta.url),'utf8')
  if(!sqlite.exec("SELECT name FROM sqlite_master WHERE name = 'libraries'").length)sqlite.run(migration)
  const persist=()=>{if(file)fs.writeFileSync(file,sqlite.export())}
  function statement(query,values=[]) {
    return {
      bind(...next){return statement(query,next)},
      async first(){const stmt=sqlite.prepare(query);try{stmt.bind(values);return stmt.step()?stmt.getAsObject():null}finally{stmt.free()}},
      async all(){const stmt=sqlite.prepare(query);const results=[];try{stmt.bind(values);while(stmt.step())results.push(stmt.getAsObject());return {results}}finally{stmt.free()}},
      runSync(){sqlite.run(query,values);return {meta:{changes:sqlite.getRowsModified()}}},
      async run(){const result=this.runSync();persist();return result}
    }
  }
  const objects=new Map()
  const uploads=new Map()
  const objectPath=key=>path.join(directory,'objects',encodeURIComponent(key))
  const BUCKET={
    async get(key){const bytes=directory?(fs.existsSync(objectPath(key))?fs.readFileSync(objectPath(key)):null):objects.get(key);if(!bytes)return null;return {async arrayBuffer(){return Uint8Array.from(bytes).buffer},async text(){return new TextDecoder().decode(bytes)}}},
    async put(key,value){const bytes=typeof value==='string'?new TextEncoder().encode(value):Uint8Array.from(value);if(directory)fs.writeFileSync(objectPath(key),bytes);else objects.set(key,bytes);uploads.set(key,new Date());return {}},
    async list({prefix,cursor,limit=1000}){const keys=(directory?fs.readdirSync(path.join(directory,'objects')).map(key=>decodeURIComponent(key)):[...objects.keys()]).filter(key=>key.startsWith(prefix)).sort();const start=cursor?keys.findIndex(key=>key>cursor):0;const page=start<0?[]:keys.slice(start,start+limit);return {objects:page.map(key=>({key,uploaded:directory?fs.statSync(objectPath(key)).mtime:uploads.get(key)??new Date()})),truncated:start>=0&&start+page.length<keys.length,cursor:page.at(-1)}},
    async delete(keys){for(const key of Array.isArray(keys)?keys:[keys]){if(directory){const target=objectPath(key);if(fs.existsSync(target))fs.unlinkSync(target)}else objects.delete(key)}}
  }
  const DB={prepare:statement,async batch(statements){sqlite.run('BEGIN');try{const result=statements.map(s=>s.runSync());sqlite.run('COMMIT');persist();return result}catch(error){sqlite.run('ROLLBACK');throw error}}}
  return {env:{DB,BUCKET},close:()=>sqlite.close(),sqlite,objects}
}
