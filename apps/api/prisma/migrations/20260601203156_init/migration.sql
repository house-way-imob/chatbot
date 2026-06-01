-- CreateEnum
CREATE TYPE "EtapaConversa" AS ENUM ('INICIO', 'COLETANDO_ENDERECO', 'COLETANDO_TAMANHO', 'COLETANDO_TIPO_SERVICO', 'QUALIFICADO', 'ESCOLHENDO_HORARIO', 'CONFIRMADO');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "TipoServico" AS ENUM ('FOTO', 'FOTO_VIDEO', 'DRONE', 'FOTO_DRONE');

-- CreateTable
CREATE TABLE "fotografos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fotografos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversas" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "etapa" "EtapaConversa" NOT NULL DEFAULT 'INICIO',
    "estado" JSONB NOT NULL DEFAULT '{}',
    "ultimaMensagemEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fotografoId" TEXT NOT NULL,
    "dataHoraInicio" TIMESTAMP(3) NOT NULL,
    "dataHoraFim" TIMESTAMP(3) NOT NULL,
    "enderecoImovel" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "tipoServico" "TipoServico" NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache_deslocamento" (
    "id" TEXT NOT NULL,
    "origemLat" DOUBLE PRECISION NOT NULL,
    "origemLng" DOUBLE PRECISION NOT NULL,
    "destinoLat" DOUBLE PRECISION NOT NULL,
    "destinoLng" DOUBLE PRECISION NOT NULL,
    "duracaoSegundos" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cache_deslocamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fotografos_telefone_key" ON "fotografos"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "leads_telefone_key" ON "leads"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "conversas_telefone_key" ON "conversas"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "conversas_leadId_key" ON "conversas"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "cache_deslocamento_origemLat_origemLng_destinoLat_destinoLn_key" ON "cache_deslocamento"("origemLat", "origemLng", "destinoLat", "destinoLng");

-- AddForeignKey
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_fotografoId_fkey" FOREIGN KEY ("fotografoId") REFERENCES "fotografos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
