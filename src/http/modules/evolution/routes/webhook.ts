import { Elysia } from 'elysia'
import { EvolutionModel } from '../model'
import { handleEvolutionWebhook } from '../service'

export const evolutionApiWebhook = new Elysia().post(
  '/webhook/evolution',
  ({ body }) => {
    console.log('[webhook] event:', body.event, '| fromMe:', body.data?.key?.fromMe, '| jid:', body.data?.key?.remoteJid)
    return handleEvolutionWebhook(body)
  },
  {
    body: EvolutionModel.webhookBody,
    response: EvolutionModel.webhookResponse,
  },
)
