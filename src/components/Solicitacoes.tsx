import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { Solicitacao } from '../types';
import { apiFetch, errorMessage } from '../utils/api';
import { ModalComponent, Paginacao } from './Shared';

const HISTORICO_POR_PAGINA = 20;

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
const IconClockSm = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconBoxSm = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const IconInboxEmpty = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="34" height="34">
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

/** "10 sacos", "3 galões", "2,5 kg" — pluraliza só unidades por extenso. */
function formatQtd(quantidade: number, unidade: string): string {
  const qtd = quantidade.toLocaleString('pt-BR');
  const u = (unidade || '').trim();
  if (!u) return qtd;
  if (quantidade === 1 || u.length <= 2 || !/^[a-zà-ú]+$/i.test(u) || u.endsWith('s')) {
    return `${qtd} ${u}`;
  }
  if (u.toLowerCase().endsWith('ão')) return `${qtd} ${u.slice(0, -2)}ões`;
  if (/[rz]$/i.test(u)) return `${qtd} ${u}es`;
  return `${qtd} ${u}s`;
}

function tempoRelativo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}

const formatDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';

/**
 * Página "Solicitações em Andamento" (perfil Almoxarifado): pedidos criados
 * pelos visitantes via chat. Aba Pendentes (aceitar/recusar) + aba Histórico.
 */
