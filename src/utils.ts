import type { Entrega } from './types';

export const isDelivered = (status: string | undefined) => {
  return status?.trim().toLowerCase() === 'entregue';
};

/** Entrega como pode vir do backend, com variações antigas de nome de campo. */
type RawEntrega = Partial<Entrega> & {
  produtoid?: string;
  localArmazenamento?: string;
};

export const normalizeEntrega = (e: RawEntrega): Entrega => {
  return {
    ...e,
    produtoId: e.produtoId || e.produtoid || '',
    localArmazenagem: e.localArmazenagem || e.localArmazenamento || '',
    dataHoraSolicitacao: e.dataHoraSolicitacao || new Date().toISOString()
  } as Entrega;
};

// ── VISIBILIDADE POR CATEGORIA ───────────────────────────────────────────────
// Itens de EPI são exclusivos do perfil Segurança do Trabalho: ninguém mais os
// enxerga em listagens, filtros, movimentações ou relatórios em PDF.

/** Categoria de acesso restrito. */
export const CATEGORIA_RESTRITA = 'EPI';

/** Compara a categoria com 'EPI' ignorando caixa e espaços em volta. */
export const isCategoriaEPI = (categoria?: string | null): boolean =>
  (categoria ?? '').trim().toUpperCase() === CATEGORIA_RESTRITA;

/** Único perfil autorizado a enxergar itens de EPI. */
export const podeVerEPI = (perfil?: string | null): boolean => perfil === 'seguranca';

/** Remove os itens de EPI da lista quando o perfil não tem permissão de vê-los. */
export const filtrarVisiveisPorPerfil = <T extends { categoria?: string | null }>(
  itens: T[],
  perfil?: string | null,
): T[] => (podeVerEPI(perfil) ? itens : itens.filter((i) => !isCategoriaEPI(i.categoria)));

export const formatPhoneNumber = (value: string) => {
  if (!value) return "";
  const v = value.replace(/\D/g, ''); 
  const matchCel = v.match(/^(\d{2})(\d{5})(\d{4})$/);
  if (matchCel) return `(${matchCel[1]}) ${matchCel[2]}-${matchCel[3]}`;
  const matchFixo = v.match(/^(\d{2})(\d{4})(\d{4})$/);
  if (matchFixo) return `(${matchFixo[1]}) ${matchFixo[2]}-${matchFixo[3]}`;
  return value;
};