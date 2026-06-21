import { useState, useMemo } from 'react';
import type { Produto, Movimentacao } from '../types';
import { Paginacao } from './Shared';

const ITEMS_PER_PAGE = 15;

interface Props {
  produtos: Produto[];
  movimentacoes: Movimentacao[];
}

interface PrevisaoProduto {
  produto: Produto;
  consumoMedioSemanal: number;
  diasParaAcabar: number | null;
  totalSaidas: number;
  periodoAnaliseDias: number;
  urgencia: 'critico' | 'alerta' | 'atencao' | 'ok';
}

const URGENCIA_CONFIG = {
  critico: { label: 'Crítico', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', iconBg: '#FEE2E2' },
  alerta: { label: 'Alerta', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', iconBg: '#FFEDD5' },
  atencao: { label: 'Atenção', color: '#CA8A04', bg: '#FEFCE8', border: '#FDE68A', iconBg: '#FEF9C3' },
  ok: { label: 'Normal', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', iconBg: '#DCFCE7' },
};

function calcularUrgencia(diasParaAcabar: number | null, produto: Produto): PrevisaoProduto['urgencia'] {
  if (produto.quantidade === 0) return 'critico';
  if (diasParaAcabar === null) return 'ok';
  if (diasParaAcabar <= 7) return 'critico';
  if (diasParaAcabar <= 14) return 'alerta';
  if (diasParaAcabar <= 30) return 'atencao';
  return 'ok';
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconActivity = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CARD_ICONS: Record<string, () => JSX.Element> = {
  critico: IconAlertTriangle,
  alerta: IconZap,
  atencao: IconClock,
  ok: IconCheckCircle,
};

export function PrevisaoConsumo({ produtos, movimentacoes }: Props) {
  const [periodoAnalise, setPeriodoAnalise] = useState<number>(90);
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [alertasOpen, setAlertasOpen] = useState(false);

  const previsoes = useMemo(() => {
    const agora = new Date();
    const dataLimite = new Date(agora.getTime() - periodoAnalise * 24 * 60 * 60 * 1000);

    return produtos.map((produto): PrevisaoProduto => {
      const saidasProduto = movimentacoes.filter(
        (m) =>
          m.produtoId === produto.id &&
          m.tipo === 'saida' &&
          new Date(m.dataCompetencia || m.criadoEm) >= dataLimite,
      );

      const totalSaidas = saidasProduto.reduce((acc, m) => acc + m.quantidade, 0);

      let periodoEfetivoDias = periodoAnalise;
      if (saidasProduto.length > 0) {
        const datas = saidasProduto.map((m) => new Date(m.dataCompetencia || m.criadoEm).getTime());
        const maisAntiga = Math.min(...datas);
        const diasDesdeInicio = Math.max(1, Math.ceil((agora.getTime() - maisAntiga) / (24 * 60 * 60 * 1000)));
        periodoEfetivoDias = Math.min(periodoAnalise, diasDesdeInicio);
      }

      const consumoDiario = periodoEfetivoDias > 0 ? totalSaidas / periodoEfetivoDias : 0;
      const consumoMedioSemanal = consumoDiario * 7;

      let diasParaAcabar: number | null = null;
      if (consumoDiario > 0 && produto.quantidade > 0) {
        diasParaAcabar = Math.ceil(produto.quantidade / consumoDiario);
      } else if (consumoDiario > 0 && produto.quantidade === 0) {
        diasParaAcabar = 0;
      }

      return { produto, consumoMedioSemanal, diasParaAcabar, totalSaidas, periodoAnaliseDias: periodoEfetivoDias, urgencia: calcularUrgencia(diasParaAcabar, produto) };
    });
  }, [produtos, movimentacoes, periodoAnalise]);

  const previsoesFiltradas = useMemo(() => {
    let result = previsoes.filter((p) => p.totalSaidas > 0 || p.produto.quantidade === 0);
    if (filtroUrgencia !== 'todos') result = result.filter((p) => p.urgencia === filtroUrgencia);
    if (busca.trim()) {
      const tokens = busca.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((p) => {
        const texto = [p.produto.nome, p.produto.sku, p.produto.categoria ?? '', p.produto.fornecedor ?? ''].join(' ').toLowerCase();
        return tokens.every((t) => texto.includes(t));
      });
    }
    result.sort((a, b) => {
      if (a.diasParaAcabar === null && b.diasParaAcabar === null) return 0;
      if (a.diasParaAcabar === null) return 1;
      if (b.diasParaAcabar === null) return -1;
      return a.diasParaAcabar - b.diasParaAcabar;
    });
    return result;
  }, [previsoes, filtroUrgencia, busca]);

  const contadores = useMemo(() => ({
    critico: previsoes.filter((p) => p.urgencia === 'critico').length,
    alerta: previsoes.filter((p) => p.urgencia === 'alerta').length,
    atencao: previsoes.filter((p) => p.urgencia === 'atencao').length,
    ok: previsoes.filter((p) => p.urgencia === 'ok' && p.totalSaidas > 0).length,
  }), [previsoes]);

  const paginatedPrevisoes = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return previsoesFiltradas.slice(start, start + ITEMS_PER_PAGE);
  }, [previsoesFiltradas, page]);

  const alertasCompra = useMemo(
    () => previsoes.filter((p) => p.urgencia === 'critico' || p.urgencia === 'alerta'),
    [previsoes],
  );

  return (
    <div>
      {/* ── Header ── */}
      <div className="card-modern" style={{ padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              boxShadow: '0 4px 12px rgba(102,126,234,.25)',
            }}>
              <IconActivity />
            </div>
            <div>
              <h5 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-1)' }}>
                Previsão de Consumo e Reposição
              </h5>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-3)' }}>
                Análise preditiva baseada no histórico de saídas
              </p>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--surface-2)', borderRadius: '8px', padding: '6px 12px',
            border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>Período:</span>
            <select
              value={periodoAnalise}
              onChange={(e) => { setPeriodoAnalise(Number(e.target.value)); setPage(1); }}
              style={{
                border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 700,
                color: 'var(--text-1)', cursor: 'pointer', outline: 'none', padding: '0 2px',
              }}
            >
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
              <option value={180}>6 meses</option>
              <option value={365}>1 ano</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="row g-3" style={{ marginBottom: '20px' }}>
        {([
          { key: 'critico', titulo: 'Críticos', sub: 'Esgotam em até 7 dias' },
          { key: 'alerta', titulo: 'Em Alerta', sub: 'Entre 8 e 14 dias' },
          { key: 'atencao', titulo: 'Atenção', sub: 'Entre 15 e 30 dias' },
          { key: 'ok', titulo: 'Normal', sub: 'Mais de 30 dias' },
        ] as const).map(({ key, titulo, sub }) => {
          const cfg = URGENCIA_CONFIG[key];
          const count = contadores[key];
          const isActive = filtroUrgencia === key;
          const Icon = CARD_ICONS[key];
          return (
            <div className="col-6 col-lg-3" key={key}>
              <div
                className="card-modern"
                style={{
                  padding: '18px 20px', cursor: 'pointer',
                  transition: 'all 200ms ease',
                  borderColor: isActive ? cfg.color : undefined,
                  boxShadow: isActive ? `0 0 0 1px ${cfg.color}, 0 4px 12px ${cfg.color}15` : undefined,
                }}
                onClick={() => { setFiltroUrgencia(isActive ? 'todos' : key); setPage(1); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: cfg.iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: cfg.color,
                  }}>
                    <Icon />
                  </div>
                  {isActive && (
                    <span style={{
                      fontSize: '9px', fontWeight: 700, color: cfg.color,
                      textTransform: 'uppercase', letterSpacing: '1px',
                      background: cfg.bg, padding: '2px 8px', borderRadius: '4px',
                      border: `1px solid ${cfg.border}`,
                    }}>
                      Ativo
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: cfg.color, lineHeight: 1, letterSpacing: '-1px' }}>
                  {count}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginTop: '4px' }}>{titulo}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Alertas de Compra (collapsible) ── */}
      {alertasCompra.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setAlertasOpen(!alertasOpen)}
            style={{
              width: '100%', border: '1.5px solid #FECACA', borderRadius: alertasOpen ? '12px 12px 0 0' : '12px',
              background: '#FEF2F2', padding: '12px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', transition: 'all 200ms',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px',
                background: '#FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#DC2626',
              }}>
                <IconBell />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>
                Alertas de Compra
              </span>
              <span style={{
                fontSize: '11px', fontWeight: 700,
                background: '#DC2626', color: '#fff',
                padding: '1px 8px', borderRadius: '10px', minWidth: '22px', textAlign: 'center',
              }}>
                {alertasCompra.length}
              </span>
            </div>
            <div style={{
              color: '#991B1B',
              transform: alertasOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 200ms',
            }}>
              <IconChevronDown />
            </div>
          </button>

          {alertasOpen && (
            <div style={{
              border: '1.5px solid #FECACA', borderTop: 'none',
              borderRadius: '0 0 12px 12px', background: '#fff',
              padding: '12px',
              maxHeight: '340px', overflowY: 'auto',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '8px',
              }}>
                {alertasCompra.map((p) => {
                  const cfg = URGENCIA_CONFIG[p.urgencia];
                  return (
                    <div key={p.produto.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px', borderRadius: '8px',
                      border: `1px solid var(--border)`, background: 'var(--surface-1, #fff)',
                      transition: 'background 150ms',
                    }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                        background: cfg.color,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: '12.5px', color: 'var(--text-1)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {p.produto.nome}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-3)', marginTop: '1px' }}>
                          Estoque: {p.produto.quantidade} {p.produto.unidade} · {p.consumoMedioSemanal.toFixed(1)}/sem
                        </div>
                      </div>
                      <span style={{
                        flexShrink: 0, fontSize: '10.5px', fontWeight: 700,
                        color: cfg.color, background: cfg.bg,
                        padding: '3px 8px', borderRadius: '6px',
                        border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap',
                      }}>
                        {p.diasParaAcabar === 0 ? 'Esgotado' : p.diasParaAcabar !== null ? `${p.diasParaAcabar}d` : 'Zerado'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main Table Card ── */}
      <div className="card-modern" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Search & filter bar */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        }}>
          <div style={{ flex: '1 1 220px', position: 'relative' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" width="14" height="14"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPage(1); }}
              style={{
                width: '100%', height: '34px', border: '1.5px solid var(--border)',
                borderRadius: '8px', padding: '0 10px 0 32px', fontSize: '12.5px',
                outline: 'none', background: 'var(--surface-1, #fff)',
                transition: 'border-color 200ms',
              }}
              onFocus={e => e.target.style.borderColor = '#667eea'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <select
            className="form-select"
            value={filtroUrgencia}
            onChange={(e) => { setFiltroUrgencia(e.target.value); setPage(1); }}
            style={{ width: 'auto', height: '34px', fontSize: '12.5px', minWidth: '120px' }}
          >
            <option value="todos">Todos os status</option>
            <option value="critico">Crítico</option>
            <option value="alerta">Alerta</option>
            <option value="atencao">Atenção</option>
            <option value="ok">Normal</option>
          </select>
          <span style={{
            fontSize: '11.5px', color: 'var(--text-3)', fontWeight: 500,
            padding: '0 4px', whiteSpace: 'nowrap',
          }}>
            {previsoesFiltradas.length} produto(s)
          </span>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="table-modern" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: '20px', width: '35%' }}>Produto</th>
                <th style={{ textAlign: 'center' }}>Estoque Atual</th>
                <th style={{ textAlign: 'center' }}>Consumo Semanal</th>
                <th style={{ textAlign: 'center' }}>Esgotamento</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPrevisoes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-3)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>
                      {filtroUrgencia !== 'todos' || busca
                        ? 'Nenhum produto encontrado com os filtros atuais.'
                        : 'Nenhuma saída registrada no período selecionado.'}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPrevisoes.map((p) => {
                  const cfg = URGENCIA_CONFIG[p.urgencia];
                  const barPct =
                    p.diasParaAcabar !== null
                      ? Math.min(100, Math.max(0, (p.diasParaAcabar / 30) * 100))
                      : 100;

                  return (
                    <tr key={p.produto.id}>
                      <td style={{ paddingLeft: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '4px', height: '36px', borderRadius: '2px',
                            background: cfg.color, flexShrink: 0, opacity: 0.7,
                          }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-1)', lineHeight: 1.3 }}>
                              {p.produto.nome}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <code style={{
                                fontSize: '10px', background: 'var(--surface-2)',
                                padding: '1px 5px', borderRadius: '3px', fontFamily: '"DM Mono", monospace',
                              }}>
                                {p.produto.sku}
                              </code>
                              {p.produto.categoria && <span>{p.produto.categoria}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontWeight: 700, fontSize: '14px',
                          color: p.produto.quantidade === 0 ? '#DC2626' : 'var(--text-1)',
                        }}>
                          {p.produto.quantidade}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: '3px' }}>
                          {p.produto.unidade}
                        </span>
                        {p.produto.estoqueMinimo != null && (
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '1px' }}>
                            mín. {p.produto.estoqueMinimo}
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-1)' }}>
                          {p.consumoMedioSemanal.toFixed(1)}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: '3px' }}>
                          {p.produto.unidade}/sem
                        </span>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '1px' }}>
                          {p.totalSaidas} saída(s) · {p.periodoAnaliseDias}d
                        </div>
                      </td>

                      <td style={{ textAlign: 'center', padding: '8px 16px' }}>
                        {p.diasParaAcabar === 0 ? (
                          <span style={{
                            fontSize: '12px', fontWeight: 700, color: '#DC2626',
                            background: '#FEF2F2', padding: '4px 12px', borderRadius: '6px',
                            border: '1px solid #FECACA',
                          }}>
                            Esgotado
                          </span>
                        ) : p.diasParaAcabar !== null ? (
                          <div>
                            <div>
                              <span style={{ fontWeight: 800, fontSize: '18px', color: cfg.color }}>
                                {p.diasParaAcabar}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: '3px' }}>dias</span>
                            </div>
                            <div style={{
                              height: '4px', background: 'var(--surface-2)',
                              borderRadius: '2px', overflow: 'hidden', marginTop: '5px',
                              maxWidth: '100px', margin: '5px auto 0',
                            }}>
                              <div style={{
                                width: `${barPct}%`, height: '100%',
                                background: cfg.color, borderRadius: '2px',
                                transition: 'width 0.4s ease',
                              }} />
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Sem consumo</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          fontSize: '11px', fontWeight: 600,
                          color: cfg.color, background: cfg.bg,
                          padding: '4px 10px', borderRadius: '6px',
                          border: `1px solid ${cfg.border}`,
                        }}>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: cfg.color, display: 'inline-block',
                          }} />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {previsoesFiltradas.length > ITEMS_PER_PAGE && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              Exibindo {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, previsoesFiltradas.length)} de {previsoesFiltradas.length}
            </span>
            <Paginacao
              totalItems={previsoesFiltradas.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={page}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
