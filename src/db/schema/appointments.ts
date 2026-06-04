import { randomUUIDv7 } from 'bun'
import { relations } from 'drizzle-orm'
import { doublePrecision, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { customers } from './customers'
import { photographers } from './photographers'

export const appointments = pgTable('appointments', {
  id: text()
    .primaryKey()
    .$defaultFn(() => randomUUIDv7()),

  customerId: text()
    .notNull()
    .references(() => customers.id, {
      onDelete: 'cascade',
    }),
  photographerId: text()
    .notNull()
    .references(() => photographers.id, {
      onDelete: 'cascade',
    }),

  originalAddress: text().notNull(),
  formattedAddress: text(),
  latitude: doublePrecision(),
  longitude: doublePrecision(),

  startsAt: timestamp({ withTimezone: true }),
  endsAt: timestamp({ withTimezone: true }),

  status: text().notNull().default('pending'),
})

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  customer: one(customers, {
    fields: [appointments.customerId],
    references: [customers.id],
  }),

  photographer: one(photographers, {
    fields: [appointments.photographerId],
    references: [photographers.id],
  }),
}))
