import "dotenv/config"
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith("postgresql://"),
  REDIS_URL: z.string().startsWith("redis://"),
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_INSTANCE_NAME: z.string().min(1),
  GROQ_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

export const env = envSchema.parse(process.env)
