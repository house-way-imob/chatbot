// Must stay in sync with the step/serviceType/status columns in the DB schema

export type ConversationStep =
  | 'START'
  | 'COLLECTING_ADDRESS'
  | 'COLLECTING_SIZE'
  | 'COLLECTING_SERVICE_TYPE'
  | 'QUALIFIED'
  | 'CHOOSING_SLOT'
  | 'CONFIRMED'

export type ServiceType = 'PHOTOS' | 'PHOTOS_VIDEO' | 'DRONE' | 'PHOTOS_DRONE'

export type CollectedData = {
  address?: string
  size?: string
  serviceType?: ServiceType
}

export type ConversationState = {
  step: ConversationStep
  data: CollectedData
  attempts: number
}

export type ProcessingResult = {
  newState: ConversationState
  response: string
}
