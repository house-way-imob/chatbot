import { generateAIResponse } from './generate-response'
import { ATTENDANT_SYSTEM } from './prompts'

const MODEL = 'qwen3.6-flash'
const TIMEOUT_MS = 20_000

const FALLBACK =
  'Boa pergunta! 😊 Vou chamar um atendente para te ajudar com isso.\n\n' +
  'Enquanto isso, posso te ajudar a agendar uma sessão de fotografia. ' +
  'Qual é o endereço do imóvel?'

export async function answerFaq(question: string): Promise<string> {
  try {
    const answer = await Promise.race([
      generateAIResponse({
        prompt: question,
        system: ATTENDANT_SYSTEM,
        model: MODEL,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), TIMEOUT_MS),
      ),
    ])

    return answer.trim()
  } catch (err) {
    console.warn('[ai] answerFaq failed, using fallback:', err instanceof Error ? err.message : err)
    return FALLBACK
  }
}
