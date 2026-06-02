import type {
  EstadoConversa,
  ResultadoProcessamento,
  TipoServico,
} from "./types.js"

const MAX_TENTATIVAS = 3

export function estadoInicial(): EstadoConversa {
  return { etapa: "INICIO", dados: {}, tentativas: 0 }
}

export function processarMensagem(
  estado: EstadoConversa,
  mensagem: string
): ResultadoProcessamento {
  const m = mensagem.trim()

  switch (estado.etapa) {
    case "INICIO":
      return handleInicio(estado)
    case "COLETANDO_ENDERECO":
      return handleColetandoEndereco(estado, m)
    case "COLETANDO_TAMANHO":
      return handleColetandoTamanho(estado, m)
    case "COLETANDO_TIPO_SERVICO":
      return handleColetandoTipoServico(estado, m)
    case "QUALIFICADO":
      return handleQualificado(estado)
    case "ESCOLHENDO_HORARIO":
      return handleEscolhendoHorario(estado)
    case "CONFIRMADO":
      return handleConfirmado(estado)
  }
}

// --- handlers por estado ---

function handleInicio(estado: EstadoConversa): ResultadoProcessamento {
  return {
    novoEstado: { ...estado, etapa: "COLETANDO_ENDERECO", tentativas: 0 },
    resposta:
      "Olá! 👋 Sou o assistente da Agência de Fotos.\n\n" +
      "Vou te ajudar a agendar sua sessão de fotografia imobiliária.\n\n" +
      "Para começar, qual é o *endereço completo* do imóvel?\n" +
      "_(rua, número, bairro e cidade)_",
  }
}

function handleColetandoEndereco(
  estado: EstadoConversa,
  mensagem: string
): ResultadoProcessamento {
  if (mensagem.length < 10) {
    return tentativaInvalida(
      estado,
      "Por favor, informe o endereço *completo* do imóvel.\n" +
        "_(ex: Rua das Flores, 123, Jardins, São Paulo)_"
    )
  }

  return {
    novoEstado: {
      ...estado,
      etapa: "COLETANDO_TAMANHO",
      dados: { ...estado.dados, endereco: mensagem },
      tentativas: 0,
    },
    resposta:
      `✅ Endereço registrado: *${mensagem}*\n\n` +
      "Qual é o tamanho aproximado do imóvel?\n" +
      "_(ex: 80m², 3 quartos, 200m² com área externa)_",
  }
}

function handleColetandoTamanho(
  estado: EstadoConversa,
  mensagem: string
): ResultadoProcessamento {
  if (mensagem.length < 2) {
    return tentativaInvalida(
      estado,
      "Por favor, informe o tamanho do imóvel.\n_(ex: 80m², 3 quartos)_"
    )
  }

  return {
    novoEstado: {
      ...estado,
      etapa: "COLETANDO_TIPO_SERVICO",
      dados: { ...estado.dados, tamanho: mensagem },
      tentativas: 0,
    },
    resposta:
      "Qual tipo de serviço você deseja?\n\n" +
      "1️⃣ *Fotos*\n" +
      "2️⃣ *Fotos + Vídeo*\n" +
      "3️⃣ *Drone*\n" +
      "4️⃣ *Fotos + Drone*\n\n" +
      "Responda com o número ou o nome do serviço.",
  }
}

function handleColetandoTipoServico(
  estado: EstadoConversa,
  mensagem: string
): ResultadoProcessamento {
  const tipoServico = parseTipoServico(mensagem)

  if (!tipoServico) {
    return tentativaInvalida(
      estado,
      "Não entendi. Por favor, responda com:\n" +
        "1️⃣ Fotos · 2️⃣ Fotos + Vídeo · 3️⃣ Drone · 4️⃣ Fotos + Drone"
    )
  }

  const dados = { ...estado.dados, tipoServico }

  return {
    novoEstado: { ...estado, etapa: "QUALIFICADO", dados, tentativas: 0 },
    resposta:
      "✅ *Perfeito! Aqui está o resumo do seu pedido:*\n\n" +
      `📍 Endereço: ${dados.endereco}\n` +
      `📐 Tamanho: ${dados.tamanho}\n` +
      `📷 Serviço: ${labelTipoServico(tipoServico)}\n\n` +
      "Nosso atendente vai entrar em contato em breve para confirmar o horário. " +
      "Se tiver dúvidas, é só perguntar! 😊",
  }
}

function handleQualificado(estado: EstadoConversa): ResultadoProcessamento {
  return {
    novoEstado: { ...estado, etapa: "CONFIRMADO" },
    resposta:
      "Seus dados já estão com nosso atendente. " +
      "Em breve ele entrará em contato para confirmar o melhor horário! 📅",
  }
}

function handleEscolhendoHorario(estado: EstadoConversa): ResultadoProcessamento {
  // Placeholder — implementado no Plano 2 junto ao motor de slots
  return {
    novoEstado: estado,
    resposta: "Esta funcionalidade estará disponível em breve.",
  }
}

function handleConfirmado(estado: EstadoConversa): ResultadoProcessamento {
  return {
    novoEstado: estado,
    resposta:
      "Seus dados já estão registrados com nosso atendente. " +
      "Em breve você receberá a confirmação do horário! 📅\n\n" +
      "Se precisar de mais alguma coisa, estamos à disposição.",
  }
}

// --- utilitários ---

function tentativaInvalida(
  estado: EstadoConversa,
  mensagemErro: string
): ResultadoProcessamento {
  const tentativas = estado.tentativas + 1

  if (tentativas >= MAX_TENTATIVAS) {
    return {
      novoEstado: { ...estado, tentativas },
      resposta:
        "Parece que estou com dificuldade em entender. 😅 " +
        "Vou chamar um atendente humano para te ajudar! " +
        "Aguarde um momento.",
    }
  }

  return {
    novoEstado: { ...estado, tentativas },
    resposta: mensagemErro,
  }
}

function parseTipoServico(mensagem: string): TipoServico | null {
  const m = mensagem.toLowerCase()

  if (m === "1") return "FOTO"
  if (m === "2") return "FOTO_VIDEO"
  if (m === "3") return "DRONE"
  if (m === "4") return "FOTO_DRONE"

  const temDrone = m.includes("drone")
  const temFoto = m.includes("foto")
  const temVideo = m.includes("video") || m.includes("vídeo")

  if (temVideo) return "FOTO_VIDEO"
  if (temDrone && temFoto) return "FOTO_DRONE"
  if (temDrone) return "DRONE"
  if (temFoto) return "FOTO"

  return null
}

function labelTipoServico(tipo: TipoServico): string {
  const labels: Record<TipoServico, string> = {
    FOTO: "Fotos",
    FOTO_VIDEO: "Fotos + Vídeo",
    DRONE: "Drone",
    FOTO_DRONE: "Fotos + Drone",
  }
  return labels[tipo]
}
