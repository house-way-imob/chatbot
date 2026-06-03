import { randomUUID } from 'node:crypto'
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { leads } from './leads'

// step: START | COLLECTING_ADDRESS | COLLECTING_SIZE |
//       COLLECTING_SERVICE_TYPE | QUALIFIED | CHOOSING_SLOT | CONFIRMED
// state: free JSON — everything the bot needs to remember between turns
export const conversations = pgTable('conversations', {
  id: text().primaryKey().$defaultFn(() => randomUUID()),
  phone: text().notNull().unique(),
  step: text().notNull().default('START'),
  state: jsonb().notNull().default({}),
  lastMessageAt: timestamp().notNull().defaultNow(),
  leadId: text().references(() => leads.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
})
