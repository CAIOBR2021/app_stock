import React, { useState, useEffect, useMemo } from 'react';
import type { Produto, Movimentacao, TipoMov, UUID } from '../types';
import { API_URL } from '../constants';
import { ModalComponent, PasswordEntryModal, GerenciarHistoricoModal } from './Shared';

export function ValorTotalEstoque({ allProdutos }: { allProdutos: Produto[] }) {
  const [valorTotal, setValorTotal] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && allProdutos.length > 0) {
      const total = allProdutos.reduce((acc, p) => {
        if (p.valorUnitario && p.quantidade) {
          return acc + p.valorUnitario * p.quantidade;
        }
        return acc;
      }, 0);
      setValorTotal(total);
    }
  }, [allProdutos, isVisible]);

  const handlePasswordSubmit = async (password: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/produtos/valor-total`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('Senha incorreta.');
        throw new Error('Falha ao buscar o valor total.');
      }
      const data = await response.json();
      setValorTotal(data.valorTotal);
      setIsVisible(true);
      setShowPasswordModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = () => {
    if (isVisible) {
      setIsVisible(false);
      setValorTotal(null);
    } else {
      setError('');
      setShowPasswordModal(true);
    }
  };

  return (
    <div className="d-flex align-items-center gap-2">
      {isVisible && valorTotal !== null && (
        <span className="badge bg-light text-dark p-2 total-value-badge border">
          Valor Total: <strong>{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </span>
      )}
      <button className="btn btn-outline-secondary btn-sm" onClick={toggleVisibility} title={isVisible ? 'Ocultar valor total' : 'Mostrar valor total'}>
        <i className={`bi ${isVisible ? 'bi-eye-slash' : 'bi-eye'}`}></i>
      </button>
      {showPasswordModal && (
        <PasswordEntryModal title="Acesso Restrito" message="Digite a senha de administrador para visualizar o valor total do estoque." submitText="Revelar" onClose={() => setShowPasswordModal(false)} onSubmit={handlePasswordSubmit} loading={loading} error={error} />
      )}
    </div>
  );
}

export function Relatorios({ produtos, categoriaSelecionada }: { produtos: Produto[]; categoriaSelecionada: string; }) {
  const [loading, setLoading] = useState(false);
  const handleGenerate = () => {
    setLoading(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const produtosParaRelatorio = categoriaSelecionada ? produtos.filter((p) => p.categoria === categoriaSelecionada) : produtos;
      const itemsToReorder = produtosParaRelatorio
        .filter((p) => p.estoqueMinimo !== undefined && p.quantidade < p.estoqueMinimo)
        .map((p) => ({ ...p, qtdRepor: p.estoqueMinimo! - p.quantidade }));
      if (itemsToReorder.length === 0) {
        alert(`Nenhum item precisa de reposição${categoriaSelecionada ? ` na categoria "${categoriaSelecionada}"` : ''}.`);
        setLoading(false);
        return;
      }
      const title = `Relatório de Reposição${categoriaSelecionada ? `: ${categoriaSelecionada}` : ''}`;
      doc.text(title, 14, 22);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
      (doc as any).autoTable({
        startY: 35,
        head: [['SKU', 'Nome', 'Estoque Atual', 'Estoque Mínimo', 'Qtd. a Repor']],
        body: itemsToReorder.map((item) => [item.sku, item.nome, `${item.quantidade} ${item.unidade}`, `${item.estoqueMinimo} ${item.unidade}`, `${item.qtdRepor} ${item.unidade}`]),
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: 245 },
      });
      doc.save(`relatorio-reposicao-${categoriaSelecionada || 'geral'}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Ocorreu um erro ao gerar o relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <button className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={handleGenerate} disabled={loading}>
      <i className="bi bi-file-earmark-arrow-down"></i>
      Gerar Relatório
    </button>
  );
}

