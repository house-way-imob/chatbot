import "dotenv/config"
import Fastify from "fastify"
import sensible from "@fastify/sensible"
import { prisma } from "./lib/prisma.js"
import { enviarMensagem } from "./lib/evolution.js"
import { estadoInicial, processarMensagem } from "./conversa/maquina.js"
import type { EstadoConversa } from "./conversa/types.js"

const app = Fastify({ logger: true })

app.register(sensible)

app.get("/health", async () => {
  return { status: "ok" }
})

app.post("/webhook/whatsapp", async (request, reply) => {
  const payload = request.body as Record<string, unknown>

  // Extrai telefone e texto do payload da Evolution API
  const telefone = extrairTelefone(payload)
  const texto = extrairTexto(payload)

  if (!telefone || !texto) {
    app.log.warn({ payload }, "payload sem telefone ou texto")
    return reply.status(200).send()
  }

  app.log.info({ telefone, texto }, "mensagem recebida")

  const conversa = await prisma.conversa.upsert({
    where: { telefone },
    create: { telefone, estado: estadoInicial() },
    update: {},
  })

  const estadoAtual = conversa.estado as EstadoConversa
  const { novoEstado, resposta } = processarMensagem(estadoAtual, texto)

  await prisma.conversa.update({
    where: { telefone },
    data: {
      estado: novoEstado,
      etapa: novoEstado.etapa,
      ultimaMensagemEm: new Date(),
    },
  })

  app.log.info({ telefone, etapa: novoEstado.etapa }, "resposta gerada")

  try {
    await enviarMensagem(telefone, resposta)
  } catch (err) {
    app.log.error({ err, telefone }, "falha ao enviar mensagem via Evolution API")
    // Não retorna erro ao webhook — a Evolution API não deve receber retry
  }

  return reply.status(200).send()
})

function extrairTelefone(payload: Record<string, unknown>): string | null {
  try {
    const data = payload["data"] as Record<string, unknown>
    const key = data["key"] as Record<string, unknown>

    // Ignora mensagens enviadas pelo próprio bot para evitar loop infinito
    if (key["fromMe"] === true) return null

    // remoteJid contém o número de quem enviou (sender é o número do bot)
    return String(key["remoteJid"])
      .replace("@s.whatsapp.net", "")
      .replace("@c.us", "")
  } catch {
    return null
  }
}

function extrairTexto(payload: Record<string, unknown>): string | null {
  try {
    const data = payload["data"] as Record<string, unknown>
    const message = data["message"] as Record<string, unknown>
    return (message["conversation"] as string) ?? null
  } catch {
    return null
  }
}

const port = Number(process.env.PORT) || 3000

app.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
