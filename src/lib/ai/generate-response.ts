import { generateText } from 'ai'
import { alibaba } from './provider'

interface GenerateAIResponseInput {
  prompt: string
  system: string
  model: string
}

export async function generateAIResponse({
  prompt,
  system,
  model,
}: GenerateAIResponseInput) {
  const { text } = await generateText({
    model: alibaba(model),
    system,
    prompt,
  })

  return text
}
