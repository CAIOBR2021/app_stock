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
  critico: { label: 'Crítico', color: '#E53E3E', bg: '#FFF5F5', icon: '⚠' },
  alerta: { label: 'Alerta', color: '#DD6B20', bg: '#FFFAF0', icon: '⚡' },
  atencao: { label: 'Atenção', color: '#D69E2E', bg: '#FFFFF0', icon: '●' },
  ok: { label: 'OK', color: '#2F9E44', bg: '#EBFBEE', icon: '✓' },
};

function calcularUrgencia(diasParaAcabar: number | null, produto: Produto): PrevisaoProduto['urgencia'] {
  if (produto.quantidade === 0) return 'critico';
  if (diasParaAcabar === null) return 'ok';
  if (diasParaAcabar <= 7) return 'critico';
  if (diasParaAcabar <= 14) return 'alerta';
  if (diasParaAcabar <= 30) return 'atencao';
  return 'ok';
}

export function PrevisaoConsumo({ produtos, movimentacoes }: Props) {
  const [periodoAnalise, setPeriodoAnalise] = useState<number>(90);
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);

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

      const urgencia = calcularUrgencia(diasParaAcabar, produto);

      return {
        produto,
        consumoMedioSemanal,
        diasParaAcabar,
        totalSaidas,
        periodoAnaliseDias: periodoEfetivoDias,
        urgencia,
      };
    });
  }, [produtos, movimentacoes, periodoAnalise]);

  const previsoesFiltradas = useMemo(() => {
    let result = previsoes.filter((p) => p.totalSaidas > 0 || p.produto.quantidade === 0);

    if (filtroUrgencia !== 'todos') {
      result = result.filter((p) => p.urgencia === filtroUrgencia);
    }

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
      {/* Cards de resumo */}
      <div className="row g-3 mb-4">
        {([
          { key: 'critico', titulo: 'Críticos', sub: 'Acabam em até 7 dias' },
          { key: 'alerta', titulo: 'Em Alerta', sub: 'Acabam em 8-14 dias' },
          { key: 'atencao', titulo: 'Atenção', sub: 'Acabam em 15-30 dias' },
          { key: 'ok', titulo: 'Adequados', sub: 'Mais de 30 dias' },
        ] as const).map(({ key, titulo, sub }) => {
          const cfg = URGENCIA_CONFIG[key];
          const count = contadores[key];
          return (
            <div className="col-6 col-lg-3" key={key}>
              <div
                style={{
                  background: cfg.bg,
                  border: `1.5px solid ${cfg.color}20`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  boxShadow: filtroUrgencia === key ? `0 0 0 2px ${cfg.color}` : 'none',
                }}
                onClick={() => { setFiltroUrgencia(filtroUrgencia === key ? 'todos' : key); setPage(1); }}
              >
                <div style={{ fontSize: '28px', fontWeight: 800, color: cfg.color }}>{count}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: cfg.color, marginTop: '2px' }}>{titulo}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alertas de compra */}
      {alertasCompra.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #FFF5F5 0%, #FFFAF0 100%)',
            border: '1.5px solid #E53E3E30',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#E53E3E" strokeWidth="2" width="22" height="22">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#E53E3E' }}>
              Alertas de Compra ({alertasCompra.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alertasCompra.slice(0, 5).map((p) => {
              const cfg = URGENCIA_CONFIG[p.urgencia];
              return (
                <div
                  key={p.produto.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#fff',
                    borderRadius: 'var(--radius)',
                    padding: '12px 16px',
                    border: `1px solid ${cfg.color}30`,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-1)' }}>
                      {p.produto.nome}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                      SKU: {p.produto.sku}
                      {p.produto.fornecedor && ` · Fornecedor: ${p.produto.fornecedor}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        background: cfg.bg,
                        color: cfg.color,
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        marginBottom: '4px',
                      }}
                    >
                      {p.diasParaAcabar === 0
                        ? 'Esgotado'
                        : p.diasParaAcabar !== null
                          ? `Acaba em ${p.diasParaAcabar} dia(s)`
                          : 'Sem estoque'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                      Consumo: {p.consumoMedioSemanal.toFixed(1)} {p.produto.unidade}/semana
                    </div>
                  </div>
                </div>
              );
            })}
            {alertasCompra.length > 5 && (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', padding: '4px' }}>
                e mais {alertasCompra.length - 5} produto(s)...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filtros e tabela */}
      <div className="card-modern">
        <div className="row gy-3 align-items-end mb-3">
          <div className="col-12 col-lg-5">
            <label className="form-label">Pesquisar Produto</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="form-control"
                placeholder="Nome, SKU, categoria, fornecedor..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="col-12 col-md-4 col-lg-3">
            <label className="form-label">Período de Análise</label>
            <select
              className="form-select"
              value={periodoAnalise}
              onChange={(e) => { setPeriodoAnalise(Number(e.target.value)); setPage(1); }}
            >
              <option value={30}>Últimos 30 dias</option>
              <option value={60}>Últimos 60 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={180}>Últimos 6 meses</option>
              <option value={365}>Último ano</option>
            </select>
          </div>
          <div className="col-12 col-md-4 col-lg-2">
            <label className="form-label">Urgência</label>
            <select
              className="form-select"
              value={filtroUrgencia}
              onChange={(e) => { setFiltroUrgencia(e.target.value); setPage(1); }}
            >
              <option value="todos">Todas</option>
              <option value="critico">Crítico</option>
              <option value="alerta">Alerta</option>
              <option value="atencao">Atenção</option>
              <option value="ok">OK</option>
            </select>
          </div>
          <div className="col-12 col-md-4 col-lg-2">
            <div style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'right' }}>
              {previsoesFiltradas.length} produto(s)
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Produto</th>
                <th style={{ textAlign: 'center' }}>Estoque Atual</th>
                <th style={{ textAlign: 'center' }}>Consumo/Semana</th>
                <th style={{ textAlign: 'center' }}>Previsão de Esgotamento</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPrevisoes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)' }}>
                    {filtroUrgencia !== 'todos' || busca
                      ? 'Nenhum produto encontrado com os filtros atuais.'
                      : 'Nenhum produto com movimentações de saída no período analisado.'}
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
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{p.produto.nome}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                          {p.produto.sku}
                          {p.produto.categoria && ` · ${p.produto.categoria}`}
                          {p.produto.fornecedor && ` · ${p.produto.fornecedor}`}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>
                          {p.produto.quantidade}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: '4px' }}>
                          {p.produto.unidade}
                        </span>
                        {p.produto.estoqueMinimo != null && (
                          <div style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                            Mín: {p.produto.estoqueMinimo}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>
                          {p.consumoMedioSemanal.toFixed(1)}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: '4px' }}>
                          {p.produto.unidade}/sem
                        </span>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                          ({p.totalSaidas} saída(s) em {p.periodoAnaliseDias}d)
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', minWidth: '180px' }}>
                        {p.diasParaAcabar === 0 ? (
                          <span style={{ fontWeight: 700, color: '#E53E3E', fontSize: '13px' }}>
                            Esgotado
                          </span>
                        ) : p.diasParaAcabar !== null ? (
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '16px', color: cfg.color }}>
                              {p.diasParaAcabar}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '4px' }}>
                              dia(s)
                            </span>
                            <div
                              style={{
                                height: '5px',
                                background: '#f0f0f0',
                                borderRadius: '999px',
                                marginTop: '6px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${barPct}%`,
                                  height: '100%',
                                  background: cfg.color,
                                  borderRadius: '999px',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: cfg.bg,
                            color: cfg.color,
                            fontWeight: 700,
                            fontSize: '11.5px',
                            padding: '4px 12px',
                            borderRadius: '999px',
                            border: `1px solid ${cfg.color}25`,
                          }}
                        >
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 d-flex justify-content-center">
          <Paginacao
            totalItems={previsoesFiltradas.length}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={page}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
