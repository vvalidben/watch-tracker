import initialize from 'sql.js/dist/sql-asm.js'
import { drizzle } from 'drizzle-orm/sql-js'
import { schema } from './db/schema'
import { createRepositories } from './db/repositories'
import { migrations } from './generated/migrations'
import type { Database } from 'sql.js'
export async function openLibrary(bytes?:Uint8Array) {
  const SQL = await initialize()
  const sqlite = bytes ? new SQL.Database(bytes) : new SQL.Database()
  try {
    sqlite.run('PRAGMA foreign_keys = ON')
    sqlite.run('CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at NUMERIC)')
    const last = Number(sqlite.exec('SELECT MAX(created_at) FROM __drizzle_migrations')[0]?.values[0]?.[0] ?? 0)
    let dirty = !bytes
    for (const migration of migrations) {
      if (migration.when <= last) continue
      sqlite.run('BEGIN')
      try {
        for (const statement of migration.sql.split('--> statement-breakpoint')) if (statement.trim()) sqlite.run(statement)
        sqlite.run('INSERT INTO __drizzle_migrations (hash,created_at) VALUES (?,?)',[migration.hash,migration.when])
        sqlite.run('COMMIT'); dirty = true
      } catch (error) { sqlite.run('ROLLBACK'); throw error }
    }
    const db = drizzle(sqlite,{schema})
    const repositories = createRepositories({db,persist:()=>{dirty=true}})
    return {sqlite,db,repositories,isDirty:()=>dirty,markDirty:()=>{dirty=true},close:()=>sqlite.close()}
  } catch (error) { sqlite.close(); throw error }
}
export function validateDatabase(sqlite:Database):void {
  const rows = sqlite.exec('PRAGMA quick_check')[0]?.values
  if (rows?.length !== 1 || rows[0][0] !== 'ok') throw new Error('The backup database is not valid')
  if (sqlite.exec('PRAGMA foreign_key_check').some(r=>r.values.length)) throw new Error('The backup has invalid references')
}
