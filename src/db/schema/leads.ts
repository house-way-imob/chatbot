import { randomUUID } from 'node:crypto'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const leads = pgTable('leads', {
  id: text().primaryKey().$defaultFn(() => randomUUID()),
  jid: text().notNull().unique(),
  nome: text(),
  address: text(),
  size: text(),
  serviceType: text(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
})
