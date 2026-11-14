import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
export const libraries = sqliteTable('libraries',{userId:text('user_id').primaryKey(),objectKey:text('object_key'),revision:integer('revision').notNull().default(0),config:text('config').notNull().default('{}'),updatedAt:text('updated_at').notNull()})
export const snapshots = sqliteTable('snapshots',{id:text('id').primaryKey(),userId:text('user_id').notNull(),objectKey:text('object_key').notNull(),createdAt:text('created_at').notNull(),sizeBytes:integer('size_bytes').notNull()})
