import { randomUUID } from 'node:crypto'
import {
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// Caches Google Routes API travel durations between coordinate pairs.
// Coordinates are rounded to 4 decimal places to maximize cache hits.
export const travelTimeCache = pgTable(
  'travel_time_cache',
  {
    id: text().primaryKey().$defaultFn(() => randomUUID()),
    originLat: doublePrecision().notNull(),
    originLng: doublePrecision().notNull(),
    destLat: doublePrecision().notNull(),
    destLng: doublePrecision().notNull(),
    durationSeconds: integer().notNull(),
    expiresAt: timestamp().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    coordsUnq: uniqueIndex('travel_time_cache_coords_idx').on(
      table.originLat,
      table.originLng,
      table.destLat,
      table.destLng,
    ),
  }),
)
