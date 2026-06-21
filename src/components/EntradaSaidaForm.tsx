import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';
import type { Produto } from '../types';
import { isUnidadeInteira, sanitizeQuantidade } from '../constants';

// ── REACT-SELECT STYLES ───────────────────────────────────────────────────────

const selectStyles: StylesConfig = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--surface-2)',
    borderColor: state.isFocused ? 'var(--primary)' : 'transparent',
    borderWidth: '2px',
    minHeight: '44px',
    borderRadius: '12px',
    boxShadow: 'none',
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
    padding: '10px 16px',
  }),
  menu: base => ({ ...base, zIndex: 9999, borderRadius: '12px', border: 'none', boxShadow: '0 12px 40px rgba(0,0,0,.12)' }),
  menuPortal: base => ({ ...base, zIndex: 9999 }),
  indicatorSeparator: () => ({ display: 'none' }),
};

// ── SVG ICONS ─────────────────────────────────────────────────────────────────

const IconArrowIn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M3 12h18M13 6l6 6-6 6"/><path d="M3 6v12"/>
  </svg>
);
const IconArrowOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M21 12H3M11 6L5 12l6 6"/><path d="M21 6v12"/>
  </svg>
);
const IconAdjust = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

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

  const hoje         = hojeISO();
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

  const handleTipoChange = (novoTipo: 'entrada' | 'saida' | 'ajuste') => {
    setTipo(novoTipo);
    setSelecionados(prev => {
      const next: typeof prev = {};
      for (const [produtoId, dados] of Object.entries(prev)) {
        const p = produtos.find(p => p.id === produtoId);
        if (!p) continue;
        if (novoTipo === 'saida' && p.quantidade === 0) continue;
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
    const prod = produtos.find(p => p.id === id);
    const val = prod ? sanitizeQuantidade(qtd, prod.unidade) : qtd;
    setSelecionados(prev => ({ ...prev, [id]: { ...prev[id], quantidade: val } }));
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

  const tipoLabel       = tipo === 'entrada' ? 'Entrada' : tipo === 'saida' ? 'Saída' : 'Ajuste';
  const quantidadeLabel = tipo === 'ajuste' ? 'Nova Qtd.' : 'Qtd.';

  const tipoConfig = {
    entrada: { color: '#2F9E44', bg: '#F0FDF4', border: '#BBF7D0', activeBg: 'linear-gradient(135deg, #2F9E44, #38B249)', dot: '#2F9E44' },
    saida:   { color: '#E53E3E', bg: '#FFF5F5', border: '#FED7D7', activeBg: 'linear-gradient(135deg, #E53E3E, #F56565)', dot: '#E53E3E' },
    ajuste:  { color: '#1971C2', bg: '#EBF4FF', border: '#BFD7FF', activeBg: 'linear-gradient(135deg, #1971C2, #3B8DE0)', dot: '#1971C2' },
  };

  const currentConfig = tipoConfig[tipo];

  const inputBaseStyle: React.CSSProperties = {
    width: '100%',
    height: '44px',
    border: '2px solid transparent',
    borderRadius: '12px',
    padding: '0 14px',
    fontSize: '13.5px',
    color: 'var(--text-1)',
    background: 'var(--surface-2)',
    outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
    transition: 'all 200ms ease',
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>

        {/* ── Header with Type Selector ── */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Type Pill Selector */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--surface-2)',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px',
            marginBottom: '24px',
          }}>
            {([
              { id: 'entrada' as const, label: 'Entrada', icon: <IconArrowIn />, config: tipoConfig.entrada },
              { id: 'saida'   as const, label: 'Saída',   icon: <IconArrowOut />, config: tipoConfig.saida },
              { id: 'ajuste'  as const, label: 'Ajuste',  icon: <IconAdjust />,  config: tipoConfig.ajuste },
            ]).map(({ id, label, icon, config }) => {
              const isActive = tipo === id;
              const isDisabled = id === 'ajuste' && isRetroativa;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTipoChange(id)}
                  disabled={isDisabled}
                  title={isDisabled ? 'Ajustes não são permitidos em datas passadas' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '9px',
                    border: 'none',
                    background: isActive ? '#fff' : 'transparent',
                    color: isActive ? config.color : 'var(--text-3)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.4 : 1,
                    transition: 'all 200ms ease',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,.08)' : 'none',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {icon} {label}
                </button>
              );
            })}
          </div>

          {tipo === 'ajuste' && (
            <div style={{
              marginBottom: '20px', padding: '12px 16px', background: '#EBF4FF',
              border: '1px solid #BFD7FF', borderRadius: '12px', fontSize: '12.5px',
              color: '#1971C2', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <IconInfo />
              O ajuste define a <strong style={{ marginLeft: 3, marginRight: 3 }}>nova quantidade absoluta</strong> do estoque.
            </div>
          )}

          {/* Fields Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Ordem de Compra
              </label>
              <input
                type="text"
                placeholder="Ex: OC-2026-001"
                value={ordemCompra}
                onChange={e => setOrdemCompra(e.target.value)}
                style={inputBaseStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'var(--surface-2)'; }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Nome da Obra
              </label>
              <input
                type="text"
                placeholder="Local ou nome da obra..."
                value={nomeObra}
                onChange={e => setNomeObra(e.target.value)}
                style={inputBaseStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'var(--surface-2)'; }}
              />
            </div>
            <div>
              <label style={{
                fontSize: '11.5px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '6px',
                display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '.5px',
              }}>
                Competência
                {isRetroativa && (
                  <span style={{
                    fontSize: '9px', background: '#FEF3DC', color: '#9A5A00',
                    padding: '2px 6px', borderRadius: 999, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '.3px',
                  }}>
                    Retroativo
                  </span>
                )}
              </label>
              <input
                type="date"
                value={dataCompetencia}
                max={hoje}
                onChange={e => {
                  setDataCompetencia(e.target.value);
                  if (e.target.value < hojeISO() && tipo === 'ajuste') handleTipoChange('saida');
                }}
                style={inputBaseStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'var(--surface-2)'; }}
              />
            </div>
          </div>

          {isRetroativa && (
            <div style={{
              marginTop: '14px', padding: '12px 16px', background: '#FEF3DC',
              border: '1px solid #FAD898', borderRadius: '12px', fontSize: '13px',
              color: '#9A5A00', display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}><IconInfo /></span>
              <div>
                <strong>Lançamento retroativo — {formatarDataExibicao(dataCompetencia)}</strong><br />
                O saldo atual será ajustado normalmente.
              </div>
            </div>
          )}
        </div>

        {/* ── Product Selection ── */}
        <div style={{ padding: '20px 28px 0' }}>
          {/* Search Bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-3)', display: 'flex', pointerEvents: 'none',
              }}>
                <IconSearch />
              </span>
              <input
                type="text"
                placeholder="Buscar produto por nome, SKU ou categoria..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                style={{ ...inputBaseStyle, paddingLeft: '40px' }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'var(--surface-2)'; }}
              />
            </div>
            <div style={{ width: '220px' }}>
              <Select
                options={categoriasOptions}
                value={categoriaOption || categoriasOptions[0]}
                onChange={(opt: any) => setCategoriaOption(opt?.value ? opt : null)}
                styles={selectStyles}
                menuPortalTarget={document.body}
                isSearchable={false}
                placeholder="Categoria"
              />
            </div>
          </div>

          {/* Product Count */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '8px', padding: '0 4px',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>
              {produtosDisponiveis.length} produto{produtosDisponiveis.length !== 1 ? 's' : ''} disponíve{produtosDisponiveis.length !== 1 ? 'is' : 'l'}
            </span>
            {totalSelecionados > 0 && (
              <span style={{
                fontSize: '12px', fontWeight: 700, color: currentConfig.color,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: currentConfig.dot, display: 'inline-block',
                }} />
                {totalSelecionados} selecionado{totalSelecionados > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Product List */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {produtosDisponiveis.length === 0 ? (
            <div style={{
              padding: '56px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '14px',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" width="40" height="40" style={{ marginBottom: 16, opacity: 0.3 }}>
                <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <div style={{ fontWeight: 500 }}>Nenhum produto encontrado</div>
              <div style={{ fontSize: '12.5px', marginTop: '4px' }}>Tente ajustar os filtros de busca</div>
            </div>
          ) : (
            produtosDisponiveis.map((p, idx) => {
              const selecionado = selecionados[p.id];
              const isSelected  = !!selecionado;
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 28px',
                    transition: 'all 150ms',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderTop: idx === 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: '1px solid var(--border)',
                    background: isSelected ? currentConfig.bg : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleToggleProduto(p)}
                >
                  {/* Left: Product Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '200px' }}>
                    {/* Custom Checkbox */}
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                      border: isSelected ? 'none' : '2px solid var(--border)',
                      background: isSelected ? currentConfig.dot : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms cubic-bezier(.4,0,.2,1)',
                      boxShadow: isSelected ? `0 2px 6px ${currentConfig.dot}40` : 'none',
                    }}>
                      {isSelected && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" width="12" height="12">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>
                        {p.nome}
                      </div>
                      <div style={{
                        fontSize: '12px', color: 'var(--text-3)', marginTop: '4px',
                        display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                      }}>
                        <code style={{
                          fontFamily: 'DM Mono, monospace', fontSize: '10.5px',
                          background: 'var(--surface-3)', padding: '2px 8px', borderRadius: '6px',
                          color: 'var(--text-3)', fontWeight: 500, letterSpacing: '.3px',
                        }}>
                          {p.sku}
                        </code>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: p.quantidade > 0 ? '#2F9E44' : '#E53E3E',
                            display: 'inline-block',
                          }} />
                          <strong style={{ color: 'var(--text-2)', fontWeight: 600 }}>{p.quantidade}</strong> {p.unidade}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Inputs when selected */}
                  {isSelected && (
                    <div
                      style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}
                      onClick={e => e.stopPropagation()}
                    >
                      {tipo === 'entrada' && (
                        <div style={{ display: 'flex', alignItems: 'center', width: '140px', background: '#fff', borderRadius: '10px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
                          <span style={{
                            padding: '0 10px', height: '36px', display: 'flex', alignItems: 'center',
                            fontSize: '12px', color: 'var(--text-3)', fontWeight: 600,
                            background: 'var(--surface-2)', borderRight: '1px solid var(--border)',
                          }}>R$</span>
                          <input
                            type="number" step="0.01" min="0"
                            value={selecionado.valorUnitario === 0 ? '' : selecionado.valorUnitario}
                            onChange={e => handleChangeValor(p.id, Number(e.target.value))}
                            placeholder="0,00"
                            style={{
                              height: '36px', border: 'none', padding: '0 8px', fontSize: '13px',
                              color: 'var(--text-1)', background: 'transparent', outline: 'none',
                              fontFamily: 'DM Mono, monospace', width: '100%',
                            }}
                          />
                        </div>
                      )}
                      <div style={{
                        display: 'flex', alignItems: 'center', width: '150px',
                        background: '#fff', borderRadius: '10px',
                        border: `1.5px solid ${tipo === 'ajuste' ? '#BFD7FF' : 'var(--border)'}`,
                        overflow: 'hidden',
                      }}>
                        {tipo === 'ajuste' && (
                          <span style={{
                            padding: '0 8px', height: '36px', display: 'flex', alignItems: 'center',
                            fontSize: '10.5px', color: '#1971C2', fontWeight: 700, whiteSpace: 'nowrap',
                            background: '#EBF4FF', borderRight: '1px solid #BFD7FF',
                          }}>
                            {quantidadeLabel}
                          </span>
                        )}
                        <input
                          type="number"
                          min={tipo === 'saida' ? 1 : 0}
                          max={tipo === 'saida' ? p.quantidade : undefined}
                          step={isUnidadeInteira(p.unidade) ? 1 : 0.01}
                          value={selecionado.quantidade}
                          onChange={e => handleChangeQuantidade(p.id, Number(e.target.value))}
                          style={{
                            height: '36px', border: 'none', padding: '0 10px', fontSize: '13px',
                            color: 'var(--text-1)', background: 'transparent', outline: 'none',
                            fontFamily: 'DM Mono, monospace', width: '100%',
                          }}
                        />
                        <span style={{
                          padding: '0 10px', height: '36px', display: 'flex', alignItems: 'center',
                          fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
                          color: tipo === 'ajuste' ? '#1971C2' : 'var(--text-3)',
                          background: tipo === 'ajuste' ? '#EBF4FF' : 'var(--surface-2)',
                          borderLeft: `1px solid ${tipo === 'ajuste' ? '#BFD7FF' : 'var(--border)'}`,
                        }}>
                          {p.unidade}
                        </span>
                      </div>
                      {tipo === 'ajuste' && (
                        <div style={{
                          fontSize: '12px', fontWeight: 700,
                          fontFamily: 'DM Mono, monospace',
                          color: selecionado.quantidade > p.quantidade ? 'var(--success)'
                            : selecionado.quantidade < p.quantidade ? 'var(--danger)' : 'var(--text-3)',
                          minWidth: '48px', textAlign: 'right',
                        }}>
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

        {/* ── Footer Action Bar ── */}
        <div style={{
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
            {totalSelecionados > 0 ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '8px',
                  background: currentConfig.dot, color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700,
                }}>
                  {totalSelecionados}
                </span>
                <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>
                  produto{totalSelecionados > 1 ? 's' : ''} para {tipoLabel.toLowerCase()}
                </span>
              </span>
            ) : (
              <span>Selecione produtos para continuar</span>
            )}
          </div>
          <button
            type="submit"
            disabled={totalSelecionados === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '44px',
              padding: '0 24px',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '12px',
              border: 'none',
              background: totalSelecionados === 0 ? 'var(--surface-3)' : currentConfig.activeBg,
              color: totalSelecionados === 0 ? 'var(--text-3)' : '#fff',
              cursor: totalSelecionados === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 200ms ease',
              boxShadow: totalSelecionados > 0 ? '0 4px 16px rgba(0,0,0,.15)' : 'none',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <IconCheck />
            Confirmar {tipoLabel}
            {isRetroativa && (
              <span style={{
                background: 'rgba(255,255,255,.2)', borderRadius: 999,
                padding: '2px 8px', fontSize: '11px', fontWeight: 700,
              }}>
                {formatarDataExibicao(dataCompetencia)}
              </span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
