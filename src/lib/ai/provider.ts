import { createAlibaba } from '@ai-sdk/alibaba'
import { env } from '../../config/env'

export const alibaba = createAlibaba({
  apiKey: env.ALIBABA_API_KEY,
})
