import fs from 'node:fs'
import { createHash } from 'node:crypto'
fs.mkdirSync('src/server/generated',{recursive:true})
const journal=JSON.parse(fs.readFileSync('src/server/migrations/meta/_journal.json','utf8'))
const migrations=journal.entries.map(entry=>{
  const sql=fs.readFileSync(`src/server/migrations/${entry.tag}.sql`,'utf8')
  return {when:entry.when,hash:createHash('sha256').update(sql).digest('hex'),sql}
})
fs.writeFileSync('src/server/generated/migrations.ts',`export const migrations = ${JSON.stringify(migrations)}\n`)
if(!fs.existsSync('src/server/generated/assets.ts')) fs.writeFileSync('src/server/generated/assets.ts',"export const assets: Record<string,{type:string;body:string}> = {}\n")
