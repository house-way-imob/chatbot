import { env } from '../config/env'

const TIMEOUT_MS = 10_000

export async function sendMessage(phone: string, text: string): Promise<void> {
  const number = await resolveNumber(phone)
  await send(number, text)
}

// WhatsApp is migrating users to LIDs (@lid) — device identifiers the
// Evolution API rejects in sendText due to the onWhatsApp validation check.
// Tries to resolve the real phone number via the contact store as a fallback.
async function resolveNumber(phone: string): Promise<string> {
  if (!phone.includes('@lid')) return phone

  const url = `${env.EVOLUTION_API_URL}/contact/findContacts/${env.EVOLUTION_INSTANCE_NAME}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5_000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ where: { id: phone } }),
      signal: controller.signal,
    })

    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>[]
      const contact = Array.isArray(data) ? data[0] : data
      const resolved = (contact?.phoneNumber ?? contact?.number) as
        | string
        | undefined
      if (resolved && !resolved.includes('@lid')) return resolved
    }
  } catch {
    // Falls back to original JID if resolution fails
  } finally {
    clearTimeout(timer)
  }

  return phone
}

async function send(number: string, text: string): Promise<void> {
  const url = `${env.EVOLUTION_API_URL}/message/sendText/${env.EVOLUTION_INSTANCE_NAME}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number, text }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '(no body)')
      throw new Error(`Evolution API returned ${response.status}: ${body}`)
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Evolution API timeout after ${TIMEOUT_MS}ms`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
