import { eq } from 'drizzle-orm'
import { initialState, processMessage } from '../../../conversations/machine'
import type { ConversationState } from '../../../conversations/types'
import { db } from '../../../db'
import { conversations, leads } from '../../../db/schema'
import { sendMessage } from '../../../lib/evolution'
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
    const result = processMessage(currentState, line)
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
  const { address, size, serviceType } = state.data
  if (!address || !size || !serviceType) return existingLeadId

  const [lead] = await db
    .insert(leads)
    .values({ jid, address, size, serviceType, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: leads.jid,
      set: { address, size, serviceType, updatedAt: new Date() },
    })
    .returning({ id: leads.id })

  console.log(`[service] lead upserted: ${lead.id} for ${jid}`)
  return lead.id
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