export function ProdutoForm({ onCancel, onSave, produto, categorias, locais }: { onCancel: () => void; onSave: (p: any) => void; produto?: Produto; categorias: string[]; locais: string[]; }) {
  const [nome, setNome] = useState(produto?.nome ?? '');
  const [descricao, setDescricao] = useState(produto?.descricao ?? '');
  const [categoria, setCategoria] = useState(produto?.categoria ?? '');
  const [unidade, setUnidade] = useState(produto?.unidade ?? 'un');
  const [quantidade, setQuantidade] = useState<number>(produto?.quantidade ?? 0);
  const [estoqueMinimo, setEstoqueMinimo] = useState<number | undefined>(produto?.estoqueMinimo ?? undefined);
  const [localArmazenamento, setLocalArmazenamento] = useState(produto?.localArmazenamento ?? '');
  const [fornecedor, setFornecedor] = useState(produto?.fornecedor ?? '');
  const [valorUnitario, setValorUnitario] = useState<number | undefined>(produto?.valorUnitario ?? undefined);

  // --- LÓGICA DA ENGRENAGEM DE HISTÓRICO ---
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageField, setManageField] = useState<'categorias' | 'locais' | null>(null);
  const [hiddenOptions, setHiddenOptions] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('produtoHiddenOptions');
    return saved ? JSON.parse(saved) : { categorias: [], locais: [] };
  });

  useEffect(() => {
    localStorage.setItem('produtoHiddenOptions', JSON.stringify(hiddenOptions));
  }, [hiddenOptions]);

  const visibleCategorias = categorias.filter((c) => !hiddenOptions.categorias?.includes(c));
  const visibleLocais = locais.filter((l) => !hiddenOptions.locais?.includes(l));

  const handleRemoveOption = (item: string) => {
    if (manageField && window.confirm(`Remover "${item}" das sugestões?`)) {
      setHiddenOptions((prev) => ({
        ...prev,
        [manageField]: [...(prev[manageField] || []), item],
      }));
    }
  };

  const handleClearAllOptions = () => {
    if (manageField && window.confirm('Tem certeza que deseja limpar todo o histórico de sugestões deste campo?')) {
      const currentVisible = manageField === 'categorias' ? visibleCategorias : visibleLocais;
      setHiddenOptions((prev) => ({
        ...prev,
        [manageField]: [...(prev[manageField] || []), ...currentVisible],
      }));
    }
  };
  // ----------------------------------------

  let valorTotalDisplay = '---';
  const quantidadeParaCalculo = produto ? produto.quantidade : quantidade;
  const valorUnitarioNumerico = valorUnitario != null && !isNaN(parseFloat(String(valorUnitario))) ? parseFloat(String(valorUnitario)) : null;

  if (typeof quantidadeParaCalculo === 'number' && typeof valorUnitarioNumerico === 'number') {
    const total = quantidadeParaCalculo * valorUnitarioNumerico;
    valorTotalDisplay = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    const baseData = {
      nome: nome.trim(),
      descricao: descricao.trim(),
      categoria: categoria.trim() || undefined,
      unidade,
      estoqueMinimo,
      localArmazenamento: localArmazenamento.trim() || undefined,
      fornecedor: fornecedor.trim() || undefined,
      valorUnitario: valorUnitario,
    };
    const finalData = !produto ? { ...baseData, quantidade } : baseData;
    onSave(finalData);
  }

  return (
    <>
      <form onSubmit={submit}>
        <div className="row g-3">
          {produto && (
            <div className="col-md-4">
              <label className="form-label">SKU</label>
              <input className="form-control" value={produto.sku} readOnly disabled />
            </div>
          )}
          <div className={produto ? 'col-md-8' : 'col-md-12'}>
            <label className="form-label">Nome *</label>
            <input className="form-control" placeholder="Ex: Parafuso Sextavado" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="col-12">
            <label className="form-label">Descrição</label>
            <textarea className="form-control" placeholder="Detalhes do produto (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          
          <div className="col-12 col-md-6">
            <label className="form-label">Categoria</label>
            <div className="d-flex align-items-center">
              <div className="flex-grow-1">
                <input className="form-control" placeholder="Ex: Ferragens" value={categoria} onChange={(e) => setCategoria(e.target.value)} list="cats" autoComplete="off" />
                <datalist id="cats">{visibleCategorias.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <button type="button" className="btn-manage-discreet ms-1" onClick={() => { setManageField('categorias'); setShowManageModal(true); }} title="Gerenciar Categorias">
                <i className="bi bi-gear-fill" style={{ fontSize: '18px' }}></i>
              </button>
            </div>
          </div>
          
          <div className="col-12 col-md-6">
            <label className="form-label">Local de Armazenamento</label>
            <div className="d-flex align-items-center">
              <div className="flex-grow-1">
                <input className="form-control" placeholder="Ex: Pátio 04" value={localArmazenamento} onChange={(e) => setLocalArmazenamento(e.target.value)} list="locais" autoComplete="off" />
                <datalist id="locais">{visibleLocais.map((l) => <option key={l} value={l} />)}</datalist>
              </div>
              <button type="button" className="btn-manage-discreet ms-1" onClick={() => { setManageField('locais'); setShowManageModal(true); }} title="Gerenciar Locais">
                <i className="bi bi-gear-fill" style={{ fontSize: '18px' }}></i>
              </button>
            </div>
          </div>
          
          <div className="col-12 col-sm-4">
            <label className="form-label">Unidade de Medida</label>
            <input className="form-control" placeholder="un, kg, m, L" value={unidade} onChange={(e) => setUnidade(e.target.value)} required />
          </div>
          <div className="col-12 col-sm-4">
            <label className="form-label">Quantidade Inicial</label>
            <input type="number" min={0} className="form-control" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} disabled={!!produto} />
          </div>
          <div className="col-12 col-sm-4">
            <label className="form-label">Estoque Mínimo</label>
            <input type="number" min={0} className="form-control" value={estoqueMinimo ?? ''} onChange={(e) => setEstoqueMinimo(e.target.value === '' ? undefined : Number(e.target.value))} />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Valor Unitário (R$)</label>
            <input type="number" step="0.01" min="0" className="form-control" placeholder="opcional" value={valorUnitario ?? ''} onChange={(e) => setValorUnitario(e.target.value === '' ? undefined : Number(e.target.value))} />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Valor Total em Estoque (R$)</label>
            <input type="text" className="form-control" readOnly disabled value={valorTotalDisplay} />
          </div>
          <div className="col-md-12">
            <label className="form-label">Fornecedor</label>
            <input className="form-control" placeholder="Nome do fornecedor (opcional)" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </div>
        </div>
        <div className="text-end mt-4">
          <button type="button" className="btn btn-secondary me-2" onClick={onCancel}><i className="bi bi-x-circle d-none d-lg-inline-block me-1"></i>Cancelar</button>
          <button type="submit" className="btn btn-primary"><i className="bi bi-check2-circle d-none d-lg-inline-block me-1"></i>Salvar</button>
        </div>
      </form>

      <GerenciarHistoricoModal
        show={showManageModal}
        onClose={() => setShowManageModal(false)}
        title={manageField === 'categorias' ? 'Categorias' : 'Locais de Armazenamento'}
        items={manageField === 'categorias' ? visibleCategorias : visibleLocais}
        onRemove={handleRemoveOption}
        onClearAll={handleClearAllOptions}
      />
    </>
  );
}

