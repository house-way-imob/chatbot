import { Worker } from 'bullmq'
import { processBufferedEvolutionMessages } from '../http/modules/evolution/service'
import { queueConnection } from '../lib/queue/connection'

new Worker(
  'whatsapp-messages',
  async (job) => {
    const { phone } = job.data as { phone: string }

    await processBufferedEvolutionMessages(phone)
  },
  {
    connection: queueConnection,
    concurrency: 5,
  },
)
