import React, { useState, useMemo } from 'react';
import type { Produto } from '../types';

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

// ── INTERFACES ────────────────────────────────────────────────────────────────

interface ProdutoSelecionado {
  produtoId: string;
  quantidade: number;
  valorUnitario?: number;
}

interface EntradaSaidaFormProps {
  produtos: Produto[];
  onSubmit: (dados: {
    ordemCompra: string;
    nomeObra: string;
    tipo: 'entrada' | 'saida';
    itens: ProdutoSelecionado[];
  }) => void;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export function EntradaSaidaForm({ produtos, onSubmit }: EntradaSaidaFormProps) {
  const [ordemCompra, setOrdemCompra] = useState('');
  const [nomeObra,    setNomeObra]    = useState('');
  const [tipo,        setTipo]        = useState<'entrada' | 'saida'>('entrada');
  const [selecionados, setSelecionados] = useState<Record<string, { quantidade: number; valorUnitario: number }>>({});
  const [busca, setBusca] = useState('');

  const produtosDisponiveis = useMemo(() => {
    return produtos.filter(p => {
      const atendeBusca   = p.nome.toLowerCase().includes(busca.toLowerCase()) || p.sku.toLowerCase().includes(busca.toLowerCase());
      const atendeEstoque = tipo === 'entrada' || p.quantidade > 0;
      return atendeBusca && atendeEstoque;
    });
  }, [produtos, tipo, busca]);

  const handleToggleProduto = (p: Produto) => {
    setSelecionados(prev => {
      const novo = { ...prev };
      if (novo[p.id]) { delete novo[p.id]; }
      else { novo[p.id] = { quantidade: 1, valorUnitario: p.valorUnitario || 0 }; }
      return novo;
    });
  };

  const handleChangeQuantidade = (id: string, qtd: number) => {
    if (qtd <= 0) return;
    setSelecionados(prev => ({ ...prev, [id]: { ...prev[id], quantidade: qtd } }));
  };

  const handleChangeValor = (id: string, valor: number) => {
    if (valor < 0) return;
    setSelecionados(prev => ({ ...prev, [id]: { ...prev[id], valorUnitario: valor } }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const itens = Object.entries(selecionados).map(([produtoId, dados]) => ({
      produtoId,
      quantidade:    dados.quantidade,
      valorUnitario: dados.valorUnitario,
    }));
    onSubmit({ ordemCompra, nomeObra, tipo, itens });
    setOrdemCompra('');
    setNomeObra('');
    setSelecionados({});
  };

  const totalSelecionados = Object.keys(selecionados).length;

  // Estilos do botão de tipo ativo/inativo
  const btnEntrada: React.CSSProperties = tipo === 'entrada'
    ? { background: 'var(--success)', borderColor: 'var(--success)', color: '#fff', boxShadow: '0 4px 12px rgba(47,158,68,.3)' }
    : { background: 'var(--surface)', borderColor: 'var(--success)', color: 'var(--success)' };

  const btnSaida: React.CSSProperties = tipo === 'saida'
    ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff', boxShadow: '0 4px 12px rgba(229,62,62,.3)' }
    : { background: 'var(--surface)', borderColor: 'var(--danger)', color: 'var(--danger)' };

  return (
    <div className="card-modern">
      <form onSubmit={handleSubmit}>

        {/* ── Cabeçalho: OC + Obra ── */}
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label className="form-label">Ordem de Compra</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: OC-2026-001"
              value={ordemCompra}
              onChange={e => setOrdemCompra(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Nome da Obra</label>
            <input
              type="text"
              className="form-control"
              placeholder="Informe o local ou nome da obra..."
              value={nomeObra}
              onChange={e => setNomeObra(e.target.value)}
            />
          </div>
        </div>

        {/* ── Tipo de movimentação ── */}
        <div className="mb-4">
          <label className="form-label d-block mb-3">Tipo de Movimentação</label>
          <div className="d-flex gap-3">
            <button
              type="button"
              className="btn d-flex align-items-center justify-content-center gap-2 flex-grow-1"
              style={{ ...btnEntrada, height: '44px', fontSize: '13.5px', fontWeight: 700, borderRadius: '8px', border: '1.5px solid', transition: 'all 150ms' }}
              onClick={() => { setTipo('entrada'); setSelecionados({}); }}
            >
              <IconArrowIn /> ENTRADA
            </button>
            <button
              type="button"
              className="btn d-flex align-items-center justify-content-center gap-2 flex-grow-1"
              style={{ ...btnSaida, height: '44px', fontSize: '13.5px', fontWeight: 700, borderRadius: '8px', border: '1.5px solid', transition: 'all 150ms' }}
              onClick={() => { setTipo('saida'); setSelecionados({}); }}
            >
              <IconArrowOut /> SAÍDA
            </button>
          </div>
        </div>

        {/* ── Busca de produtos ── */}
        <div className="mb-3">
          <label className="form-label">Selecionar Produtos</label>
          <div className="input-wrap mb-3">
            <IconSearch />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar produto por nome ou SKU..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          {/* Lista de produtos */}
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: idx < produtosDisponiveis.length - 1 ? '1px solid var(--border)' : 'none',
                      background: isSelected ? 'rgba(245,166,35,.04)' : 'transparent',
                      transition: 'background var(--transition)',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    {/* Checkbox + info */}
                    <label
                      htmlFor={`check-${p.id}`}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', flex: 1, minWidth: '180px' }}
                    >
                      <input
                        type="checkbox"
                        id={`check-${p.id}`}
                        checked={isSelected}
                        onChange={() => handleToggleProduto(p)}
                        style={{ marginTop: '3px', accentColor: 'var(--primary)', width: '15px', height: '15px', flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-1)' }}>{p.nome}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                          <span className="sku">{p.sku}</span>
                          {' · '}
                          Estoque: <strong style={{ color: 'var(--text-2)' }}>{p.quantidade} {p.unidade}</strong>
                          {tipo === 'saida' && typeof p.valorUnitario === 'number' && (
                            <> · Preço Médio: <strong style={{ color: 'var(--text-2)' }}>R$ {p.valorUnitario.toFixed(2)}</strong></>
                          )}
                        </div>
                      </div>
                    </label>

                    {/* Inputs de quantidade / valor (quando selecionado) */}
                    {isSelected && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {/* Valor unitário — só para entrada */}
                        {tipo === 'entrada' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '160px' }}>
                            <span style={{
                              background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                              borderRight: 'none', borderRadius: '8px 0 0 8px',
                              padding: '0 10px', height: '34px', display: 'flex', alignItems: 'center',
                              fontSize: '12px', color: 'var(--text-3)', fontWeight: 600,
                            }}>
                              R$
                            </span>
                            <input
                              type="number" step="0.01" min="0"
                              value={selecionado.valorUnitario === 0 ? '' : selecionado.valorUnitario}
                              onChange={e => handleChangeValor(p.id, Number(e.target.value))}
                              placeholder="Valor Unit."
                              style={{
                                height: '34px', border: '1.5px solid var(--border)', borderLeft: 'none',
                                borderRadius: '0 8px 8px 0', padding: '0 8px', fontSize: '13px',
                                color: 'var(--text-1)', background: '#fff', outline: 'none',
                                fontFamily: 'DM Mono, monospace', width: '100%',
                              }}
                            />
                          </div>
                        )}

                        {/* Quantidade */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '130px' }}>
                          <input
                            type="number" min="1"
                            max={tipo === 'saida' ? p.quantidade : undefined}
                            value={selecionado.quantidade}
                            onChange={e => handleChangeQuantidade(p.id, Number(e.target.value))}
                            style={{
                              height: '34px', border: '1.5px solid var(--border)', borderRight: 'none',
                              borderRadius: '8px 0 0 8px', padding: '0 8px', fontSize: '13px',
                              color: 'var(--text-1)', background: '#fff', outline: 'none',
                              fontFamily: 'DM Mono, monospace', width: '100%',
                            }}
                          />
                          <span style={{
                            background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                            borderLeft: 'none', borderRadius: '0 8px 8px 0',
                            padding: '0 10px', height: '34px', display: 'flex', alignItems: 'center',
                            fontSize: '11.5px', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap',
                          }}>
                            {p.unidade}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Botão confirmar ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            type="submit"
            disabled={totalSelecionados === 0}
            className="btn btn-primary d-flex align-items-center gap-2"
            style={{
              height: '44px',
              padding: '0 32px',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '999px',
            }}
          >
            <IconCheck />
            Confirmar {tipo === 'entrada' ? 'Entrada' : 'Saída'}
            {totalSelecionados > 0 && (
              <span style={{
                background: 'rgba(255,255,255,.25)',
                borderRadius: '999px',
                padding: '1px 8px',
                fontSize: '12px',
                fontWeight: 700,
                marginLeft: '4px',
              }}>
                {totalSelecionados}
              </span>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}