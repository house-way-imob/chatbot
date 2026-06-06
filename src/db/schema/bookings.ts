import { randomUUID } from 'node:crypto'
import { doublePrecision, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { photographers } from './photographers'
import { leads } from './leads'

// serviceType: PHOTOS | PHOTOS_VIDEO | DRONE | PHOTOS_DRONE
// status: PENDING | CONFIRMED | CANCELLED | COMPLETED
export const bookings = pgTable('bookings', {
  id: text().primaryKey().$defaultFn(() => randomUUID()),
  leadId: text().notNull().references(() => leads.id),
  photographerId: text().notNull().references(() => photographers.id),
  startsAt: timestamp().notNull(),
  endsAt: timestamp().notNull(),
  propertyAddress: text().notNull(),
  lat: doublePrecision().notNull(),
  lng: doublePrecision().notNull(),
  serviceType: text().notNull(),
  status: text().notNull().default('PENDING'),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
})
