import { randomUUID } from 'node:crypto'
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const photographers = pgTable('photographers', {
  id: text().primaryKey().$defaultFn(() => randomUUID()),
  name: text().notNull(),
  phone: text().notNull().unique(),
  email: text(),
  active: boolean().notNull().default(true),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
})
