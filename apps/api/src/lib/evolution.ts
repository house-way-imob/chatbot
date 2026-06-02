const BASE_URL = process.env.EVOLUTION_API_URL!
const API_KEY = process.env.EVOLUTION_API_KEY!
const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME!
const TIMEOUT_MS = 10_000

export async function enviarMensagem(
  telefone: string,
  texto: string
): Promise<void> {
  const numero = await resolverNumero(telefone)
  await enviar(numero, texto)
}

// WhatsApp bloqueou recebimento de número de pessoas que enviam mensagem
// Só é possível visualizar o LID

async function resolverNumero(telefone: string): Promise<string> {
  if (!telefone.includes("@lid")) return telefone

  const url = `${BASE_URL}/contact/findContacts/${INSTANCE}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5_000)

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: API_KEY },
      body: JSON.stringify({ where: { id: telefone } }),
      signal: controller.signal,
    })

    if (resp.ok) {
      const data = await resp.json() as Record<string, unknown>[]
      const contato = Array.isArray(data) ? data[0] : data
      const numero = (contato?.phoneNumber ?? contato?.number) as string | undefined
      if (numero && !numero.includes("@lid")) return numero
    }
  } catch {
    // Segue com o JID original se a resolução falhar
  } finally {
    clearTimeout(timer)
  }

  return telefone
}

async function enviar(numero: string, texto: string): Promise<void> {
  const url = `${BASE_URL}/message/sendText/${INSTANCE}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
      },
      body: JSON.stringify({ number: numero, text: texto }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const corpo = await response.text().catch(() => "(sem corpo)")
      throw new Error(`Evolution API retornou ${response.status}: ${corpo}`)
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Evolution API timeout após ${TIMEOUT_MS}ms`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
