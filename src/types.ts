export type UUID = string;

export interface FatorConversao {
  unidade: string;
  fator: number;
}

export interface Produto {
  id: UUID;
  sku: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  unidade: string;
  quantidade: number;
  estoqueMinimo?: number;
  localArmazenamento?: string;
  fornecedor?: string;
  criadoEm: string;
  atualizadoEm?: string;
  prioritario?: boolean;
  valorUnitario?: number;
  conversoes?: FatorConversao[];
}

export type TipoMov = 'entrada' | 'saida' | 'ajuste' | 'saldo_inicial';

export interface Movimentacao {
  id: UUID;
  produtoId: UUID;
  tipo: TipoMov;
  quantidade: number;
  motivo?: string;
  criadoEm: string;
  // Novos campos para rastreio de custos e obras
  nomeObra?: string;
  ordemCompra?: string;
  custoUnitarioHistorico?: number;
  dataCompetencia?: string;   // ← adiciona esta linha
  operadorNome?: string;      // ← nome de quem registou a movimentação
}

export interface Entrega {
    id: UUID;
    dataHoraSolicitacao: string;
    localArmazenagem: string; 
    localArmazenamento?: string; 
    localObra: string;
    produtoId: UUID;
    itemNome?: string;
    sku?: string;
    itemQuantidade: number;
    itemUnidadeMedida?: string;
    responsavelNome?: string;
    responsavelTelefone?: string;
    status: string;
}

export type SolicitacaoStatus = 'pendente' | 'aprovada' | 'recusada';

/** Solicitação de material criada pelo visitante via chat com a IA. */
export interface Solicitacao {
  id: UUID;
  nomeSolicitante: string;
  itemId: UUID;
  quantidade: number;
  unidadeMedida?: string;
  status: SolicitacaoStatus;
  motivoRecusa?: string;
  criadoEm: string;
  respondidoEm?: string;
  respondidoPor?: string;
  // Campos derivados do JOIN com produtos
  itemNome?: string;
  itemUnidade?: string;
  saldoAtual?: number;
}

/** Payload enviado pelo formulário de entregas (DeliveryForm). */
export interface EntregaPayload {
  localArmazenagem: string;
  localObra: string;
  produtoId: string;
  itemNome: string;
  itemQuantidade: number;
  responsavelNome?: string;
  responsavelTelefone?: string;
  dataHoraSolicitacao: string;
}

/** Dados do formulário de entrada/saída em lote (EntradaSaidaForm e NotaFiscalReader). */
export interface LoteMovimentacaoDados {
  tipo: 'entrada' | 'saida';
  itens: { produtoId: string; quantidade: number; valorUnitario?: number }[];
  ordemCompra?: string;
  nomeObra?: string;
  dataCompetencia?: string;
}

declare global {
  interface Window {
    jspdf: any;
  }
}

