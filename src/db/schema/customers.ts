import { randomUUIDv7 } from 'bun'
import { pgTable, text } from 'drizzle-orm/pg-core'

export const customers = pgTable('customers', {
  id: text()
    .primaryKey()
    .$defaultFn(() => randomUUIDv7()),
  phone: text().notNull(),
  name: text().notNull(),
  company: text().notNull(),
})