export function BotaoNovoProduto({ onCreate, categorias, locais }: { onCreate: (p: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm' | 'sku'>) => void; categorias: string[]; locais: string[]; }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setOpen(true)}><i className="bi bi-plus-lg"></i>Novo Produto</button>
      {open && (
        <ModalComponent title="Novo Produto" onClose={() => setOpen(false)}>
          <ProdutoForm onCancel={() => setOpen(false)} onSave={(p) => { onCreate(p); setOpen(false); }} categorias={categorias} locais={locais} />
        </ModalComponent>
      )}
    </>
  );
}

export function ProdutoCard({ produto, onMovimentar, onEditar, onExcluir, onTogglePrioritario }: { produto: Produto; onMovimentar: () => void; onEditar: () => void; onExcluir: () => void; onTogglePrioritario: () => void; }) {
  const isBelowMin = produto.estoqueMinimo != null && produto.quantidade <= produto.estoqueMinimo;
  return (
    <div className={`card h-100 product-card ${isBelowMin ? 'border-warning' : ''}`}>
      <div className="card-body d-flex flex-column p-3 position-relative">
        <div className="card-indicators">
          {isBelowMin && <i className="bi bi-exclamation-triangle-fill text-warning" title="Estoque abaixo do mínimo!"></i>}
          {produto.prioritario && <i className="bi bi-flag-fill priority-flag is-priority" title="Item prioritário!"></i>}
          {produto.valorUnitario != null && produto.valorUnitario > 0 && <i className="bi bi-tag-fill text-success" title="Valor unitário registrado"></i>}
        </div>
        <h6 className="card-title card-title-clamp mb-2 fw-bold">{produto.nome}</h6>
        <div className="card-info-grid my-2">
          <div><strong>Estoque</strong><span>{produto.quantidade} {produto.unidade}</span></div>
          <div><strong>Local</strong><span>{produto.localArmazenamento || '-'}</span></div>
          <div><strong>Categoria</strong><span>{produto.categoria || '-'}</span></div>
          <div><strong>SKU</strong><span className="sku">{produto.sku}</span></div>
        </div>
        <div className="mt-auto dropdown">
          <button className="btn btn-sm btn-secondary dropdown-toggle w-100" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i className="bi bi-gear-fill me-1"></i> Ações</button>
          <ul className="dropdown-menu">
            <li><button className="dropdown-item" onClick={onMovimentar}><i className="bi bi-arrows-move me-2"></i>Movimentar</button></li>
            <li><button className="dropdown-item" onClick={onEditar}><i className="bi bi-pencil-square me-2"></i>Editar</button></li>
            <li><button className="dropdown-item" onClick={onTogglePrioritario}><i className="bi bi-flag me-2"></i>{produto.prioritario ? 'Desmarcar Prioridade' : 'Marcar Prioridade'}</button></li>
            <li><hr className="dropdown-divider" /></li>
            <li><button className="dropdown-item text-danger" onClick={onExcluir}><i className="bi bi-trash me-2"></i>Excluir</button></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    if (tipo !== 'entrada') setCustoEntrada(undefined);
  }, [tipo]);

  return (
    <form onSubmit={submit}>
      <div className="mb-3">
        Estoque atual: <strong>{produto.quantidade} {produto.unidade}</strong>
        {produto.valorUnitario != null && (
          <span className="ms-2 text-muted">(Valor Unit. Atual: R$ {Number(produto.valorUnitario).toLocaleString('pt-BR', {minimumFractionDigits: 2})})</span>
        )}
      </div>
      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label">Tipo</label>
          <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMov)}>
            <option value="saida">Saída</option>
            <option value="entrada">Entrada</option>
            <option value="ajuste">Ajuste de Estoque</option>
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
        <button type="button" className="btn btn-secondary me-2" onClick={onCancel}><i className="bi bi-x-circle d-none d-lg-inline-block me-1"></i>Cancelar</button>
        <button type="submit" className="btn btn-primary"><i className="bi bi-check2-circle d-none d-lg-inline-block me-1"></i>Salvar Movimentação</button>
      </div>
    </form>
  );
}

