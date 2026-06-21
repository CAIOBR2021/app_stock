export const API_URL = import.meta.env.VITE_API_URL as string;
export const PING_URL = import.meta.env.VITE_PING_URL as string;
export const ITEMS_PER_PAGE = 30;

const UNIDADES_INTEIRAS = new Set([
  'un', 'pç', 'pc', 'cx', 'caixa', 'caixas',
  'peca', 'peça', 'pecas', 'peças',
  'unidade', 'unidades',
  'par', 'pares',
  'rolo', 'rolos',
  'saco', 'sacos',
  'balde', 'baldes',
  'lata', 'latas',
  'galão', 'galao', 'galões', 'galoes',
  'tubo', 'tubos',
  'pacote', 'pacotes', 'pct',
  'folha', 'folhas', 'fl',
  'bloco', 'blocos',
]);

export function isUnidadeInteira(unidade: string): boolean {
  return UNIDADES_INTEIRAS.has(unidade.trim().toLowerCase());
}

export function sanitizeQuantidade(valor: number, unidade: string): number {
  return isUnidadeInteira(unidade) ? Math.round(valor) : valor;
}