import { messagesQueue } from '../../../lib/queue/messages'
import { redis } from '../../../lib/redis/client'
import type {
  EvolutionWebhookBody,
  EvolutionWebhookResponse,
  ProcessEvolutionMessagesInput,
  WhatsappSession,
} from './model'

const SESSION_TTL_SECONDS = 60 * 60
const MESSAGE_COOLDOWN_MS = 10 * 1000

export async function handleEvolutionWebhook(
  payload: EvolutionWebhookBody,
): Promise<EvolutionWebhookResponse> {
  if (payload.data?.key?.fromMe === true) {
    return { success: true }
  }

  if (isGroupMessage(payload)) {
    return { success: true }
  }

  const phone = extractPhone(payload)
  if (!phone) {
    return { success: true }
  }

  const messageText = extractMessageText(payload)
  if (!messageText) {
    return { success: true }
  }

  const sessionKey = `session:${phone}`
  await upsertWhatsappSession(sessionKey, phone)

  const bufferKey = `buffer:${phone}`
  const existingBuffer = await redis.get(bufferKey)
  const updatedBuffer = existingBuffer
    ? `${existingBuffer}\n${messageText}`
    : messageText
  await redis.set(bufferKey, updatedBuffer, 'EX', SESSION_TTL_SECONDS)

  await scheduleMessagesProcessing(phone)

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

export async function processBufferedEvolutionMessages(phone: string) {
  const bufferKey = `buffer:${phone}`
  const messages = await redis.get(bufferKey)

  if (!messages) {
    return
  }

  await processEvolutionMessages({
    phone,
    messages,
  })

  await redis.del(bufferKey)
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

async function scheduleMessagesProcessing(phone: string) {
  const jobId = `process:${phone}`

  const existingJob = await messagesQueue.getJob(jobId)

  if (existingJob) {
    await existingJob.remove()
  }

  await messagesQueue.add(
    'process-whatsapp-messages',
    { phone },
    {
      jobId,
      delay: MESSAGE_COOLDOWN_MS,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  )
}