export function ProdutosTable({ produtos, onEdit, onDelete, onAddMov, onTogglePrioritario, categorias, locais, sortOrder, onToggleSort }: { produtos: Produto[]; onEdit: (id: UUID, patch: Partial<Produto>) => void; onDelete: (id: UUID) => void; onAddMov: (m: Omit<Movimentacao, 'id' | 'criadoEm'>, custo?: number) => void; onTogglePrioritario: (id: UUID, currentState: boolean) => void; categorias: string[]; locais: string[]; sortOrder?: 'asc' | 'desc' | null; onToggleSort?: () => void; }) {
  const [editingId, setEditingId] = useState<UUID | null>(null);
  const [movProdId, setMovProdId] = useState<UUID | null>(null);
  const [deleteId, setDeleteId] = useState<UUID | null>(null);

  const produtoParaEditar = useMemo(() => produtos.find((p) => p.id === editingId), [editingId, produtos]);
  const produtoParaMov = useMemo(() => produtos.find((p) => p.id === movProdId), [movProdId, produtos]);
  const produtoParaDeletar = useMemo(() => produtos.find((p) => p.id === deleteId), [deleteId, produtos]);

  return (
    <>
      <div className="d-none d-lg-block products-table">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th style={{ width: '4%' }}></th>
                <th style={{ width: '12%' }}>SKU</th>
                <th style={{ width: '36%', cursor: 'pointer', userSelect: 'none' }} onClick={onToggleSort} title="Clique para ordenar por nome">
                  Nome
                  {sortOrder === 'asc' && <i className="bi bi-sort-alpha-down ms-2"></i>}
                  {sortOrder === 'desc' && <i className="bi bi-sort-alpha-down-alt ms-2"></i>}
                  {!sortOrder && <i className="bi bi-filter ms-2 text-muted" style={{fontSize: '0.8em', opacity: 0.5}}></i>}
                </th>
                <th style={{ width: '12%' }}>Categoria</th>
                <th style={{ width: '8%' }}>Qtd.</th>
                <th style={{ width: '8%' }}>Est. Mín.</th>
                <th style={{ width: '12%' }}>Local</th>
                <th style={{ width: '12%' }} className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className={p.estoqueMinimo != null && p.quantidade <= p.estoqueMinimo ? 'table-warning' : ''}>
                  <td className="text-center">
                    <button className="btn-icon" onClick={() => onTogglePrioritario(p.id, !!p.prioritario)} title={p.prioritario ? 'Desmarcar como prioritário' : 'Marcar como prioritário'}>
                      <i className={`bi bi-flag-fill fs-5 priority-flag ${p.prioritario ? 'is-priority' : ''}`}></i>
                    </button>
                  </td>
                  <td><span className="sku">{p.sku}</span></td>
                  <td>
                    <span className="product-name">{p.nome}</span>
                    {p.estoqueMinimo != null && p.quantidade <= p.estoqueMinimo && <i className="bi bi-exclamation-triangle-fill text-warning ms-2" title="Estoque abaixo do mínimo!"></i>}
                    {p.valorUnitario != null && p.valorUnitario > 0 && <i className="bi bi-tag-fill text-success ms-2" title="Valor unitário registrado"></i>}
                  </td>
                  <td>{p.categoria ?? '-'}</td>
                  <td>{p.quantidade} <small className="text-muted">{p.unidade}</small></td>
                  <td>{p.estoqueMinimo ?? '-'}</td>
                  <td>{p.localArmazenamento ?? '-'}</td>
                  <td className="text-end">
                    <div className="btn-group btn-group-sm action-buttons-group" role="group">
                      <button type="button" className="btn btn-movimentar" onClick={() => setMovProdId(p.id)} title="Movimentar"><i className="bi bi-arrows-move"></i></button>
                      <button type="button" className="btn btn-editar" onClick={() => setEditingId(p.id)} title="Editar"><i className="bi bi-pencil-square"></i></button>
                      <button type="button" className="btn btn-excluir" onClick={() => setDeleteId(p.id)} title="Excluir"><i className="bi bi-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {produtos.length === 0 && (
                <tr><td colSpan={8} className="text-center py-5"><h5>Nenhum produto encontrado</h5><p className="text-muted">Tente ajustar seus filtros ou busca.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="d-lg-none">
        <div className="row g-3">
          {produtos.map((p) => (
            <div key={p.id} className="col-12 col-md-6">
              <ProdutoCard produto={p} onMovimentar={() => setMovProdId(p.id)} onEditar={() => setEditingId(p.id)} onExcluir={() => setDeleteId(p.id)} onTogglePrioritario={() => onTogglePrioritario(p.id, !!p.prioritario)} />
            </div>
          ))}
          {produtos.length === 0 && (
            <div className="col-12 text-center text-muted py-5"><h5>Nenhum produto encontrado</h5><p className="text-muted">Tente ajustar seus filtros ou busca.</p></div>
          )}
        </div>
      </div>
      {produtoParaEditar && (
        <ModalComponent title={`Editar: ${produtoParaEditar.nome}`} onClose={() => setEditingId(null)}>
          <ProdutoForm produto={produtoParaEditar} onCancel={() => setEditingId(null)} onSave={(vals) => { onEdit(editingId!, vals); setEditingId(null); }} categorias={categorias} locais={locais} />
        </ModalComponent>
      )}
      {produtoParaMov && (
        <ModalComponent title={`Movimentar: ${produtoParaMov.nome}`} onClose={() => setMovProdId(null)}>
          <MovimentacaoForm produto={produtoParaMov} onCancel={() => setMovProdId(null)} onSave={(m, custo) => { onAddMov(m, custo); setMovProdId(null); }} />
        </ModalComponent>
      )}
      {produtoParaDeletar && (
        <ModalComponent title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <p>Você tem certeza que deseja excluir o produto <strong>{produtoParaDeletar.nome}</strong>?</p>
          <p>Esta ação não pode ser desfeita e removerá todas as movimentações associadas.</p>
          <div className="text-end mt-4">
            <button className="btn btn-secondary me-2" onClick={() => setDeleteId(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={() => { onDelete(deleteId!); setDeleteId(null); }}>Confirmar Exclusão</button>
          </div>
        </ModalComponent>
      )}
    </>
  );
}