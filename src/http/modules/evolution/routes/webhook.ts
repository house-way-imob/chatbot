import { Elysia } from 'elysia'
import { EvolutionModel } from '../model'
import { handleEvolutionWebhook } from '../service'

export const evolutionApiWebhook = new Elysia().post(
  '/webhook/evolution',
  ({ body }) => {
    return handleEvolutionWebhook(body)
  },
  {
    body: EvolutionModel.webhookBody,
    response: EvolutionModel.webhookResponse,
  },
)
