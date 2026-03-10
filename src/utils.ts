import type { Entrega } from './types';

export const isDelivered = (status: string | undefined) => {
  return status?.trim().toLowerCase() === 'entregue';
};

export const normalizeEntrega = (e: any): Entrega => {
  return {
    ...e,
    produtoId: e.produtoId || e.produtoid || '',
    localArmazenagem: e.localArmazenagem || e.localArmazenamento || '',
    dataHoraSolicitacao: e.dataHoraSolicitacao || new Date().toISOString()
  };
};

export const formatPhoneNumber = (value: string) => {
  if (!value) return "";
  const v = value.replace(/\D/g, ''); 
  const matchCel = v.match(/^(\d{2})(\d{5})(\d{4})$/);
  if (matchCel) return `(${matchCel[1]}) ${matchCel[2]}-${matchCel[3]}`;
  const matchFixo = v.match(/^(\d{2})(\d{4})(\d{4})$/);
  if (matchFixo) return `(${matchFixo[1]}) ${matchFixo[2]}-${matchFixo[3]}`;
  return value;
};