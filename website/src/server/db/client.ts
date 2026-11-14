import type { SQLJsDatabase } from 'drizzle-orm/sql-js'
import type { schema } from './schema'
export type AppDatabase = SQLJsDatabase<typeof schema>
