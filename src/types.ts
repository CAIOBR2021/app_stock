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

declare global {
  interface Window {
    jspdf: any;
  }
}

