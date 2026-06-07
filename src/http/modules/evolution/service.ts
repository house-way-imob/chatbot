import { eq } from 'drizzle-orm'
import { initialState, processMessage } from '../../../conversations/machine'
import type { ConversationState } from '../../../conversations/types'
import { db } from '../../../db'
import { conversations, leads } from '../../../db/schema'
import { answerFaq } from '../../../lib/ai/answer-faq'
import { classifyIntent } from '../../../lib/ai/classify-intent'
import { FAQ_ANSWERS } from '../../../lib/ai/prompts'
import { sendMessage } from '../../../lib/evolution'
import { geocodeAddress } from '../../../lib/maps/geocode'
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
const STARTUP_TIMESTAMP_S = Math.floor(Date.now() / 1000)

export async function handleEvolutionWebhook(
  payload: EvolutionWebhookBody,
): Promise<EvolutionWebhookResponse> {
  if (payload.data?.key?.fromMe === true) {
    return { success: true }
  }

  if (isGroupMessage(payload)) {
    return { success: true }
  }

  const msgTs = (payload.data as Record<string, unknown>)?.messageTimestamp as number | undefined
  if (msgTs && msgTs < STARTUP_TIMESTAMP_S - 30) {
    console.log(`[service] ignoring old message (ts=${msgTs}, startup=${STARTUP_TIMESTAMP_S})`)
    return { success: true }
  }

  const jid = extractJid(payload)
  if (!jid) {
    return { success: true }
  }

  const messageText = extractMessageText(payload)
  if (!messageText) {
    return { success: true }
  }

  const sessionKey = `session:${jid}`
  await upsertWhatsappSession(sessionKey, jid)

  const bufferKey = `buffer:${jid}`
  const existingBuffer = await redis.get(bufferKey)
  const updatedBuffer = existingBuffer
    ? `${existingBuffer}\n${messageText}`
    : messageText
  await redis.set(bufferKey, updatedBuffer, 'EX', SESSION_TTL_SECONDS)

  console.log(`[service] buffered message for ${jid}: "${messageText}"`)

  await scheduleMessagesProcessing(jid)

  console.log(`[service] job scheduled for ${jid}`)

  return { success: true }
}

export async function processEvolutionMessages({
  jid,
  messages,
}: ProcessEvolutionMessagesInput) {
  console.log(`[worker] processing messages for ${jid}:`, messages)

  let conversation = await db.query.conversations.findFirst({
    where: eq(conversations.jid, jid),
  })

  if (!conversation) {
    const [created] = await db
      .insert(conversations)
      .values({ jid, state: initialState() })
      .returning()
    conversation = created
  }

  const lines = messages.split('\n').filter(Boolean)
  let currentState = conversation.state as ConversationState
  let lastResponse = ''

  for (const line of lines) {
    const { intent, extractedData } = await classifyIntent(line)
    console.log(`[worker] intent for "${line.slice(0, 40)}": ${intent}`)

    if (intent === 'faq') {
      lastResponse = await resolveFaq(line)
      continue
    }

    if (intent === 'off_topic') {
      // Para usuários em fluxo ativo, trata off_topic como qualification
      // para não travar a conversa em saudações simples ("oi", "olá", etc.)
      if (currentState.step === 'START' || currentState.step === 'CONFIRMED') {
        const result = processMessage(currentState, line)
        currentState = result.newState
        lastResponse = result.response
      }
      continue
    }

    // intent === 'qualification': injeta dados extraídos pelo LLM antes de processar
    const enrichedLine = extractedData.address ?? extractedData.size ?? line
    const result = processMessage(currentState, enrichedLine)
    currentState = result.newState
    lastResponse = result.response
  }

  const leadId = await upsertLeadIfQualified(jid, currentState, conversation.leadId ?? undefined)

  await db
    .update(conversations)
    .set({
      state: currentState,
      step: currentState.step,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
      ...(leadId ? { leadId } : {}),
    })
    .where(eq(conversations.jid, jid))

  if (lastResponse) {
    console.log(`[worker] sending response to ${jid}: "${lastResponse.slice(0, 60)}..."`)
    try {
      await sendMessage(jid, lastResponse)
      console.log(`[worker] response sent successfully to ${jid}`)
    } catch (err) {
      console.error(`[worker] failed to send to ${jid}:`, err instanceof Error ? err.message : err)
    }
  }
}

export async function processBufferedEvolutionMessages(jid: string) {
  const bufferKey = `buffer:${jid}`
  const messages = await redis.get(bufferKey)

  if (!messages) {
    return
  }

  await processEvolutionMessages({ jid, messages })
  await redis.del(bufferKey)
}

function extractJid(payload: EvolutionWebhookBody): string | undefined {
  return payload.data?.key?.remoteJid ?? undefined
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

async function upsertWhatsappSession(sessionKey: string, jid: string) {
  const now = new Date().toISOString()
  const rawSession = await redis.get(sessionKey)

  if (!rawSession) {
    const newSession: WhatsappSession = {
      jid,
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

async function upsertLeadIfQualified(
  jid: string,
  state: ConversationState,
  existingLeadId: string | undefined,
): Promise<string | undefined> {

  if (state.step !== 'QUALIFIED') return existingLeadId

  const { address, size, serviceType } = state.data
  if (!address || !size || !serviceType) return existingLeadId

  const geo = await geocodeAddress(address).catch((err) => {
    console.warn('[service] geocode failed:', err instanceof Error ? err.message : err)
    return null
  })

  const values = {
    jid,
    address,
    size,
    serviceType,
    formattedAddress: geo?.formattedAddress ?? null,
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    updatedAt: new Date(),
  }

  const [lead] = await db
    .insert(leads)
    .values(values)
    .onConflictDoUpdate({ target: leads.jid, set: values })
    .returning({ id: leads.id })

  console.log(`[service] lead upserted: ${lead.id} | geo: ${geo ? `${geo.latitude},${geo.longitude}` : 'none'}`)
  return lead.id
}

async function resolveFaq(message: string): Promise<string> {
  const m = message.toLowerCase()
  if (m.includes('preço') || m.includes('preco') || m.includes('valor') || m.includes('custa') || m.includes('quanto'))
    return FAQ_ANSWERS.preco
  if (m.includes('prazo') || m.includes('entrega') || m.includes('quando') || m.includes('demora'))
    return FAQ_ANSWERS.prazo
  if (m.includes('receb') || m.includes('link') || m.includes('como fica') || m.includes('formato'))
    return FAQ_ANSWERS.entrega
  if (m.includes('cancel') || m.includes('remarc') || m.includes('desist'))
    return FAQ_ANSWERS.cancelamento
  if (m.includes('drone') || m.includes('chuva') || m.includes('voo') || m.includes('tempo'))
    return FAQ_ANSWERS.drone

  // Nenhuma resposta fixa bateu — deixa a IA responder com contexto da agência
  return answerFaq(message)
}

async function scheduleMessagesProcessing(jid: string) {
  const jobId = `process-${jid}`
  const existingJob = await messagesQueue.getJob(jobId)
  if (existingJob) {
    await existingJob.remove()
  }
  await messagesQueue.add(
    'process-whatsapp-messages',
    { jid },
    {
      jobId,
      delay: MESSAGE_COOLDOWN_MS,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  )
}
