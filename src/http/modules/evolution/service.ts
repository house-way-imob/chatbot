import { redis } from '../../../lib/redis/client'
import type {
  EvolutionWebhookBody,
  EvolutionWebhookResponse,
  ProcessEvolutionMessagesInput,
  WhatsappSession,
} from './model'

const SESSION_TTL_SECONDS = 60 * 60
const MESSAGE_COOLDOWN_MS = 10 * 1000
const MESSAGE_COOLDOWN_SECONDS = MESSAGE_COOLDOWN_MS / 1000

export async function handleEvolutionWebhook(
  payload: EvolutionWebhookBody,
): Promise<EvolutionWebhookResponse> {
  console.log('Evento recebido')
  // console.log(payload)

  if (payload.data?.key?.fromMe === true) {
    return { success: true }
  }

  if (isGroupMessage(payload)) {
    console.log('Mensagem de grupo ignorada.')
    return { success: true }
  }

  const phone = extractPhone(payload)
  if (!phone) {
    console.log('Nenhum número de celular identificado no evento.')
    return { success: true }
  }

  const messageText = extractMessageText(payload)
  if (!messageText) {
    console.log(
      `Nenhuma mensagem de texto identificada para o número ${phone}.`,
    )
    return { success: true }
  }

  const sessionKey = `session:${phone}`
  const session = await upsertWhatsappSession(sessionKey, phone)

  const bufferKey = `buffer:${phone}`
  const existingBuffer = await redis.get(bufferKey)
  const updatedBuffer = existingBuffer
    ? `${existingBuffer}\n${messageText}`
    : messageText
  await redis.set(bufferKey, updatedBuffer, 'EX', SESSION_TTL_SECONDS)

  const currentJobId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  const lastJobKey = `last_job:${phone}`
  await redis.set(lastJobKey, currentJobId, 'EX', SESSION_TTL_SECONDS)

  console.log(
    `Sessão ${session.createdAt === session.updatedAt ? 'criada' : 'renovada'} para ${phone}. Processamento reagendado para ${MESSAGE_COOLDOWN_SECONDS} segundos.`,
  )

  scheduleMessagesProcessing({
    phone,
    bufferKey,
    lastJobKey,
    currentJobId,
  })

  return { success: true }
}

export async function processEvolutionMessages({
  phone,
  messages,
}: ProcessEvolutionMessagesInput) {
  console.log(
    `\n=== [TODO] INICIANDO PROCESSAMENTO DE MENSAGENS PARA ${phone} ===`,
  )
  console.log(`Mensagens acumuladas:\n${messages}`)
  console.log('========================================================\n')

  // TODO: implementar o processamento real das mensagens.
}

function extractPhone(payload: EvolutionWebhookBody) {
  const phoneJid =
    payload.data?.key?.remoteJid || payload.data?.phone || payload.phone

  return phoneJid?.split('@')[0]
}

function isGroupMessage(payload: EvolutionWebhookBody) {
  return payload.data?.key?.remoteJid?.endsWith('@g.us') === true
}

function extractMessageText(payload: EvolutionWebhookBody) {
  return (
    payload.data?.message?.conversation ||
    payload.data?.message?.extendedTextMessage?.text ||
    payload.text
  )
}

async function upsertWhatsappSession(sessionKey: string, phone: string) {
  const now = new Date().toISOString()
  const rawSession = await redis.get(sessionKey)

  if (!rawSession) {
    const newSession: WhatsappSession = {
      phone,
      createdAt: now,
      updatedAt: now,
      messageCount: 1,
      status: 'active',
    }

    await redis.set(
      sessionKey,
      JSON.stringify(newSession),
      'EX',
      SESSION_TTL_SECONDS,
    )

    return newSession
  }

  const session = JSON.parse(rawSession) as WhatsappSession
  const updatedSession: WhatsappSession = {
    ...session,
    updatedAt: now,
    messageCount: session.messageCount + 1,
    status: 'active',
  }

  await redis.set(
    sessionKey,
    JSON.stringify(updatedSession),
    'EX',
    SESSION_TTL_SECONDS,
  )

  return updatedSession
}

interface ScheduleMessagesProcessingInput {
  phone: string
  bufferKey: string
  lastJobKey: string
  currentJobId: string
}

function scheduleMessagesProcessing({
  phone,
  bufferKey,
  lastJobKey,
  currentJobId,
}: ScheduleMessagesProcessingInput) {
  setTimeout(async () => {
    try {
      const activeJobId = await redis.get(lastJobKey)

      if (activeJobId === currentJobId) {
        const finalMessages = await redis.get(bufferKey)

        if (finalMessages) {
          await processEvolutionMessages({
            phone,
            messages: finalMessages,
          })
        }

        await redis.del(bufferKey)
        await redis.del(lastJobKey)
      } else {
        console.log(
          `Processamento cancelado para o job antigo de ${phone}, pois uma nova mensagem chegou.`,
        )
      }
    } catch (error) {
      console.error(
        `Erro ao processar mensagens em background para ${phone}:`,
        error,
      )
    }
  }, MESSAGE_COOLDOWN_MS)
}
