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
      'Hello! 👋 I am the assistant for the Photo Agency.\n\n' +
      'I will help you schedule your real estate photography session.\n\n' +
      "To get started, what is the property's *full address*?\n" +
      '_(street, number, neighborhood and city)_',
  }
}

function handleCollectingAddress(
  state: ConversationState,
  message: string,
): ProcessingResult {
  if (message.length < 10) {
    return invalidAttempt(
      state,
      'Please provide the *full address* of the property.\n' +
        '_(e.g.: 123 Main St, Downtown, São Paulo)_',
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
      `✅ Address saved: *${message}*\n\n` +
      "What is the property's approximate size?\n" +
      '_(e.g.: 80m², 3 bedrooms, 200m² with outdoor area)_',
  }
}

function handleCollectingSize(
  state: ConversationState,
  message: string,
): ProcessingResult {
  if (message.length < 2) {
    return invalidAttempt(
      state,
      "Please provide the property's size.\n_(e.g.: 80m², 3 bedrooms)_",
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
      'What type of service would you like?\n\n' +
      '1️⃣ *Photos*\n' +
      '2️⃣ *Photos + Video*\n' +
      '3️⃣ *Drone*\n' +
      '4️⃣ *Photos + Drone*\n\n' +
      'Reply with the number or service name.',
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
      "Didn't understand. Please reply with:\n" +
        '1️⃣ Photos · 2️⃣ Photos + Video · 3️⃣ Drone · 4️⃣ Photos + Drone',
    )
  }

  const data = { ...state.data, serviceType }

  return {
    newState: { ...state, step: 'QUALIFIED', data, attempts: 0 },
    response:
      '✅ *Great! Here is a summary of your request:*\n\n' +
      `📍 Address: ${data.address}\n` +
      `📐 Size: ${data.size}\n` +
      `📷 Service: ${serviceTypeLabel(serviceType)}\n\n` +
      'Our agent will contact you shortly to confirm the appointment. ' +
      'Feel free to ask if you have any questions! 😊',
  }
}

function handleQualified(state: ConversationState): ProcessingResult {
  return {
    newState: { ...state, step: 'CONFIRMED' },
    response:
      'Your details are already with our agent. ' +
      'They will contact you soon to confirm the best time! 📅',
  }
}

function handleChoosingSlot(state: ConversationState): ProcessingResult {
  // Placeholder — implemented in Phase 2 with the slot engine
  return {
    newState: state,
    response: 'This feature will be available soon.',
  }
}

function handleConfirmed(state: ConversationState): ProcessingResult {
  return {
    newState: state,
    response:
      'Your details are already with our agent. ' +
      'You will receive the appointment confirmation shortly! 📅\n\n' +
      'Let us know if you need anything else.',
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
        "Seems like I'm having trouble understanding. 😅 " +
        'I will connect you with a human agent right away! ' +
        'Please wait a moment.',
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
  const hasPhoto = m.includes('photo') || m.includes('foto')
  const hasVideo = m.includes('video') || m.includes('vídeo')

  if (hasVideo) return 'PHOTOS_VIDEO'
  if (hasDrone && hasPhoto) return 'PHOTOS_DRONE'
  if (hasDrone) return 'DRONE'
  if (hasPhoto) return 'PHOTOS'

  return null
}

function serviceTypeLabel(type: ServiceType): string {
  const labels: Record<ServiceType, string> = {
    PHOTOS: 'Photos',
    PHOTOS_VIDEO: 'Photos + Video',
    DRONE: 'Drone',
    PHOTOS_DRONE: 'Photos + Drone',
  }
  return labels[type]
}
