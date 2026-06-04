import { randomUUIDv7 } from 'bun'
import { relations } from 'drizzle-orm'
import { boolean, pgTable, text } from 'drizzle-orm/pg-core'
import { appointments } from './appointments'

export const photographers = pgTable('photographers', {
  id: text()
    .primaryKey()
    .$defaultFn(() => randomUUIDv7()),
  name: text().notNull(),
  phone: text().notNull(),
  email: text(),
  isActive: boolean().default(true),
})

export const photographersRelations = relations(photographers, ({ many }) => ({
  appointments: many(appointments),
}))
