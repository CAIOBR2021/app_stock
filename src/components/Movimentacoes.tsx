import React, { useState, useEffect, useMemo } from 'react';
import type { Movimentacao, Produto, UUID, TipoMov } from '../types';
import { ModalComponent, GerenciarHistoricoModal, Paginacao } from './Shared';

export function MovimentacaoForm({ produto, onCancel, onSave }: { produto: Produto; onCancel: () => void; onSave: (m: Omit<Movimentacao, 'id' | 'criadoEm'>, custoEntrada?: number) => void; }) {
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
      <div className="mb-3">
        Estoque atual: <strong>{produto.quantidade} {produto.unidade}</strong>
        {produto.valorUnitario != null && <span className="ms-2 text-muted">(Valor Unit. Atual: R$ {Number(produto.valorUnitario).toLocaleString('pt-BR', {minimumFractionDigits: 2})})</span>}
      </div>
      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label">Tipo</label>
          <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMov)}>
            <option value="saida">Saída</option><option value="entrada">Entrada</option><option value="ajuste">Ajuste de Estoque</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">{tipo === 'ajuste' ? 'Nova Quantidade' : 'Quantidade'}</label>
          <input type="number" min={1} className="form-control" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} required />
        </div>
        {tipo === 'entrada' && (
          <div className="col-md-4">
            <label className="form-label">Custo Unit. (Novo)</label>
            <input type="number" step="0.01" min="0" className="form-control" placeholder="R$" value={custoEntrada ?? ''} onChange={(e) => setCustoEntrada(e.target.value === '' ? undefined : Number(e.target.value))} />
            <small className="text-muted" style={{fontSize: '0.75rem'}}>Atualiza média ponderada</small>
          </div>
        )}
        <div className="col-md-12">
          <label className="form-label">Motivo (opcional)</label>
          <input className="form-control" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Uso na obra, Requisição" />
        </div>
      </div>
      <div className="text-end mt-4">
        <button type="button" className="btn btn-secondary me-2" onClick={onCancel}><i className="bi bi-x-circle d-none d-lg-inline-block me-1"></i> Cancelar</button>
        <button type="submit" className="btn btn-primary"><i className="bi bi-check2-circle d-none d-lg-inline-block me-1"></i> Salvar Movimentação</button>
      </div>
    </form>
  );
}

export function MovsList({ movs, produtos }: { movs: Movimentacao[]; produtos: Produto[] }) {
  const produtoMap = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const getProdutoNome = (id: UUID) => produtoMap.get(id)?.nome ?? 'N/A';

  if (movs.length === 0) return <div className="text-center text-muted py-3">Nenhuma movimentação registrada ainda.</div>;

  return (
    <ul className="list-group">
      {movs.map((m) => (
        <li key={m.id} className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <div>
            <span className={`badge me-2 bg-${m.tipo === 'entrada' ? 'success' : m.tipo === 'saida' ? 'danger' : 'warning'}`}>{m.tipo.toUpperCase()}</span>
            <strong>{m.quantidade}</strong> para o produto <strong>{getProdutoNome(m.produtoId)}</strong>
            {m.motivo && <small className="d-block text-muted">Motivo: {m.motivo}</small>}
          </div>
          <small className="text-muted align-self-start align-self-sm-center">{new Date(m.criadoEm).toLocaleString('pt-BR')}</small>
        </li>
      ))}
    </ul>
  );
}

