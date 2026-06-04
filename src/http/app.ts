import { Elysia } from 'elysia'
import { evolutionApiWebhook } from './modules/evolution/routes/webhook'

const app = new Elysia()
  .use(evolutionApiWebhook)
  .listen(Number(process.env.PORT ?? 3333))

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
)
