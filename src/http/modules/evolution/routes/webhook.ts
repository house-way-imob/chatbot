import { Elysia } from 'elysia'
import { EvolutionModel, type EvolutionTestMessageBody } from '../model'
import { handleEvolutionWebhook } from '../service'

const TEST_PHONE = '5511999999999'

export const evolutionApiWebhook = new Elysia()
  .post(
    '/webhook/evolution',
    ({ body }) => {
      return handleEvolutionWebhook(body)
    },
    {
      body: EvolutionModel.webhookBody,
      response: EvolutionModel.webhookResponse,
    },
  )
  .post(
    '/webhook/evolution/test-message',
    ({ body }) => {
      const payload = createTestMessagePayload(body)

      return handleEvolutionWebhook(payload)
    },
    {
      body: EvolutionModel.testMessageBody,
      response: EvolutionModel.webhookResponse,
    },
  )

function createTestMessagePayload(body: EvolutionTestMessageBody) {
  const phone = body.phone || TEST_PHONE
  const text = body.text || `Mensagem de teste ${new Date().toISOString()}`

  return {
    event: 'messages.upsert',
    instance: 'local-test',
    data: {
      key: {
        remoteJid: `${phone}@s.whatsapp.net`,
        fromMe: false,
        id: `local-test-${Date.now()}`,
      },
      pushName: 'Teste Local',
      message: {
        conversation: text,
      },
      messageType: 'conversation',
      phone,
    },
  }
}
