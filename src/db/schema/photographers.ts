import { randomUUIDv7 } from 'bun'
import { relations } from 'drizzle-orm'
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { appointments } from './appointments'

export const photographers = pgTable('photographers', {
  id: text()
    .primaryKey()
    .$defaultFn(() => randomUUIDv7()),
  name: text().notNull(),
  phone: text().notNull().unique(),
  email: text(),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
})

export const photographersRelations = relations(photographers, ({ many }) => ({
  appointments: many(appointments),
}))
