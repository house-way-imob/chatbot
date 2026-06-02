// Deve estar em sincronia com os enums do schema.prisma

export type EtapaConversa =
  | "INICIO"
  | "COLETANDO_ENDERECO"
  | "COLETANDO_TAMANHO"
  | "COLETANDO_TIPO_SERVICO"
  | "QUALIFICADO"
  | "ESCOLHENDO_HORARIO"
  | "CONFIRMADO"

export type TipoServico = "FOTO" | "FOTO_VIDEO" | "DRONE" | "FOTO_DRONE"

export type DadosColetados = {
  endereco?: string
  tamanho?: string
  tipoServico?: TipoServico
}

export type EstadoConversa = {
  etapa: EtapaConversa
  dados: DadosColetados
  tentativas: number
}

export type ResultadoProcessamento = {
  novoEstado: EstadoConversa
  resposta: string
}
