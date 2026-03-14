import React, { useState, useEffect, useMemo } from 'react';
import type { Movimentacao, Produto, UUID, TipoMov } from '../types';
import { ModalComponent, GerenciarHistoricoModal, Paginacao } from './Shared';

// ── SVG ICONS ─────────────────────────────────────────────────────────────────

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconGear = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </svg>
);

const IconClear = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconBuilding = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
  </svg>
);

// Tipo badge variant → token de cor
const tipoBadgeStyle = (tipo: string): React.CSSProperties => {
  if (tipo === 'entrada') return { background: 'var(--success-light)', color: 'var(--success)' };
  if (tipo === 'saida')   return { background: 'var(--danger-light)',  color: 'var(--danger)'  };
  return { background: 'var(--warning-light)', color: 'var(--primary-dark)' };
};

// ── MOVIMENTAÇÃO FORM ─────────────────────────────────────────────────────────

export function MovimentacaoForm({
  produto, onCancel, onSave,
}: {
  produto: Produto;
  onCancel: () => void;
  onSave: (m: Omit<Movimentacao, 'id' | 'criadoEm'>, custoEntrada?: number) => void;
}) {
  const [tipo, setTipo] = useState<TipoMov>('saida');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [motivo, setMotivo] = useState<string>('');
  const [custoEntrada, setCustoEntrada] = useState<number | undefined>(undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (quantidade <= 0) return;
    onSave({ produtoId: produto.id, tipo, quantidade, motivo: motivo.trim() || undefined }, custoEntrada);
  }

  useEffect(() => { if (tipo !== 'entrada') setCustoEntrada(undefined); }, [tipo]);

  return (
    <form onSubmit={submit}>
      <div className="mb-3" style={{ fontSize: '13.5px', color: 'var(--text-2)' }}>
        Estoque atual:{' '}
        <strong style={{ color: 'var(--text-1)' }}>{produto.quantidade} {produto.unidade}</strong>
        {produto.valorUnitario != null && (
          <span className="ms-2" style={{ color: 'var(--text-3)', fontSize: '12px' }}>
            (Valor Unit.: R$ {Number(produto.valorUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
          </span>
        )}
      </div>

      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label">Tipo</label>
          <select className="form-select" value={tipo} onChange={e => setTipo(e.target.value as TipoMov)}>
            <option value="saida">Saída</option>
            <option value="entrada">Entrada</option>
            <option value="ajuste">Ajuste de Estoque</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">{tipo === 'ajuste' ? 'Nova Quantidade' : 'Quantidade'}</label>
          <input type="number" min={1} className="form-control" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} required />
        </div>
        {tipo === 'entrada' && (
          <div className="col-md-4">
            <label className="form-label">Custo Unit. (Novo)</label>
            <input
              type="number" step="0.01" min="0" className="form-control"
              placeholder="R$" value={custoEntrada ?? ''}
              onChange={e => setCustoEntrada(e.target.value === '' ? undefined : Number(e.target.value))}
            />
            <small style={{ fontSize: '11px', color: 'var(--text-3)' }}>Atualiza média ponderada</small>
          </div>
        )}
        <div className="col-md-12">
          <label className="form-label">Motivo (opcional)</label>
          <input className="form-control" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Uso na obra, Requisição" />
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 mt-4">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          <IconX /> Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          <IconCheck /> Salvar Movimentação
        </button>
      </div>
    </form>
  );
}

// ── MOVS LIST (últimas movimentações no dashboard) ────────────────────────────

export function MovsList({ movs, produtos }: { movs: Movimentacao[]; produtos: Produto[] }) {
  const produtoMap = useMemo(() => new Map(produtos.map(p => [p.id, p])), [produtos]);
  const getProdutoNome = (id: UUID) => produtoMap.get(id)?.nome ?? 'N/A';

  if (movs.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: '13.5px' }}>
        Nenhuma movimentação registrada ainda.
      </div>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {movs.map(m => (
        <li
          key={m.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '12px 0',
            borderBottom: '1px solid var(--border)',
            gap: '12px',
          }}
        >
          <div>
            <span
              className="badge me-2"
              style={{ ...tipoBadgeStyle(m.tipo), fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '.5px' }}
            >
              {m.tipo.toUpperCase()}
            </span>
            <strong style={{ color: 'var(--text-1)', fontSize: '13.5px' }}>{m.quantidade}</strong>
            <span style={{ color: 'var(--text-2)', fontSize: '13.5px' }}> — {getProdutoNome(m.produtoId)}</span>
            {m.motivo && (
              <small style={{ display: 'block', color: 'var(--text-3)', fontSize: '12px', marginTop: '2px' }}>
                {m.motivo}
              </small>
            )}
          </div>
          <small style={{ color: 'var(--text-3)', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {new Date(m.criadoEm).toLocaleString('pt-BR')}
          </small>
        </li>
      ))}
    </ul>
  );
}

// ── MOVIMENTAÇÃO EDIT FORM ────────────────────────────────────────────────────

export function MovimentacaoEditForm({
  movimentacao, produto, onCancel, onSave, motivosDisponiveis = [],
}: {
  movimentacao: Movimentacao;
  produto?: Produto;
  onCancel: () => void;
  onSave: (patch: { quantidade: number; motivo?: string }) => void;
  motivosDisponiveis?: string[];
}) {
  const [quantidade, setQuantidade] = useState(movimentacao.quantidade);
  const [motivo, setMotivo] = useState(movimentacao.motivo ?? '');

  const [showManageModal, setShowManageModal] = useState(false);
  const [hiddenMotivos, setHiddenMotivos] = useState<string[]>(() => {
    const saved = localStorage.getItem('movimentacaoHiddenOptions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('movimentacaoHiddenOptions', JSON.stringify(hiddenMotivos));
  }, [hiddenMotivos]);

  const visibleMotivos = motivosDisponiveis.filter(m => !hiddenMotivos.includes(m));
  const handleRemoveMotivo    = (item: string) => setHiddenMotivos(prev => [...prev, item]);
  const handleClearAllMotivos = () => setHiddenMotivos(prev => [...prev, ...visibleMotivos]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantidade <= 0) return;
    onSave({ quantidade, motivo: motivo.trim() || undefined });
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Produto</label>
          <input className="form-control" value={produto?.nome ?? 'N/A'} readOnly disabled />
        </div>
        <div className="mb-3">
          <label className="form-label">Tipo de Movimentação</label>
          <input className="form-control" value={movimentacao.tipo.toUpperCase()} readOnly disabled />
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Quantidade *</label>
            <input type="number" className="form-control" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} min="1" required />
          </div>

          {/* ── Motivo — label + engrenagem acima, input abaixo (padrão DeliveryForm) ── */}
          <div className="col-md-6">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label mb-0">Motivo (opcional)</label>
              <button
                type="button"
                className="btn-manage-discreet"
                style={{ height: '24px', padding: '0 6px' }}
                onClick={() => setShowManageModal(true)}
                title="Gerenciar Motivos"
              >
                <IconGear />
              </button>
            </div>
            <input
              type="text"
              className="form-control"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              list="edit-motivos-list"
              autoComplete="off"
            />
            <datalist id="edit-motivos-list">
              {visibleMotivos.map((m, i) => <option key={i} value={m} />)}
            </datalist>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn btn-primary">
            <IconCheck /> Salvar Alterações
          </button>
        </div>
      </form>

      <GerenciarHistoricoModal
        show={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Motivos"
        items={visibleMotivos}
        onRemove={handleRemoveMotivo}
        onClearAll={handleClearAllMotivos}
      />
    </>
  );
}

// ── CONSULTA MOVIMENTAÇÕES ────────────────────────────────────────────────────

export function ConsultaMovimentacoes({
  movs, produtos, onDelete, onEdit,
}: {
  movs: Movimentacao[];
  produtos: Produto[];
  onDelete: (id: UUID) => void;
  onEdit: (id: UUID, patch: { quantidade: number; motivo?: string }) => void;
}) {
  const [dataInicio,   setDataInicio]   = useState('');
  const [dataFim,      setDataFim]      = useState('');
  const [categoria,    setCategoria]    = useState('');
  const [filtroObra,   setFiltroObra]   = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  const [deleteId,     setDeleteId]     = useState<UUID | null>(null);
  const [editId,       setEditId]       = useState<UUID | null>(null);

  const produtoMap = useMemo(() => new Map(produtos.map(p => [p.id, p])), [produtos]);
  const categorias = useMemo(() => Array.from(new Set(produtos.map(p => p.categoria || '').filter(Boolean))), [produtos]);

  const motivosUnicos = useMemo(() => {
    const motivos = movs.map(m => m.motivo).filter(m => m && m.trim().length > 0) as string[];
    return Array.from(new Set(motivos)).sort();
  }, [movs]);

  const obrasUnicas = useMemo(() => {
    const obras = movs.map(m => m.nomeObra).filter(o => o && o.trim().length > 0) as string[];
    return Array.from(new Set(obras)).sort();
  }, [movs]);

  const filteredMovs = useMemo(() => {
    return movs.filter(mov => {
      const movDate = new Date(mov.criadoEm);
      if (dataInicio && movDate < new Date(`${dataInicio}T00:00:00`)) return false;
      if (dataFim) {
        const fimDate = new Date(`${dataFim}T00:00:00`);
        fimDate.setHours(23, 59, 59, 999);
        if (movDate > fimDate) return false;
      }
      if (categoria) { const p = produtoMap.get(mov.produtoId); if (!p || p.categoria !== categoria) return false; }
      if (filtroObra && mov.nomeObra !== filtroObra) return false;
      return true;
    });
  }, [movs, produtoMap, dataInicio, dataFim, categoria, filtroObra]);

  const custoTotalObra = useMemo(() => {
    if (!filtroObra) return 0;
    return filteredMovs
      .filter(m => m.tipo === 'saida')
      .reduce((total, m) => total + (m.quantidade * (Number(m.custoUnitarioHistorico) || 0)), 0);
  }, [filteredMovs, filtroObra]);

  useEffect(() => { setCurrentPage(1); }, [filteredMovs.length, itemsPerPage]);

  const paginatedMovs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMovs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMovs, currentPage, itemsPerPage]);

  const movParaDeletar = useMemo(() => movs.find(m => m.id === deleteId), [deleteId, movs]);
  const movParaEditar  = useMemo(() => movs.find(m => m.id === editId),   [editId,   movs]);

  const handleLimpar = () => { setDataInicio(''); setDataFim(''); setCategoria(''); setFiltroObra(''); };

  return (
    <div>
      {/* ── Título ── */}
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid var(--border)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.4px', color: 'var(--text-1)', margin: 0 }}>
          Consulta de Movimentações
        </h3>
      </div>

      {/* ── Filtros ── */}
      <div className="filter-panel mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-sm-6 col-lg-2">
            <label className="form-label">Data Início</label>
            <input type="date" className="form-control" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div className="col-12 col-sm-6 col-lg-2">
            <label className="form-label">Data Fim</label>
            <input type="date" className="form-control" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
          <div className="col-12 col-sm-4 col-lg-2">
            <label className="form-label">Categoria</label>
            <select className="form-select" value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">Todas</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-12 col-sm-4 col-lg-2">
            <label className="form-label">Obra</label>
            <select className="form-select" value={filtroObra} onChange={e => setFiltroObra(e.target.value)}>
              <option value="">Todas</option>
              {obrasUnicas.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="col-12 col-sm-4 col-lg-2">
            <label className="form-label">Itens/pág.</label>
            <select className="form-select" value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))}>
              <option value={30}>30</option>
              <option value={70}>70</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="col-12 col-lg-2">
            <button
              className="btn btn-ghost d-flex align-items-center gap-2 w-100 justify-content-center"
              onClick={handleLimpar}
            >
              <IconClear /> Limpar
            </button>
          </div>
        </div>

        {/* Custo da obra */}
        {filtroObra && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px 20px',
              background: '#EBF4FF',
              border: '1px solid #BFD7FF',
              borderRadius: 'var(--radius)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#1971C2' }}><IconBuilding /></span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1971C2' }}>
                  Custo em Materiais: {filtroObra}
                </div>
                <div style={{ fontSize: '11.5px', color: '#4A90D9' }}>
                  Total das saídas enviadas para a obra no período
                </div>
              </div>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#1971C2', fontFamily: 'DM Mono, monospace' }}>
              R$ {custoTotalObra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>

      {/* ── Tabela ── */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th className="d-none d-md-table-cell">Obra / OC</th>
              <th className="d-none d-md-table-cell">Motivo</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMovs.map(m => (
              <tr key={m.id}>
                <td style={{ fontSize: '12.5px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  {new Date(m.criadoEm).toLocaleString('pt-BR')}
                </td>
                <td style={{ fontWeight: 500 }}>{produtoMap.get(m.produtoId)?.nome ?? 'N/A'}</td>
                <td>
                  <span className="badge" style={tipoBadgeStyle(m.tipo)}>
                    {m.tipo.toUpperCase()}
                  </span>
                </td>
                <td>
                  <strong>{m.quantidade}</strong>{' '}
                  <small style={{ color: 'var(--text-3)' }}>{produtoMap.get(m.produtoId)?.unidade}</small>
                </td>

                {/* Obra / OC */}
                <td className="d-none d-md-table-cell">
                  {m.nomeObra && (
                    <span
                      className="badge me-1"
                      style={{ background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                      title="Obra"
                    >
                      {m.nomeObra}
                    </span>
                  )}
                  {m.ordemCompra && (
                    <span
                      className="badge"
                      style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', border: '1px solid #FAD898' }}
                      title="Ordem de Compra"
                    >
                      {m.ordemCompra}
                    </span>
                  )}
                  {!m.nomeObra && !m.ordemCompra && (
                    <span style={{ color: 'var(--text-3)' }}>—</span>
                  )}
                </td>

                <td className="d-none d-md-table-cell" style={{ color: 'var(--text-2)', fontSize: '13px' }}>
                  {m.motivo ?? <span style={{ color: 'var(--text-3)' }}>—</span>}
                </td>

                {/* Ações */}
                <td>
                  <div className="d-flex justify-content-end gap-1">
                    <button
                      className="act-btn"
                      onClick={() => setEditId(m.id)}
                      disabled={m.tipo === 'ajuste'}
                      title={m.tipo === 'ajuste' ? 'Ajustes não são editáveis' : 'Editar'}
                      style={{ color: 'var(--text-3)' }}
                    >
                      <IconEdit />
                    </button>
                    <button
                      className="act-btn del"
                      onClick={() => setDeleteId(m.id)}
                      disabled={m.tipo === 'ajuste'}
                      title={m.tipo === 'ajuste' ? 'Ajustes não podem ser excluídos' : 'Excluir'}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredMovs.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-3)', fontSize: '13.5px' }}>
                  Nenhuma movimentação encontrada para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="mt-3">
        <Paginacao
          totalItems={filteredMovs.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── Modals ── */}
      {movParaDeletar && (
        <ModalComponent title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>
            Você tem certeza que deseja excluir esta movimentação?
          </p>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancelar</button>
            <button
              className="btn btn-danger"
              onClick={() => { onDelete(deleteId!); setDeleteId(null); }}
            >
              <IconTrash /> Excluir
            </button>
          </div>
        </ModalComponent>
      )}

      {movParaEditar && (
        <ModalComponent title="Editar Movimentação" onClose={() => setEditId(null)}>
          <MovimentacaoEditForm
            movimentacao={movParaEditar}
            produto={produtoMap.get(movParaEditar.produtoId)}
            onCancel={() => setEditId(null)}
            onSave={patch => { onEdit(editId!, patch); setEditId(null); }}
            motivosDisponiveis={motivosUnicos}
          />
        </ModalComponent>
      )}
    </div>
  );
}