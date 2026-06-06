import { randomUUIDv7 } from 'bun'
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const fotografos = pgTable('fotografos', {
  id: text().primaryKey().$defaultFn(() => randomUUIDv7()),
  nome: text().notNull(),
  telefone: text().notNull().unique(),
  email: text(),
  ativo: boolean().notNull().default(true),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
})
