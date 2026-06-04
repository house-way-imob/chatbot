import { randomUUIDv7 } from 'bun'
import { doublePrecision, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { customers } from './customers'

export const appointments = pgTable('appointments', {
  id: text()
    .primaryKey()
    .$defaultFn(() => randomUUIDv7()),

  customerId: text()
    .notNull()
    .references(() => customers.id),

  originalAddress: text().notNull(),
  formattedAddress: text(),
  latitude: doublePrecision(),
  longitude: doublePrecision(),

  startsAt: timestamp({ withTimezone: true }),
  endsAt: timestamp({ withTimezone: true }),

  status: text().notNull().default('pending'),
})
