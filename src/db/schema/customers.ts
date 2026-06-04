import { randomUUIDv7 } from 'bun'
import { relations } from 'drizzle-orm'
import { pgTable, text } from 'drizzle-orm/pg-core'
import { appointments } from './appointments'

export const customers = pgTable('customers', {
  id: text()
    .primaryKey()
    .$defaultFn(() => randomUUIDv7()),
  phone: text().notNull(),
  name: text().notNull(),
  company: text().notNull(),
})

export const customersRelations = relations(customers, ({ many }) => ({
  appointments: many(appointments),
}))
