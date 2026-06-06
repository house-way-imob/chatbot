import { Worker } from 'bullmq'
import { processBufferedEvolutionMessages } from '../http/modules/evolution/service'
import { queueConnection } from '../lib/queue/connection'

new Worker(
  'whatsapp-messages',
  async (job) => {
    const { jid } = job.data as { jid: string }

    await processBufferedEvolutionMessages(jid)
  },
  {
    connection: queueConnection,
    concurrency: 5,
  },
)
