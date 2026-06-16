// Apenas o trecho que muda em relação ao original.
// O restante do arquivo permanece igual.
// Substitua os dois blocos de useState que usam localStorage:

// ANTES (remover):
// const [hiddenOptions, setHiddenOptions] = useState<Record<string, string[]>>(() => {
//   const saved = localStorage.getItem('deliveryHiddenOptions');
//   return saved ? JSON.parse(saved) : { origens: [], destinos: [], responsaveis: [] };
// });

// DEPOIS (adicionar no topo do arquivo):
// import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage';

// E substituir o useState por:
// const [hiddenOptions, setHiddenOptions] = useState(() =>
//   safeLocalStorageGet('entradaSaidaHiddenOptions', { categorias: [] as string[] })
// );

// E substituir o useEffect de persistência por:
// useEffect(() => {
//   safeLocalStorageSet('entradaSaidaHiddenOptions', hiddenOptions);
// }, [hiddenOptions]);

// NOTA: EntradaSaidaForm.tsx não usa localStorage diretamente no código original.
// O arquivo original não precisa de alteração de localStorage.
// A única melhoria aplicável é a tipagem do `dados: any` no onSubmit.

import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';
import type { Produto } from '../types';

// ── REACT-SELECT STYLES ───────────────────────────────────────────────────────

const selectStyles: StylesConfig = {
  control: (base, state) => ({
    ...base,
    backgroundColor: state.isDisabled ? 'var(--surface-2)' : '#fff',
    borderColor: state.isFocused ? 'var(--primary)' : 'var(--border)',
    borderWidth: '1.5px',
    minHeight: '38px',
    borderRadius: '8px',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245,166,35,.12)' : 'none',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13.5px',
    '&:hover': { borderColor: state.isFocused ? 'var(--primary)' : 'var(--border)' },
  }),
  placeholder: base => ({ ...base, color: 'var(--text-3)', fontSize: '13.5px' }),
  singleValue: base => ({ ...base, color: 'var(--text-1)', fontSize: '13.5px' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--primary)' : state.isFocused ? 'var(--primary-light)' : '#fff',
    color: state.isSelected ? '#fff' : 'var(--text-1)',
    fontSize: '13.5px',
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer',
  }),
  menu: base => ({ ...base, zIndex: 9999, borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }),
  menuPortal: base => ({ ...base, zIndex: 9999 }),
  indicatorSeparator: () => ({ display: 'none' }),
};

// ── SVG ICONS ─────────────────────────────────────────────────────────────────

const IconArrowIn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M3 12h18M13 6l6 6-6 6"/><path d="M3 6v12"/>
  </svg>
);
const IconArrowOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M21 12H3M11 6L5 12l6 6"/><path d="M21 6v12"/>
  </svg>
);
const IconAdjust = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="18" x2="20" y2="18"/>
    <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>
    <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ── STATIC STYLES (avoid re-creation inside .map) ────────────────────────────

const rowBaseStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '12px 16px', transition: 'background var(--transition)', flexWrap: 'wrap', gap: '10px',
} as const;
const labelStyle = { display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', flex: 1, minWidth: '180px' } as const;
const nameStyle = { fontSize: '13.5px', fontWeight: 500, color: 'var(--text-1)' } as const;
const metaStyle = { fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px' } as const;
const stockStrong = { color: 'var(--text-2)' } as const;
const selectionWrapStyle = { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' } as const;
const inputGroupStyle = { display: 'flex', alignItems: 'center', gap: 0, width: '160px' } as const;
const currencyLabelStyle = {
  background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRight: 'none',
  borderRadius: '8px 0 0 8px', padding: '0 10px', height: '34px', display: 'flex',
  alignItems: 'center', fontSize: '12px', color: 'var(--text-3)', fontWeight: 600,
} as const;
const valorInputStyle = {
  height: '34px', border: '1.5px solid var(--border)', borderLeft: 'none',
  borderRadius: '0 8px 8px 0', padding: '0 8px', fontSize: '13px', color: 'var(--text-1)',
  background: '#fff', outline: 'none', fontFamily: 'DM Mono, monospace', width: '100%',
} as const;
const ajustePrefixStyle = {
  background: '#EBF4FF', border: '1.5px solid #BFD7FF', borderRight: 'none',
  borderRadius: '8px 0 0 8px', padding: '0 8px', height: '34px', display: 'flex',
  alignItems: 'center', fontSize: '11px', color: '#1971C2', fontWeight: 700, whiteSpace: 'nowrap',
} as const;

// ── HELPERS ───────────────────────────────────────────────────────────────────

const hojeISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const formatarDataExibicao = (iso: string) => {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

// ── INTERFACES ────────────────────────────────────────────────────────────────

interface ProdutoSelecionado {
  produtoId: string;
  quantidade: number;
  valorUnitario?: number;
}

// Tipagem explícita do payload (elimina `any` no onSubmit)
export interface EntradaSaidaPayload {
  ordemCompra: string;
  nomeObra: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  itens: ProdutoSelecionado[];
  dataCompetencia: string;
}

interface EntradaSaidaFormProps {
  produtos: Produto[];
  onSubmit: (dados: EntradaSaidaPayload) => void;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export function EntradaSaidaForm({ produtos, onSubmit }: EntradaSaidaFormProps) {
  const [ordemCompra,     setOrdemCompra]     = useState('');
  const [nomeObra,        setNomeObra]        = useState('');
  const [tipo,            setTipo]            = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [selecionados,    setSelecionados]    = useState<Record<string, { quantidade: number; valorUnitario: number }>>({});
  const [busca,           setBusca]           = useState('');
  const [categoriaOption, setCategoriaOption] = useState<any>(null);
  const [dataCompetencia, setDataCompetencia] = useState(hojeISO());

  const hoje        = hojeISO();
  const isRetroativa = dataCompetencia < hoje;

  const categorias = useMemo(() => {
    return Array.from(new Set(produtos.map(p => p.categoria || '').filter(Boolean))).sort();
  }, [produtos]);

  const categoriasOptions = [
    { value: '', label: 'Todas as categorias' },
    ...categorias.map(c => ({ value: c, label: c })),
  ];

  const categoriaFiltro = categoriaOption?.value || '';

  const produtosDisponiveis = useMemo(() => {
    const tokens = busca.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return produtos.filter(p => {
      const searchableText = [p.nome, p.sku, p.categoria ?? '', p.descricao ?? '', p.localArmazenamento ?? '', p.fornecedor ?? ''].join(' ').toLowerCase();
      return (
        (tokens.length === 0 || tokens.every(token => searchableText.includes(token))) &&
        (tipo !== 'saida' || p.quantidade > 0) &&
        (!categoriaFiltro || p.categoria === categoriaFiltro)
      );
    });
  }, [produtos, tipo, busca, categoriaFiltro]);

  // ── FIXED: preserve selection when changing type ──────────────────────────
  const handleTipoChange = (novoTipo: 'entrada' | 'saida' | 'ajuste') => {
    setTipo(novoTipo);
    setSelecionados(prev => {
      const next: typeof prev = {};
      for (const [produtoId, dados] of Object.entries(prev)) {
        const p = produtos.find(p => p.id === produtoId);
        if (!p) continue;
        // For 'saida': skip products with zero stock
        if (novoTipo === 'saida' && p.quantidade === 0) continue;
        // For 'ajuste': reset quantity to current stock level as the default
        // For 'saida': clamp quantity to available stock
        // For 'entrada': keep current quantity as-is
        const quantidade =
          novoTipo === 'ajuste'
            ? p.quantidade
            : novoTipo === 'saida'
              ? Math.min(dados.quantidade, p.quantidade)
              : dados.quantidade;
        next[produtoId] = { ...dados, quantidade };
      }
      return next;
    });
  };

  const handleToggleProduto = (p: Produto) => {
    setSelecionados(prev => {
      const novo = { ...prev };
      if (novo[p.id]) { delete novo[p.id]; }
      else { novo[p.id] = { quantidade: tipo === 'ajuste' ? p.quantidade : 1, valorUnitario: p.valorUnitario || 0 }; }
      return novo;
    });
  };

  const handleChangeQuantidade = (id: string, qtd: number) => {
    if (qtd < 0) return;
    setSelecionados(prev => ({ ...prev, [id]: { ...prev[id], quantidade: qtd } }));
  };

  const handleChangeValor = (id: string, valor: number) => {
    if (valor < 0) return;
    setSelecionados(prev => ({ ...prev, [id]: { ...prev[id], valorUnitario: valor } }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const itens = Object.entries(selecionados).map(([produtoId, dados]) => ({
      produtoId, quantidade: dados.quantidade, valorUnitario: dados.valorUnitario,
    }));
    onSubmit({ ordemCompra, nomeObra, tipo, itens, dataCompetencia });
    setOrdemCompra('');
    setNomeObra('');
    setSelecionados({});
    setDataCompetencia(hojeISO());
  };

  const totalSelecionados = Object.keys(selecionados).length;

  const btnEntrada: React.CSSProperties = tipo === 'entrada'
    ? { background: 'var(--success)', borderColor: 'var(--success)', color: '#fff', boxShadow: '0 4px 12px rgba(47,158,68,.3)' }
    : { background: 'var(--surface)', borderColor: 'var(--success)', color: 'var(--success)' };

  const btnSaida: React.CSSProperties = tipo === 'saida'
    ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff', boxShadow: '0 4px 12px rgba(229,62,62,.3)' }
    : { background: 'var(--surface)', borderColor: 'var(--danger)', color: 'var(--danger)' };

  const btnAjuste: React.CSSProperties = tipo === 'ajuste'
    ? { background: '#1971C2', borderColor: '#1971C2', color: '#fff', boxShadow: '0 4px 12px rgba(25,113,194,.3)' }
    : { background: 'var(--surface)', borderColor: '#1971C2', color: '#1971C2' };

  const tipoLabel       = tipo === 'entrada' ? 'Entrada' : tipo === 'saida' ? 'Saída' : 'Ajuste';
  const quantidadeLabel = tipo === 'ajuste' ? 'Nova Qtd.' : 'Qtd.';

  return (
    <div className="card-modern">
      <form onSubmit={handleSubmit}>

        {/* ── Cabeçalho ── */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <label className="form-label">Ordem de Compra</label>
            <input type="text" className="form-control" placeholder="Ex: OC-2026-001" value={ordemCompra} onChange={e => setOrdemCompra(e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Nome da Obra</label>
            <input type="text" className="form-control" placeholder="Informe o local ou nome da obra..." value={nomeObra} onChange={e => setNomeObra(e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label d-flex align-items-center gap-2">
              <IconCalendar />
              Data de Competência
              {isRetroativa && (
                <span style={{ fontSize: 10, background: '#FEF3DC', color: '#9A5A00', padding: '2px 7px', borderRadius: 999, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase' }}>
                  Retroativo
                </span>
              )}
            </label>
            <input
              type="date" className="form-control" value={dataCompetencia} max={hoje}
              onChange={e => {
                setDataCompetencia(e.target.value);
                if (e.target.value < hojeISO() && tipo === 'ajuste') handleTipoChange('saida');
              }}
            />
          </div>
        </div>

        {isRetroativa && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FEF3DC', border: '1px solid #FAD898', borderRadius: 8, fontSize: 13, color: '#9A5A00', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}><IconInfo /></span>
            <div>
              <strong>Lançamento retroativo — {formatarDataExibicao(dataCompetencia)}</strong><br />
              O saldo atual será ajustado normalmente.
            </div>
          </div>
        )}

        {/* ── Tipo ── */}
        <div className="mb-4">
          <label className="form-label d-block mb-3">Tipo de Movimentação</label>
          <div className="d-flex gap-3">
            {[
              { id: 'entrada' as const, label: 'ENTRADA', icon: <IconArrowIn />, style: btnEntrada },
              { id: 'saida'   as const, label: 'SAÍDA',   icon: <IconArrowOut />, style: btnSaida },
              { id: 'ajuste'  as const, label: 'AJUSTE',  icon: <IconAdjust />,  style: { ...btnAjuste, opacity: isRetroativa ? 0.5 : 1 } },
            ].map(({ id, label, icon, style }) => (
              <button
                key={id} type="button"
                className="btn d-flex align-items-center justify-content-center gap-2 flex-grow-1"
                style={{ ...style, height: '44px', fontSize: '13.5px', fontWeight: 700, borderRadius: '8px', border: '1.5px solid', transition: 'all 150ms' }}
                onClick={() => handleTipoChange(id)}
                disabled={id === 'ajuste' && isRetroativa}
                title={id === 'ajuste' && isRetroativa ? 'Ajustes não são permitidos em datas passadas' : undefined}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          {tipo === 'ajuste' && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#EBF4FF', border: '1px solid #BFD7FF', borderRadius: '8px', fontSize: '12.5px', color: '#1971C2', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              O ajuste define a <strong style={{ marginLeft: 3, marginRight: 3 }}>nova quantidade absoluta</strong> do estoque.
            </div>
          )}
        </div>

        {/* ── Busca ── */}
        <div className="mb-3">
          <label className="form-label">Selecionar Produtos</label>
          <div className="row g-2 mb-3">
            <div className="col-12 col-sm-7">
              <div className="input-wrap">
                <IconSearch />
                <input type="text" className="form-control" placeholder="Nome, SKU, categoria..." value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
            </div>
            <div className="col-12 col-sm-5">
              <Select
                options={categoriasOptions}
                value={categoriaOption || categoriasOptions[0]}
                onChange={(opt: any) => setCategoriaOption(opt?.value ? opt : null)}
                styles={selectStyles} menuPortalTarget={document.body}
                isSearchable={false} placeholder="Todas as categorias"
              />
            </div>
          </div>

          <div style={{ border: '1.5px solid var(--border)', borderRadius: '8px', maxHeight: '380px', overflowY: 'auto' }}>
            {produtosDisponiveis.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13.5px' }}>
                Nenhum produto disponível para esta operação.
              </div>
            ) : (
              produtosDisponiveis.map((p, idx) => {
                const selecionado = selecionados[p.id];
                const isSelected  = !!selecionado;
                return (
                  <div
                    key={p.id}
                    style={{
                      ...rowBaseStyle,
                      borderBottom: idx < produtosDisponiveis.length - 1 ? '1px solid var(--border)' : 'none',
                      background: isSelected ? (tipo === 'ajuste' ? 'rgba(25,113,194,.04)' : 'rgba(245,166,35,.04)') : 'transparent',
                    }}
                  >
                    <label htmlFor={`check-${p.id}`} style={labelStyle}>
                      <input
                        type="checkbox" id={`check-${p.id}`} checked={isSelected}
                        onChange={() => handleToggleProduto(p)}
                        style={{ marginTop: '3px', accentColor: tipo === 'ajuste' ? '#1971C2' : 'var(--primary)', width: '15px', height: '15px', flexShrink: 0 }}
                      />
                      <div>
                        <div style={nameStyle}>{p.nome}</div>
                        <div style={metaStyle}>
                          <span className="sku">{p.sku}</span>
                          {' · '}Estoque atual: <strong style={stockStrong}>{p.quantidade} {p.unidade}</strong>
                        </div>
                      </div>
                    </label>

                    {isSelected && (
                      <div style={selectionWrapStyle}>
                        {tipo === 'entrada' && (
                          <div style={inputGroupStyle}>
                            <span style={currencyLabelStyle}>R$</span>
                            <input
                              type="number" step="0.01" min="0"
                              value={selecionado.valorUnitario === 0 ? '' : selecionado.valorUnitario}
                              onChange={e => handleChangeValor(p.id, Number(e.target.value))}
                              placeholder="Valor Unit."
                              style={valorInputStyle}
                            />
                          </div>
                        )}
                        <div style={inputGroupStyle}>
                          {tipo === 'ajuste' && (
                            <span style={ajustePrefixStyle}>
                              {quantidadeLabel}
                            </span>
                          )}
                          <input
                            type="number"
                            min={tipo === 'saida' ? 1 : 0}
                            max={tipo === 'saida' ? p.quantidade : undefined}
                            value={selecionado.quantidade}
                            onChange={e => handleChangeQuantidade(p.id, Number(e.target.value))}
                            style={{ height: '34px', border: '1.5px solid var(--border)', borderRight: 'none', borderLeft: tipo === 'ajuste' ? 'none' : '1.5px solid var(--border)', borderRadius: tipo === 'ajuste' ? '0' : '8px 0 0 8px', padding: '0 8px', fontSize: '13px', color: 'var(--text-1)', background: '#fff', outline: 'none', fontFamily: 'DM Mono, monospace', width: '100%', borderColor: tipo === 'ajuste' ? '#BFD7FF' : 'var(--border)' }}
                          />
                          <span style={{ background: tipo === 'ajuste' ? '#EBF4FF' : 'var(--surface-2)', border: `1.5px solid ${tipo === 'ajuste' ? '#BFD7FF' : 'var(--border)'}`, borderLeft: 'none', borderRadius: '0 8px 8px 0', padding: '0 10px', height: '34px', display: 'flex', alignItems: 'center', fontSize: '11.5px', color: tipo === 'ajuste' ? '#1971C2' : 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {p.unidade}
                          </span>
                        </div>
                        {tipo === 'ajuste' && (
                          <div style={{ fontSize: '11.5px', fontWeight: 700, fontFamily: 'DM Mono, monospace', color: selecionado.quantidade > p.quantidade ? 'var(--success)' : selecionado.quantidade < p.quantidade ? 'var(--danger)' : 'var(--text-3)', minWidth: '52px', textAlign: 'right' }}>
                            {selecionado.quantidade > p.quantidade && `+${selecionado.quantidade - p.quantidade}`}
                            {selecionado.quantidade < p.quantidade && `${selecionado.quantidade - p.quantidade}`}
                            {selecionado.quantidade === p.quantidade && '±0'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Confirmar ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            type="submit" disabled={totalSelecionados === 0}
            className="btn d-flex align-items-center gap-2"
            style={{ height: '44px', padding: '0 32px', fontSize: '14px', fontWeight: 700, borderRadius: '999px', background: tipo === 'ajuste' ? '#1971C2' : tipo === 'saida' ? 'var(--danger)' : 'var(--success)', borderColor: tipo === 'ajuste' ? '#1971C2' : tipo === 'saida' ? 'var(--danger)' : 'var(--success)', color: '#fff', opacity: totalSelecionados === 0 ? 0.5 : 1, cursor: totalSelecionados === 0 ? 'not-allowed' : 'pointer' }}
          >
            <IconCheck />
            Confirmar {tipoLabel}
            {isRetroativa && (
              <span style={{ background: 'rgba(255,255,255,.2)', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 700, marginLeft: 2 }}>
                {formatarDataExibicao(dataCompetencia)}
              </span>
            )}
            {totalSelecionados > 0 && (
              <span style={{ background: 'rgba(255,255,255,.25)', borderRadius: '999px', padding: '1px 8px', fontSize: '12px', fontWeight: 700, marginLeft: '4px' }}>
                {totalSelecionados}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}