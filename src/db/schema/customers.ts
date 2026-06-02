import { randomUUIDv7 } from 'bun'
import { pgTable, text } from 'drizzle-orm/pg-core'

export const customers = pgTable('customers', {
  id: text()
    .primaryKey()
    .$defaultFn(() => randomUUIDv7()),
  whatsappNumber: text().notNull(),
  name: text(),
})
