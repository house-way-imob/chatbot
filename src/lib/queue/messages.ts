import { Queue } from 'bullmq'
import { queueConnection } from './connection'

export const messagesQueue = new Queue('whatsapp-messages', {
  connection: queueConnection,
})
