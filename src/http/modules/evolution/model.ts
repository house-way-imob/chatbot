import { t, type UnwrapSchema } from 'elysia'

const messageSchema = t.Object(
  {
    conversation: t.Optional(t.String()),
    extendedTextMessage: t.Optional(
      t.Object(
        {
          text: t.Optional(t.String()),
        },
        {
          additionalProperties: true,
        },
      ),
    ),
  },
  {
    additionalProperties: true,
  },
)

const dataSchema = t.Object(
  {
    key: t.Optional(
      t.Object(
        {
          remoteJid: t.Optional(t.String()),
          fromMe: t.Optional(t.Boolean()),
          id: t.Optional(t.String()),
        },
        {
          additionalProperties: true,
        },
      ),
    ),
    pushName: t.Optional(t.String()),
    message: t.Optional(messageSchema),
    messageType: t.Optional(t.String()),
    phone: t.Optional(t.String()),
  },
  {
    additionalProperties: true,
  },
)

export const EvolutionModel = {
  webhookBody: t.Object(
    {
      event: t.Optional(t.String()),
      instance: t.Optional(t.String()),
      data: t.Optional(dataSchema),
      phone: t.Optional(t.String()),
      text: t.Optional(t.String()),
    },
    {
      additionalProperties: true,
    },
  ),
  webhookResponse: t.Object({
    success: t.Boolean(),
  }),
  testMessageBody: t.Object({
    phone: t.Optional(t.String()),
    text: t.Optional(t.String()),
  }),
}

export type EvolutionWebhookBody = UnwrapSchema<
  typeof EvolutionModel.webhookBody
>

export type EvolutionWebhookResponse = UnwrapSchema<
  typeof EvolutionModel.webhookResponse
>

export type EvolutionTestMessageBody = UnwrapSchema<
  typeof EvolutionModel.testMessageBody
>

export interface WhatsappSession {
  phone: string
  createdAt: string
  updatedAt: string
  messageCount: number
  status: 'active'
}

export interface ProcessEvolutionMessagesInput {
  phone: string
  messages: string
}
