import { randomUUIDv7 } from 'bun'
import {
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// Cache de tempos do Google Routes API — arredondado a 4 casas decimais
// para maximizar reuso entre clientes próximos.
export const cacheDeslocamento = pgTable(
  'cache_deslocamento',
  {
    id: text().primaryKey().$defaultFn(() => randomUUIDv7()),
    origemLat: doublePrecision().notNull(),
    origemLng: doublePrecision().notNull(),
    destinoLat: doublePrecision().notNull(),
    destinoLng: doublePrecision().notNull(),
    duracaoSegundos: integer().notNull(),
    expiresAt: timestamp().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    coordsUnq: uniqueIndex('cache_deslocamento_coords_idx').on(
      table.origemLat,
      table.origemLng,
      table.destinoLat,
      table.destinoLng,
    ),
  }),
)