export function Solicitacoes({ nomeUsuario }: { nomeUsuario: string }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'pendentes' | 'historico'>('pendentes');
  const { data: pendentes = [], isPending: carregandoPendentes } = useSolicitacoesPendentes(true);

  const historicoQuery = useQuery({
    queryKey: ['solicitacoes', 'todas'],
    queryFn: () => apiFetch<Solicitacao[]>('/solicitacoes?status=todas'),
    enabled: tab === 'historico',
  });
  const historico = useMemo(
    () =>
      (historicoQuery.data ?? [])
        .filter((s) => s.status !== 'pendente')
        .sort((a, b) => new Date(b.respondidoEm || 0).getTime() - new Date(a.respondidoEm || 0).getTime()),
    [historicoQuery.data],
  );

  const [recusando, setRecusando] = useState<Solicitacao | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const historicoPaginado = useMemo(
    () => historico.slice((paginaHistorico - 1) * HISTORICO_POR_PAGINA, paginaHistorico * HISTORICO_POR_PAGINA),
    [historico, paginaHistorico],
  );

  const invalidar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] }),
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
      await queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      setRecusando(null);
      setMotivoRecusa('');
      toast.success('Solicitação recusada.');
    },
    onError: (err) =>
      toast.error(errorMessage(err, 'Não conseguimos recusar a solicitação. Tente novamente em instantes.')),
  });

  const processando = aprovarMutation.isPending || recusarMutation.isPending;

  return (
    <div>
      {/* ── Abas + resumo ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px', marginBottom: '20px',
      }}>
        <div className="sol-tabs">
          <button
            className={`sol-tab ${tab === 'pendentes' ? 'active' : ''}`}
            onClick={() => setTab('pendentes')}
          >
            Pendentes
            {pendentes.length > 0 && <span className="sol-tab-badge">{pendentes.length}</span>}
          </button>
          <button
            className={`sol-tab ${tab === 'historico' ? 'active' : ''}`}
            onClick={() => { setTab('historico'); setPaginaHistorico(1); }}
          >
            Histórico
          </button>
        </div>
        <span className="d-none d-md-inline" style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>
          Pedidos feitos por visitantes via chat · aguardam decisão manual, sem prazo de expiração
        </span>
      </div>

      {/* ── PENDENTES ── */}
      {tab === 'pendentes' && (
        carregandoPendentes ? (
          <div className="row g-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="col-12 col-md-6 col-xl-4">
                <div className="card-modern sol-skeleton" style={{ height: '210px' }} />
              </div>
            ))}
          </div>
        ) : pendentes.length === 0 ? (
          <div className="card-modern" style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px', color: 'var(--text-3)',
            }}>
              <IconInboxEmpty />
            </div>
            <p style={{ fontWeight: 700, fontSize: '15.5px', color: 'var(--text-1)', marginBottom: '6px' }}>
              Tudo em dia por aqui
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 auto', maxWidth: '340px', lineHeight: 1.6 }}>
              Quando um visitante solicitar material pelo chat, o pedido aparece
              nesta página para você aceitar ou recusar.
            </p>
          </div>
        ) : (
          <div className="row g-3">
            {pendentes.map((s) => {
              const saldo = s.saldoAtual ?? 0;
              const unidade = s.itemUnidade || s.unidadeMedida || '';
              const saldoInsuficiente = saldo < s.quantidade;
              return (
                <div key={s.id} className="col-12 col-md-6 col-xl-4">
                  <div className="card-modern sol-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px' }}>
                    {/* Solicitante */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <span style={{
                        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                        color: 'var(--on-primary)', fontWeight: 700, fontSize: '14px', letterSpacing: '.5px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {iniciais(s.nomeSolicitante)}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.nomeSolicitante}
                        </div>
                        <div
                          title={formatDataHora(s.criadoEm)}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px' }}
                        >
                          <IconClockSm /> {tempoRelativo(s.criadoEm)} · {formatDataHora(s.criadoEm)}
                        </div>
                      </div>
                    </div>

                    <hr style={{ margin: 0, borderColor: 'var(--border)', opacity: 1 }} />

                    {/* Material + quantidade */}
                    <div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '.7px', color: 'var(--text-3)', marginBottom: '6px',
                      }}>
                        <IconBoxSm /> Material solicitado
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-1)', lineHeight: 1.35 }}>
                        {s.itemNome || 'Produto removido'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                          background: 'var(--accent)', color: 'var(--primary)',
                          borderRadius: '8px', padding: '5px 12px',
                          fontSize: '14px', fontWeight: 700, letterSpacing: '.2px',
                        }}>
                          {formatQtd(s.quantidade, unidade)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-2)' }}>
                          <span style={{
                            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                            background: saldoInsuficiente ? 'var(--danger)' : 'var(--success)',
                          }} />
                          Saldo: <strong style={{ color: saldoInsuficiente ? 'var(--danger)' : 'var(--success)' }}>
                            {formatQtd(saldo, unidade)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {saldoInsuficiente && (
                      <div style={{
                        fontSize: '12px', color: 'var(--danger)', background: 'var(--danger-light)',
                        borderRadius: '8px', padding: '7px 11px', fontWeight: 600, lineHeight: 1.45,
                      }}>
                        Saldo insuficiente — reponha o estoque antes de aprovar.
                      </div>
                    )}

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      <button
                        className="sol-btn sol-btn-aceitar"
                        disabled={processando}
                        onClick={() => aprovarMutation.mutate(s.id)}
                      >
                        <IconCheck /> Aceitar
                      </button>
                      <button
                        className="sol-btn sol-btn-recusar"
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
        )
      )}

      {/* ── HISTÓRICO ── */}
      {tab === 'historico' && (
        historicoQuery.isPending ? (
          <div className="card-modern sol-skeleton" style={{ height: '180px' }} />
        ) : historico.length === 0 ? (
          <div className="card-modern" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>Nenhuma decisão registrada</p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
              As solicitações aceitas ou recusadas ficam registradas aqui.
            </p>
          </div>
        ) : (
          <>
          <div className="card-modern" style={{ padding: 0, overflow: 'hidden' }}>
            {historicoPaginado.map((s, i) => {
              const aprovada = s.status === 'aprovada';
              const unidade = s.itemUnidade || s.unidadeMedida || '';
              return (
                <div key={s.id} style={{
                  display: 'flex', gap: '14px', alignItems: 'flex-start',
                  padding: '15px 20px',
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{
                    marginTop: '2px', flexShrink: 0,
                    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px',
                    padding: '4px 10px', borderRadius: '999px',
                    background: aprovada ? 'var(--success-light)' : 'var(--danger-light)',
                    color: aprovada ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {aprovada ? 'Aprovada' : 'Recusada'}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13.5px', color: 'var(--text-1)' }}>
                      <strong>{formatQtd(s.quantidade, unidade)}</strong> de <strong>{s.itemNome || 'Produto removido'}</strong>
                      <span style={{ color: 'var(--text-3)' }}> · solicitado por </span>{s.nomeSolicitante}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '3px' }}>
                      {aprovada ? 'Aprovada' : 'Recusada'} por <strong>{s.respondidoPor || '—'}</strong>
                      {s.respondidoEm ? ` em ${formatDataHora(s.respondidoEm)}` : ''}
                      {!aprovada && s.motivoRecusa && (
                        <span style={{ fontStyle: 'italic' }}> — “{s.motivoRecusa}”</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {historico.length > HISTORICO_POR_PAGINA && (
            <div className="mt-4 d-flex justify-content-center">
              <Paginacao
                totalItems={historico.length}
                itemsPerPage={HISTORICO_POR_PAGINA}
                currentPage={paginaHistorico}
                onPageChange={setPaginaHistorico}
              />
            </div>
          )}
          </>
        )
      )}

      {/* ── Modal de recusa ── */}
      {recusando && (
        <ModalComponent title="Recusar Solicitação" onClose={() => setRecusando(null)}>
          <p style={{ fontSize: '13.5px', color: 'var(--text-2)' }}>
            Recusar <strong>{formatQtd(recusando.quantidade, recusando.itemUnidade || recusando.unidadeMedida || '')} de {recusando.itemNome}</strong>{' '}
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

      <style>{`
        .sol-tabs {
          display: inline-flex; gap: 4px; padding: 4px;
          background: var(--surface-2); border: 1px solid var(--border);
          border-radius: 12px;
        }
        .sol-tab {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; background: transparent; cursor: pointer;
          padding: 8px 18px; border-radius: 9px;
          font-size: 13px; font-weight: 600; color: var(--text-2);
          transition: all 150ms ease;
        }
        .sol-tab:hover { color: var(--text-1); }
        .sol-tab.active {
          background: var(--accent); color: var(--on-dark-1);
          box-shadow: 0 2px 8px rgba(30,27,46,.25);
        }
        .sol-tab-badge {
          min-width: 19px; height: 19px; line-height: 19px; padding: 0 6px;
          border-radius: 999px; text-align: center;
          font-size: 11px; font-weight: 700;
          background: var(--primary); color: var(--on-primary);
        }
        .sol-card { transition: transform 160ms ease, box-shadow 160ms ease; }
        .sol-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(30,27,46,.10); }
        .sol-btn {
          flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          height: 37px; border-radius: 9px; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 150ms ease;
        }
        .sol-btn:disabled { opacity: .55; cursor: default; }
        .sol-btn-aceitar {
          background: var(--success); color: var(--on-success); border: 1.5px solid var(--success);
        }
        .sol-btn-aceitar:hover:not(:disabled) { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(34,197,94,.30); }
        .sol-btn-recusar {
          background: transparent; color: var(--text-2); border: 1.5px solid var(--border);
        }
        .sol-btn-recusar:hover:not(:disabled) {
          color: var(--danger); border-color: var(--danger); background: var(--danger-light);
        }
        .sol-skeleton {
          animation: solPulse 1.4s ease-in-out infinite;
          background: linear-gradient(100deg, var(--surface) 40%, var(--surface-2) 50%, var(--surface) 60%);
          background-size: 200% 100%;
        }
        @keyframes solPulse {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}
