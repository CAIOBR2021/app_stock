import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { Solicitacao } from '../types';
import { apiFetch, errorMessage } from '../utils/api';
import { ModalComponent } from './Shared';

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconInboxEmpty = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="44" height="44" style={{ color: 'var(--text-3)' }}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

export const SOLICITACOES_PENDENTES_KEY = ['solicitacoes', 'pendentes'];

/** Hook compartilhado com o App (badge no menu) — deduplicado pelo React Query. */
export function useSolicitacoesPendentes(enabled: boolean) {
  return useQuery({
    queryKey: SOLICITACOES_PENDENTES_KEY,
    queryFn: () => apiFetch<Solicitacao[]>('/solicitacoes?status=pendente'),
    enabled,
    refetchInterval: 30_000,
  });
}

/**
 * Página "Solicitações em Andamento" (perfil Almoxarifado): cards das
 * solicitações pendentes criadas pelos visitantes via chat, com ações de
 * Aceitar (baixa o estoque) e Recusar (motivo opcional).
 */
export function Solicitacoes({ nomeUsuario }: { nomeUsuario: string }) {
  const queryClient = useQueryClient();
  const { data: solicitacoes = [], isPending } = useSolicitacoesPendentes(true);

  const [recusando, setRecusando] = useState<Solicitacao | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  const invalidar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: SOLICITACOES_PENDENTES_KEY }),
      queryClient.invalidateQueries({ queryKey: ['produtos'] }),
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] }),
    ]);

  const aprovarMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/solicitacoes/${id}/aprovar`, {
        method: 'POST',
        body: { respondidoPor: nomeUsuario || undefined },
      }),
    onSuccess: async () => {
      await invalidar();
      toast.success('Solicitação aprovada e estoque atualizado.');
    },
    onError: async (err) => {
      // Ex.: saldo mudou desde que o card foi exibido → recarrega a lista
      await invalidar();
      toast.error(errorMessage(err, 'Não conseguimos aprovar a solicitação. Tente novamente em instantes.'));
    },
  });

  const recusarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      apiFetch(`/solicitacoes/${id}/recusar`, {
        method: 'POST',
        body: { respondidoPor: nomeUsuario || undefined, motivo: motivo || undefined },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SOLICITACOES_PENDENTES_KEY });
      setRecusando(null);
      setMotivoRecusa('');
      toast.success('Solicitação recusada.');
    },
    onError: (err) =>
      toast.error(errorMessage(err, 'Não conseguimos recusar a solicitação. Tente novamente em instantes.')),
  });

  const processando = aprovarMutation.isPending || recusarMutation.isPending;

  const formatDataHora = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (isPending) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div className="spinner-border" style={{ color: 'var(--primary)' }} role="status" />
        <p style={{ marginTop: '12px', color: 'var(--text-3)', fontSize: '13.5px' }}>Carregando solicitações...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <span style={{
          fontSize: '12px', fontWeight: 700, background: 'var(--warning-light)',
          color: 'var(--primary-dark)', border: '1.5px solid var(--warning)',
          borderRadius: '999px', padding: '4px 12px',
        }}>
          {solicitacoes.length} pendente{solicitacoes.length === 1 ? '' : 's'}
        </span>
        <span style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>
          Pedidos feitos por visitantes via chat. Ficam aqui até serem aceitos ou recusados.
        </span>
      </div>

      {solicitacoes.length === 0 ? (
        <div className="card-modern" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div className="mb-3"><IconInboxEmpty /></div>
          <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>Nenhuma solicitação pendente</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
            Quando um visitante solicitar material pelo chat, o pedido aparece aqui.
          </p>
        </div>
      ) : (
        <div className="row g-3">
          {solicitacoes.map((s) => {
            const saldo = s.saldoAtual ?? 0;
            const unidade = s.itemUnidade || s.unidadeMedida || '';
            const saldoInsuficiente = saldo < s.quantidade;
            return (
              <div key={s.id} className="col-12 col-md-6 col-xl-4">
                <div className="card-modern" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-1)', lineHeight: 1.3 }}>
                        {s.itemNome || 'Produto removido'}
                      </div>
                      <div style={{
                        display: 'inline-block', marginTop: '6px',
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: '8px', padding: '4px 10px',
                        fontSize: '13.5px', fontWeight: 700, color: 'var(--text-1)',
                      }}>
                        {s.quantidade} {unidade}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-3)' }}>
                        Saldo atual
                      </div>
                      <div style={{
                        fontSize: '14px', fontWeight: 700,
                        color: saldoInsuficiente ? 'var(--danger)' : 'var(--success)',
                      }}>
                        {saldo} {unidade}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', color: 'var(--text-2)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconUser /> <strong>{s.nomeSolicitante}</strong>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-3)' }}>
                      <IconClock /> {formatDataHora(s.criadoEm)}
                    </span>
                  </div>

                  {saldoInsuficiente && (
                    <div style={{
                      fontSize: '12px', color: 'var(--danger)', background: 'var(--danger-light)',
                      borderRadius: '8px', padding: '6px 10px', fontWeight: 600,
                    }}>
                      Saldo insuficiente para aprovar esta solicitação.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button
                      className="btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-1"
                      style={{
                        background: 'var(--success-light)', color: 'var(--success)',
                        border: '1.5px solid var(--success)', borderRadius: '8px',
                        height: '34px', fontSize: '13px', fontWeight: 700,
                      }}
                      disabled={processando}
                      onClick={() => aprovarMutation.mutate(s.id)}
                    >
                      <IconCheck /> Aceitar
                    </button>
                    <button
                      className="btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-1"
                      style={{
                        background: 'var(--danger-light)', color: 'var(--danger)',
                        border: '1.5px solid var(--danger)', borderRadius: '8px',
                        height: '34px', fontSize: '13px', fontWeight: 700,
                      }}
                      disabled={processando}
                      onClick={() => { setRecusando(s); setMotivoRecusa(''); }}
                    >
                      <IconX /> Recusar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {recusando && (
        <ModalComponent title="Recusar Solicitação" onClose={() => setRecusando(null)}>
          <p style={{ fontSize: '13.5px', color: 'var(--text-2)' }}>
            Recusar <strong>{recusando.quantidade} {recusando.itemUnidade || recusando.unidadeMedida || ''} de {recusando.itemNome}</strong>{' '}
            solicitado por <strong>{recusando.nomeSolicitante}</strong>? O estoque não será alterado.
          </p>
          <div className="mb-3">
            <label className="form-label">Motivo (opcional)</label>
            <textarea
              className="form-control"
              rows={3}
              maxLength={300}
              placeholder="Ex.: material reservado para outra obra"
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
            />
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setRecusando(null)}>Cancelar</button>
            <button
              className="btn btn-danger"
              disabled={recusarMutation.isPending}
              onClick={() => recusarMutation.mutate({ id: recusando.id, motivo: motivoRecusa.trim() })}
            >
              Confirmar recusa
            </button>
          </div>
        </ModalComponent>
      )}
    </div>
  );
}
