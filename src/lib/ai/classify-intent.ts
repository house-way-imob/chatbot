import type { ServiceType } from '../../conversations/types'
import { generateAIResponse } from './generate-response'
import { INTENT_CLASSIFIER_SYSTEM } from './prompts'

const MODEL = 'qwen3.6-flash'
const TIMEOUT_MS = 8_000

export type Intent = 'qualification' | 'faq' | 'off_topic'

export interface ExtractedData {
  address: string | null
  size: string | null
  serviceType: ServiceType | null
}

export interface ClassifiedIntent {
  intent: Intent
  extractedData: ExtractedData
}

const EMPTY_DATA: ExtractedData = { address: null, size: null, serviceType: null }

export async function classifyIntent(message: string): Promise<ClassifiedIntent> {
  try {
    const raw = await Promise.race([
      generateAIResponse({
        prompt: message,
        system: INTENT_CLASSIFIER_SYSTEM,
        model: MODEL,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), TIMEOUT_MS),
      ),
    ])

    const parsed = JSON.parse(raw) as ClassifiedIntent
    if (!parsed.intent) throw new Error('missing intent field')

    return {
      intent: parsed.intent,
      extractedData: parsed.extractedData ?? EMPTY_DATA,
    }
  } catch (err) {
    console.warn('[ai] classifyIntent failed, falling back to qualification:', err instanceof Error ? err.message : err)
    return { intent: 'qualification', extractedData: EMPTY_DATA }
  }
}