export function MovimentacaoEditForm({ movimentacao, produto, onCancel, onSave, motivosDisponiveis = [] }: { movimentacao: Movimentacao; produto?: Produto; onCancel: () => void; onSave: (patch: { quantidade: number; motivo?: string }) => void; motivosDisponiveis?: string[]; }) {
  const [quantidade, setQuantidade] = useState(movimentacao.quantidade);
  const [motivo, setMotivo] = useState(movimentacao.motivo ?? '');
  
  // --- LÓGICA DA ENGRENAGEM ---
  const [showManageModal, setShowManageModal] = useState(false);
  const [hiddenMotivos, setHiddenMotivos] = useState<string[]>(() => {
    const saved = localStorage.getItem('movimentacaoHiddenOptions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('movimentacaoHiddenOptions', JSON.stringify(hiddenMotivos)); }, [hiddenMotivos]);
  const visibleMotivos = motivosDisponiveis.filter(m => !hiddenMotivos.includes(m));

  const handleRemoveMotivo = (item: string) => { if (window.confirm(`Remover "${item}" das sugestões?`)) setHiddenMotivos(prev => [...prev, item]); };
  const handleClearAllMotivos = () => { if (window.confirm('Tem certeza que deseja limpar todo o histórico visível de motivos?')) setHiddenMotivos(prev => [...prev, ...visibleMotivos]); };
  // -----------------------------

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantidade <= 0) return;
    onSave({ quantidade, motivo: motivo.trim() || undefined });
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="mb-3"><label className="form-label">Produto</label><input className="form-control" value={produto?.nome ?? 'N/A'} readOnly disabled /></div>
        <div className="mb-3"><label className="form-label">Tipo de Movimentação</label><input className="form-control" value={movimentacao.tipo.toUpperCase()} readOnly disabled /></div>
        <div className="row g-3">
          <div className="col-md-6"><label className="form-label">Quantidade *</label><input type="number" className="form-control" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} min="1" required /></div>
          
          {/* CAMPO MOTIVO COM ENGRENAGEM PADRONIZADA */}
          <div className="col-md-6">
            <label className="form-label">Motivo (opcional)</label>
            <div className="d-flex align-items-center">
              <div className="flex-grow-1">
                <input type="text" className="form-control" value={motivo} onChange={(e) => setMotivo(e.target.value)} list="edit-motivos-list" autoComplete="off" />
                <datalist id="edit-motivos-list">{visibleMotivos.map((m, i) => <option key={i} value={m} />)}</datalist>
              </div>
              <button type="button" className="btn-manage-discreet ms-1" onClick={() => setShowManageModal(true)} title="Gerenciar Motivos">
                <i className="bi bi-gear-fill" style={{ fontSize: '18px' }}></i>
              </button>
            </div>
          </div>
        </div>
        <div className="text-end mt-4"><button type="button" className="btn btn-secondary me-2" onClick={onCancel}>Cancelar</button><button type="submit" className="btn btn-primary">Salvar Alterações</button></div>
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

export function ConsultaMovimentacoes({ movs, produtos, onDelete, onEdit }: { movs: Movimentacao[]; produtos: Produto[]; onDelete: (id: UUID) => void; onEdit: (id: UUID, patch: { quantidade: number; motivo?: string }) => void; }) {
  const [dataInicio, setDataInicio] = useState(''); const [dataFim, setDataFim] = useState(''); const [categoria, setCategoria] = useState('');
  const [currentPage, setCurrentPage] = useState(1); const [itemsPerPage, setItemsPerPage] = useState(30);
  const [deleteId, setDeleteId] = useState<UUID | null>(null); const [editId, setEditId] = useState<UUID | null>(null);

  const produtoMap = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const categorias = useMemo(() => Array.from(new Set(produtos.map((p) => p.categoria || '').filter(Boolean))), [produtos]);
  const motivosUnicos = useMemo(() => {
    const motivos = movs.map((m) => m.motivo).filter((m) => m && m.trim().length > 0) as string[];
    return Array.from(new Set(motivos)).sort();
  }, [movs]);

  const filteredMovs = useMemo(() => {
    return movs.filter((mov) => {
      const movDate = new Date(mov.criadoEm);
      if (dataInicio && movDate < new Date(`${dataInicio}T00:00:00`)) return false;
      if (dataFim) { const fimDate = new Date(`${dataFim}T00:00:00`); fimDate.setHours(23, 59, 59, 999); if (movDate > fimDate) return false; }
      if (categoria) { const produto = produtoMap.get(mov.produtoId); if (!produto || produto.categoria !== categoria) return false; }
      return true;
    });
  }, [movs, produtoMap, dataInicio, dataFim, categoria]);

  useEffect(() => { setCurrentPage(1); }, [filteredMovs.length, itemsPerPage]);

  const paginatedMovs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMovs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMovs, currentPage, itemsPerPage]);

  const movParaDeletar = useMemo(() => movs.find((m) => m.id === deleteId), [deleteId, movs]);
  const movParaEditar = useMemo(() => movs.find((m) => m.id === editId), [editId, movs]);

  return (
    <div>
      <h3 className="border-bottom pb-2 mb-4">Consulta de Movimentações</h3>
      <div className="filter-panel mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-sm-6 col-lg-3"><label className="form-label fw-bold">Data de Início</label><input type="date" className="form-control" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
          <div className="col-12 col-sm-6 col-lg-3"><label className="form-label fw-bold">Data de Fim</label><input type="date" className="form-control" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
          <div className="col-12 col-sm-6 col-lg-2"><label className="form-label fw-bold">Categoria</label><select className="form-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}><option value="">Todas</option>{categorias.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="col-12 col-sm-6 col-lg-2"><label className="form-label fw-bold">Itens por pág.</label><select className="form-select" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}><option value={30}>30</option><option value={70}>70</option><option value={100}>100</option></select></div>
          <div className="col-12 col-lg-2"><button className="btn btn-outline-secondary d-flex align-items-center w-100 justify-content-center" onClick={() => {setDataInicio(''); setDataFim(''); setCategoria('');}}><i className="bi bi-x-lg me-2"></i>Limpar</button></div>
        </div>
      </div>
      <div className="products-table">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead><tr><th>Data/Hora</th><th>Produto</th><th>Tipo</th><th>Quantidade</th><th className="d-none d-md-table-cell">Motivo</th><th className="text-end">Ações</th></tr></thead>
            <tbody>
              {paginatedMovs.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.criadoEm).toLocaleString('pt-BR')}</td>
                  <td>{produtoMap.get(m.produtoId)?.nome ?? 'N/A'}</td>
                  <td><span className={`badge bg-${m.tipo === 'entrada' ? 'success' : m.tipo === 'saida' ? 'danger' : 'warning'}`}>{m.tipo.toUpperCase()}</span></td>
                  <td>{m.quantidade} <small className="text-muted">{produtoMap.get(m.produtoId)?.unidade}</small></td>
                  <td className="d-none d-md-table-cell">{m.motivo ?? '-'}</td>
                  <td className="text-end">
                    <button className="btn-action text-primary" onClick={() => setEditId(m.id)} disabled={m.tipo === 'ajuste'} title={m.tipo === 'ajuste' ? 'Não editável' : 'Editar'}><i className="bi bi-pencil-square"></i></button>
                    <button className="btn-action text-danger" onClick={() => setDeleteId(m.id)} disabled={m.tipo === 'ajuste'} title={m.tipo === 'ajuste' ? 'Não exclusível' : 'Excluir'}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
              {filteredMovs.length === 0 && <tr><td colSpan={6} className="text-center py-4">Nenhuma movimentação encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-3"><Paginacao totalItems={filteredMovs.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} /></div>

      {movParaDeletar && (
        <ModalComponent title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <p>Você tem certeza que deseja excluir esta movimentação?</p>
          <div className="text-end mt-4"><button className="btn btn-secondary me-2" onClick={() => setDeleteId(null)}>Cancelar</button><button className="btn btn-danger" onClick={() => { onDelete(deleteId!); setDeleteId(null); }}>Confirmar Exclusão</button></div>
        </ModalComponent>
      )}
      {movParaEditar && (
        <ModalComponent title="Editar Movimentação" onClose={() => setEditId(null)}>
          <MovimentacaoEditForm movimentacao={movParaEditar} produto={produtoMap.get(movParaEditar.produtoId)} onCancel={() => setEditId(null)} onSave={(patch) => { onEdit(editId!, patch); setEditId(null); }} motivosDisponiveis={motivosUnicos} />
        </ModalComponent>
      )}
    </div>
  );
}