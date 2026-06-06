export const INTENT_CLASSIFIER_SYSTEM = `Você é um classificador de intenções para o bot de atendimento de uma agência de fotografia imobiliária.

Analise a mensagem do usuário e retorne um JSON com a seguinte estrutura:

{
  "intent": "qualification" | "faq" | "off_topic",
  "extractedData": {
    "address": string | null,
    "size": string | null,
    "serviceType": "PHOTOS" | "PHOTOS_VIDEO" | "DRONE" | "PHOTOS_DRONE" | null
  }
}

Regras de classificação:

- "qualification": o usuário está fornecendo dados para agendamento (endereço, tamanho do imóvel, tipo de serviço) ou respondendo às perguntas do fluxo de coleta (ex: "80m²", "3 quartos", "1", "fotos", "quero agendar").
- "faq": o usuário está fazendo uma pergunta sobre serviços, preços, prazos, funcionamento ou qualquer dúvida sobre a agência.
- "off_topic": a mensagem não tem relação com fotografia imobiliária ou agendamento (ex: mensagens pessoais, spam, saudações genéricas sem contexto).

Extração de dados (somente quando intent = "qualification"):
- "address": endereço completo se mencionado, senão null
- "size": tamanho do imóvel se mencionado (m², quartos, descrição), senão null
- "serviceType": tipo de serviço se identificável — "PHOTOS" para fotos, "PHOTOS_VIDEO" para fotos+vídeo, "DRONE" para drone, "PHOTOS_DRONE" para fotos+drone. Senão null.

Retorne APENAS o JSON, sem explicações, sem markdown.`

export const FAQ_ANSWERS: Record<string, string> = {
  preco:
    'Nossos preços variam conforme o serviço:\n\n' +
    '📷 *Fotos*: a partir de R$ 350\n' +
    '🎥 *Fotos + Vídeo*: a partir de R$ 550\n' +
    '🚁 *Drone*: a partir de R$ 450\n' +
    '📷🚁 *Fotos + Drone*: a partir de R$ 650\n\n' +
    'O valor final depende do tamanho do imóvel. Quer fazer um orçamento?',
  prazo:
    'As fotos ficam prontas em até *48 horas* após a sessão. ' +
    'Para vídeos e drone, o prazo é de até *72 horas*. 📅',
  entrega:
    'As fotos são entregues por link de download em alta resolução. ' +
    'Você recebe o link diretamente no WhatsApp assim que estiverem prontas! 📲',
  cancelamento:
    'Cancelamentos com *mais de 24h de antecedência* são gratuitos. ' +
    'Para cancelamentos com menos de 24h, cobramos 30% do valor do serviço.',
  drone:
    'O serviço de drone está sujeito à *condição climática* e às *restrições de voo* da região. ' +
    'Em caso de chuva ou área restrita, remarcamos sem custo adicional. 🚁',
}
