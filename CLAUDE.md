# Contexto do Projeto — MVP Agência de Fotografia

## O que é o sistema

Sistema de atendimento e agendamento automatizado via WhatsApp para uma agência de fotografia imobiliária. A agência realiza ~16 atendimentos/dia distribuídos entre 4 fotógrafos. Hoje o processo é 100% manual — um atendente responde mensagens, cruza agendas e calcula rotas. O sistema substitui isso.

O cliente contratou duas entregas:

**Plano 1 — Bot de triagem:**
- Atendimento 24/7 no WhatsApp
- Bot coleta endereço completo, tamanho do imóvel, contato e tipo de serviço
- FAQ automático sobre serviços e preços
- Atendente humano recebe os dados prontos no painel e só escolhe o horário final

**Plano 2 — Agendamento autônomo com lógica logística:**
- Cliente escolhe dia e horário direto no WhatsApp, sem intervenção humana
- Sistema oferece apenas slots viáveis considerando: tempo de deslocamento entre atendimentos (Google Routes API), janela de almoço dinâmica dos fotógrafos (11h–14h), e bloqueio automático de drones em dias de chuva
- Dashboard para o atendente humano supervisionar, resolver exceções e gerenciar casos fora do padrão

---

## Stack definida (não mude sem justificativa)

| Camada | Tecnologia |
|---|---|
| Monorepo | npm workspaces (sem Turborepo) |
| API | Node.js + TypeScript + Fastify + @fastify/sensible |
| ORM | Prisma |
| Banco | PostgreSQL (self-hosted em VPS) |
| Filas/Jobs | BullMQ + Redis |
| WhatsApp | Evolution API (self-hosted, webhook) |
| LLM | Groq SDK (modelo llama) |
| Rotas/Deslocamento | Google Routes API — método Compute Route Matrix |
| Dashboard | Next.js 15 + TypeScript + Tailwind CSS |
| Tipos compartilhados | packages/shared |

---

## Estrutura do monorepo

```
agencia-foto-bot/
├── apps/
│   ├── api/          # Fastify — lógica do bot, agendamento, webhooks
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   └── web/          # Next.js — painel do atendente
│       └── ...
├── packages/
│   └── shared/       # Tipos TypeScript compartilhados entre api e web
│       └── src/
│           └── index.ts
├── docker-compose.yml  # Postgres + Redis local
├── package.json        # raiz com workspaces
└── .env.example
```

---

## Variáveis de ambiente (apps/api/.env)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agencia_foto
REDIS_URL=redis://localhost:6379
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=
GOOGLE_MAPS_API_KEY=
GROQ_API_KEY=
PORT=3000
NODE_ENV=development
```

---

## Decisões de arquitetura — respeite todas

**Sem n8n ou qualquer orquestrador externo.** Toda lógica de negócio vive na API em TypeScript. Jobs agendados (verificação climática, geração de rota do dia) usam BullMQ repeatable jobs ou node-cron.

**O LLM só classifica intenção e extrai dados.** Groq/LLaMA recebe a mensagem do usuário e retorna JSON estruturado: `{ intencao: 'agendamento' | 'faq' | 'qualificacao', dados_extraidos: {...} }`. Decisão de agenda é código determinístico, nunca LLM.

**Estado da conversa fica no Postgres, por número de telefone.** O bot é multi-turno (pergunta endereço, espera, pergunta tamanho do imóvel, espera...). Cada mensagem que chega: API carrega o estado atual daquele número, processa, salva o novo estado. Sem estado em memória.

**A lógica de slots é determinística e baseada em restrições.** Para cada folga na agenda de um fotógrafo, o sistema verifica se o novo atendimento cabe considerando:
```
tempo_ida  = Routes API(local_anterior → endereço_novo)
tempo_volta = Routes API(endereço_novo → local_próximo)

início_mais_cedo = fim_anterior + tempo_ida
início_mais_tarde = início_próximo − tempo_volta − duração_serviço

se início_mais_cedo ≤ início_mais_tarde → slot viável
```
O almoço é posicionado dinamicamente na maior folga dentro da janela 11h–14h antes de calcular os slots. Horários são discretizados em intervalos de 30 min. São oferecidos no máximo 5 slots ao cliente no WhatsApp. Priorize slots onde o deslocamento total (ida + volta) é menor — isso agrupa por região naturalmente.

**Cache obrigatório nas chamadas à Routes API.** Cacheia por par de coordenadas arredondadas (4 casas decimais). Sem cache, um cliente testando vários dias dispara dezenas de chamadas pagas.

**O dashboard é ferramenta de exceção**, não de operação principal. O bot resolve 95% sozinho. O painel serve para: ver todos os leads e agendamentos, resolver conflitos, cancelar/remarcar, e receber leads que o bot não conseguiu qualificar.

---

## Fluxo principal do bot (visão geral)

```
Cliente envia mensagem no WhatsApp
  → Evolution API dispara webhook POST /webhook/whatsapp na API
  → API carrega estado da conversa daquele número no Postgres
  → Groq classifica intenção e extrai dados da mensagem
  → Branch por intenção:
      FAQ        → responde direto, mantém estado
      Qualificação → coleta dados em múltiplos turnos, salva no Postgres
      Agendamento → roda motor de slots, oferece horários, confirma, cria no Calendar
  → Envia resposta via Evolution API
  → Salva novo estado no Postgres
```

---

## Fase inicial — o que construir primeiro

Nesta fase inicial, o objetivo é ter o esqueleto funcional de ponta a ponta antes de qualquer feature completa. Ordem sugerida:

1. **Schema Prisma** — tabelas: `Fotografo`, `Lead`, `Conversa` (com campo `estado` JSON e `etapa`), `Agendamento` (com lat/long do imóvel), `CacheDeslocamento`. Rode `npx prisma migrate dev`.

2. **Webhook receiver** — rota `POST /webhook/whatsapp` que recebe o payload da Evolution API, valida, e loga o conteúdo. Nada mais por enquanto.

3. **Máquina de estados da conversa** — função pura `processarMensagem(estado_atual, mensagem) → { novo_estado, resposta }`. Começa com os estados: `INICIO`, `COLETANDO_ENDERECO`, `COLETANDO_TAMANHO`, `COLETANDO_TIPO_SERVICO`, `QUALIFICADO`, `ESCOLHENDO_HORARIO`, `CONFIRMADO`.

4. **Integração Groq** — função `classificarIntencao(mensagem: string): Promise<{ intencao, dados }>`. Use structured output / JSON mode.

5. **Envio de resposta** — função `enviarMensagem(numero: string, texto: string)` chamando a Evolution API.

6. **Rota de health check** — `GET /health` já existe no scaffold, garanta que sobe corretamente.

Não implemente o motor de slots nem a integração com Google Routes API ainda — isso vem depois do fluxo de qualificação estar estável.

---

## Observações finais

- Dois desenvolvedores no projeto. Mantenha código legível e bem tipado — o outro dev precisa entender sem pedir explicação.
- Prefira funções puras para a lógica de negócio (motor de slots, máquina de estados). São mais fáceis de testar.
- Erros do Fastify devem usar `@fastify/sensible` (`reply.badRequest()`, `reply.internalServerError()`, etc.).
- Toda comunicação com serviços externos (Groq, Evolution API, Google Routes) deve ter timeout explícito e tratamento de erro — esses serviços vão falhar eventualmente.
- O campo `estado` da tabela `Conversa` é JSON — guarda tudo que o bot precisa lembrar daquela conversa (dados já coletados, etapa atual, tentativas).