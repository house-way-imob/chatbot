import { env } from '../config/env'

const TIMEOUT_MS = 10_000

export async function sendMessage(jid: string, text: string): Promise<void> {
  await send(jid, text)
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
