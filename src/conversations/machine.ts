import type { ConversationState, ProcessingResult, ServiceType } from './types'

const MAX_ATTEMPTS = 3

export function initialState(): ConversationState {
  return { step: 'START', data: {}, attempts: 0 }
}

export function processMessage(
  state: ConversationState,
  message: string,
): ProcessingResult {
  const m = message.trim()

  switch (state.step) {
    case 'START':
      return handleStart(state)
    case 'COLLECTING_ADDRESS':
      return handleCollectingAddress(state, m)
    case 'COLLECTING_SIZE':
      return handleCollectingSize(state, m)
    case 'COLLECTING_SERVICE_TYPE':
      return handleCollectingServiceType(state, m)
    case 'QUALIFIED':
      return handleQualified(state)
    case 'CHOOSING_SLOT':
      return handleChoosingSlot(state)
    case 'CONFIRMED':
      return handleConfirmed(state)
  }
}

function handleStart(state: ConversationState): ProcessingResult {
  return {
    newState: { ...state, step: 'COLLECTING_ADDRESS', attempts: 0 },
    response:
      'Olá! 👋 Sou o assistente da Agência de Fotos.\n\n' +
      'Vou te ajudar a agendar sua sessão de fotografia imobiliária.\n\n' +
      'Para começar, qual é o *endereço completo* do imóvel?\n' +
      '_(rua, número, bairro e cidade)_',
  }
}

function handleCollectingAddress(
  state: ConversationState,
  message: string,
): ProcessingResult {
  if (message.length < 10) {
    return invalidAttempt(
      state,
      'Por favor, informe o *endereço completo* do imóvel.\n' +
        '_(ex: Rua das Flores, 123, Jardins, São Paulo)_',
    )
  }

  return {
    newState: {
      ...state,
      step: 'COLLECTING_SIZE',
      data: { ...state.data, address: message },
      attempts: 0,
    },
    response:
      `✅ Endereço registrado: *${message}*\n\n` +
      'Qual é o tamanho aproximado do imóvel?\n' +
      '_(ex: 80m², 3 quartos, 200m² com área externa)_',
  }
}

function handleCollectingSize(
  state: ConversationState,
  message: string,
): ProcessingResult {
  if (message.length < 2) {
    return invalidAttempt(
      state,
      'Por favor, informe o tamanho do imóvel.\n_(ex: 80m², 3 quartos)_',
    )
  }

  return {
    newState: {
      ...state,
      step: 'COLLECTING_SERVICE_TYPE',
      data: { ...state.data, size: message },
      attempts: 0,
    },
    response:
      'Qual tipo de serviço você deseja?\n\n' +
      '1️⃣ *Fotos*\n' +
      '2️⃣ *Fotos + Vídeo*\n' +
      '3️⃣ *Drone*\n' +
      '4️⃣ *Fotos + Drone*\n\n' +
      'Responda com o número ou o nome do serviço.',
  }
}

function handleCollectingServiceType(
  state: ConversationState,
  message: string,
): ProcessingResult {
  const serviceType = parseServiceType(message)

  if (!serviceType) {
    return invalidAttempt(
      state,
      'Não entendi. Por favor, responda com:\n' +
        '1️⃣ Fotos · 2️⃣ Fotos + Vídeo · 3️⃣ Drone · 4️⃣ Fotos + Drone',
    )
  }

  const data = { ...state.data, serviceType }

  return {
    newState: { ...state, step: 'QUALIFIED', data, attempts: 0 },
    response:
      '✅ *Perfeito! Aqui está o resumo do seu pedido:*\n\n' +
      `📍 Endereço: ${data.address}\n` +
      `📐 Tamanho: ${data.size}\n` +
      `📷 Serviço: ${serviceTypeLabel(serviceType)}\n\n` +
      'Nosso atendente vai entrar em contato em breve para confirmar o horário. ' +
      'Se tiver dúvidas, é só perguntar! 😊',
  }
}

function handleQualified(state: ConversationState): ProcessingResult {
  return {
    newState: { ...state, step: 'CONFIRMED' },
    response:
      'Seus dados já estão com nosso atendente. ' +
      'Em breve ele entrará em contato para confirmar o melhor horário! 📅',
  }
}

function handleChoosingSlot(state: ConversationState): ProcessingResult {
  // Placeholder — implementado na Fase 2 com o motor de slots
  return {
    newState: state,
    response: 'Esta funcionalidade estará disponível em breve.',
  }
}

function handleConfirmed(state: ConversationState): ProcessingResult {
  return {
    newState: state,
    response:
      'Seus dados já estão registrados com nosso atendente. ' +
      'Em breve você receberá a confirmação do horário! 📅\n\n' +
      'Se precisar de mais alguma coisa, estamos à disposição.',
  }
}

function invalidAttempt(
  state: ConversationState,
  errorMessage: string,
): ProcessingResult {
  const attempts = state.attempts + 1

  if (attempts >= MAX_ATTEMPTS) {
    return {
      newState: { ...state, attempts },
      response:
        'Parece que estou com dificuldade em entender. 😅 ' +
        'Vou chamar um atendente humano para te ajudar! ' +
        'Aguarde um momento.',
    }
  }

  return { newState: { ...state, attempts }, response: errorMessage }
}

function parseServiceType(message: string): ServiceType | null {
  const m = message.toLowerCase()

  if (m === '1') return 'PHOTOS'
  if (m === '2') return 'PHOTOS_VIDEO'
  if (m === '3') return 'DRONE'
  if (m === '4') return 'PHOTOS_DRONE'

  const hasDrone = m.includes('drone')
  const hasPhoto = m.includes('foto') || m.includes('photo')
  const hasVideo = m.includes('video') || m.includes('vídeo')

  if (hasVideo) return 'PHOTOS_VIDEO'
  if (hasDrone && hasPhoto) return 'PHOTOS_DRONE'
  if (hasDrone) return 'DRONE'
  if (hasPhoto) return 'PHOTOS'

  return null
}

function serviceTypeLabel(type: ServiceType): string {
  const labels: Record<ServiceType, string> = {
    PHOTOS: 'Fotos',
    PHOTOS_VIDEO: 'Fotos + Vídeo',
    DRONE: 'Drone',
    PHOTOS_DRONE: 'Fotos + Drone',
  }
  return labels[type]
}
