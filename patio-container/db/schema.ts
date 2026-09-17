import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const containers = sqliteTable('containers', {
 id: text('id').primaryKey(), code: text('code').notNull().unique(), owner: text('owner').notNull(),
 size: text('size').notNull(), cargo: text('cargo').notNull(), position: text('position'),
 status: text('status').notNull().default('waiting'), created: text('created').notNull(), updated: text('updated').notNull(), version: integer('version').notNull().default(0),
}, t => [uniqueIndex('containers_position_unique').on(t.position)]);
