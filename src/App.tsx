import React, { useEffect, useState, useMemo } from 'react';
import { Form, Button } from 'react-bootstrap';
import { ClipboardData, CalendarWeek } from 'react-bootstrap-icons'; // Ícones novos


import meuLogo from './assets/logo.png';
import { DeliveryForm } from './components/DeliveryForm';
import { DeliveryTable } from './components/DeliveryTable';
import './styles.css';

// Adiciona jspdf ao objeto window para o TypeScript, pois é carregado via CDN (fallback) ou import
declare global {
  interface Window {
    jspdf: any;
  }
}

// --- DEFINIÇÕES DE TIPO ---
export type UUID = string;

export interface Produto {
  id: UUID;
  sku: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  unidade: string;
  quantidade: number;
  estoqueMinimo?: number;
  localArmazenamento?: string;
  fornecedor?: string;
  criadoEm: string;
  atualizadoEm?: string;
  prioritario?: boolean;
  valorUnitario?: number;
}

export type TipoMov = 'entrada' | 'saida' | 'ajuste';

export interface Movimentacao {
  id: UUID;
  produtoId: UUID;
  tipo: TipoMov;
  quantidade: number;
  motivo?: string;
  criadoEm: string;
}

// Novo Tipo para Entregas
export interface Entrega {
    id: UUID;
    dataHoraSolicitacao: string;
    localArmazenagem: string;
    localObra: string;
    produtoId: UUID;
    itemNome?: string;
    sku?: string;
    itemQuantidade: number;
    itemUnidadeMedida?: string;
    responsavelNome?: string;
    responsavelTelefone?: string;
    status: string;
}

// --- CONSTANTES E HOOKS ---
const API_URL = "https://app-stock-back.onrender.com/api";
const ITEMS_PER_PAGE = 30;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// --- COMPONENTES REUTILIZÁVEIS ---

function ModalComponent({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  return (
    <div
      className="modal"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

function PasswordEntryModal({
  onClose,
  onSubmit,
  loading,
  error,
  title,
  message,
  submitText = 'Confirmar',
}: {
  onClose: () => void;
  onSubmit: (password: string) => void;
  loading: boolean;
  error: string;
  title: string;
  message: string;
  submitText?: string;
}) {
  const [password, setPassword] = useState('');

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(password);
    }
  };

  return (
    <ModalComponent title={title} onClose={onClose}>
      <div>
        <p>{message}</p>
        <div className="mb-3">
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus
          />
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="text-end">
          <button
            type="button"
            className="btn btn-secondary me-2"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={() => onSubmit(password)}
          >
            {loading ? 'Verificando...' : submitText}
          </button>
        </div>
      </div>
    </ModalComponent>
  );
}

// --- COMPONENTES DA PÁGINA DE ESTOQUE ---

function ValorTotalEstoque({ allProdutos }: { allProdutos: Produto[] }) {
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
        if (response.status === 401) {
          throw new Error('Senha incorreta.');
        }
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
        <span className="badge bg-light text-dark p-2 total-value-badge">
          Valor Total:{' '}
          <strong>
            {valorTotal.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </strong>
        </span>
      )}
      <button
        className="btn btn-outline-secondary btn-sm"
        onClick={toggleVisibility}
        title={isVisible ? 'Ocultar valor total' : 'Mostrar valor total'}
      >
        <i className={`bi ${isVisible ? 'bi-eye-slash' : 'bi-eye'}`}></i>
      </button>

      {showPasswordModal && (
        <PasswordEntryModal
          title="Acesso Restrito"
          message="Digite a senha de administrador para visualizar o valor total do estoque."
          submitText="Revelar"
          onClose={() => setShowPasswordModal(false)}
          onSubmit={handlePasswordSubmit}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}

function BotaoNovoProduto({
  onCreate,
  categorias,
  locais,
}: {
  onCreate: (
    p: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm' | 'sku'>,
  ) => void;
  categorias: string[];
  locais: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <i className="bi bi-plus-lg me-1"></i>
        Novo Produto
      </button>
      {open && (
        <ModalComponent title="Novo Produto" onClose={() => setOpen(false)}>
          <ProdutoForm
            onCancel={() => setOpen(false)}
            onSave={(p) => {
              onCreate(p);
              setOpen(false);
            }}
            categorias={categorias}
            locais={locais}
          />
        </ModalComponent>
      )}
    </>
  );
}

function ProdutoForm({
  onCancel,
  onSave,
  produto,
  categorias,
  locais,
}: {
  onCancel: () => void;
  onSave: (p: any) => void;
  produto?: Produto;
  categorias: string[];
  locais: string[];
}) {
  const [nome, setNome] = useState(produto?.nome ?? '');
  const [descricao, setDescricao] = useState(produto?.descricao ?? '');
  const [categoria, setCategoria] = useState(produto?.categoria ?? '');
  const [unidade, setUnidade] = useState(produto?.unidade ?? 'un');
  const [quantidade, setQuantidade] = useState<number>(
    produto?.quantidade ?? 0,
  );
  const [estoqueMinimo, setEstoqueMinimo] = useState<number | undefined>(
    produto?.estoqueMinimo ?? undefined,
  );
  const [localArmazenamento, setLocalArmazenamento] = useState(
    produto?.localArmazenamento ?? '',
  );
  const [fornecedor, setFornecedor] = useState(produto?.fornecedor ?? '');
  const [valorUnitario, setValorUnitario] = useState<number | undefined>(
    produto?.valorUnitario ?? undefined,
  );

  // --- LÓGICA DE CÁLCULO DO VALOR TOTAL (AJUSTADA) ---
  let valorTotalDisplay = '---';
  const quantidadeParaCalculo = produto ? produto.quantidade : quantidade;

  // Garante que o valor unitário seja tratado como número para o cálculo
  const valorUnitarioNumerico =
    valorUnitario != null && !isNaN(parseFloat(String(valorUnitario)))
      ? parseFloat(String(valorUnitario))
      : null;

  if (
    typeof quantidadeParaCalculo === 'number' &&
    typeof valorUnitarioNumerico === 'number'
  ) {
    const total = quantidadeParaCalculo * valorUnitarioNumerico;
    valorTotalDisplay = total.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  // --- FIM DA LÓGICA ---

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
    <form onSubmit={submit}>
      <div className="row g-3">
        {produto && (
          <div className="col-md-4">
            <label className="form-label">SKU</label>
            <input
              className="form-control"
              value={produto.sku}
              readOnly
              disabled
            />
          </div>
        )}
        <div className={produto ? 'col-md-8' : 'col-md-12'}>
          <label className="form-label">Nome *</label>
          <input
            className="form-control"
            placeholder="Ex: Parafuso Sextavado"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>
        <div className="col-12">
          <label className="form-label">Descrição</label>
          <textarea
            className="form-control"
            placeholder="Detalhes do produto (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Categoria</label>
          <input
            className="form-control"
            placeholder="Ex: Ferragens"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            list="cats"
          />
          <datalist id="cats">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Local de Armazenamento</label>
          <input
            className="form-control"
            placeholder="Ex: Pátio 04"
            value={localArmazenamento}
            onChange={(e) => setLocalArmazenamento(e.target.value)}
            list="locais"
          />
          <datalist id="locais">
            {locais.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>
        <div className="col-12 col-sm-4">
          <label className="form-label">Unidade de Medida</label>
          <input
            className="form-control"
            placeholder="un, kg, m, L"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            required
          />
        </div>
        <div className="col-12 col-sm-4">
          <label className="form-label">Quantidade Inicial</label>
          <input
            type="number"
            min={0}
            className="form-control"
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            disabled={!!produto}
          />
        </div>
        <div className="col-12 col-sm-4">
          <label className="form-label">Estoque Mínimo</label>
          <input
            type="number"
            min={0}
            className="form-control"
            value={estoqueMinimo ?? ''}
            onChange={(e) =>
              setEstoqueMinimo(
                e.target.value === '' ? undefined : Number(e.target.value),
              )
            }
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Valor Unitário (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="form-control"
            placeholder="opcional"
            value={valorUnitario ?? ''}
            onChange={(e) =>
              setValorUnitario(
                e.target.value === '' ? undefined : Number(e.target.value),
              )
            }
          />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">Valor Total em Estoque (R$)</label>
          <input
            type="text"
            className="form-control"
            readOnly
            disabled
            value={valorTotalDisplay}
          />
        </div>

        <div className="col-md-12">
          <label className="form-label">Fornecedor</label>
          <input
            className="form-control"
            placeholder="Nome do fornecedor (opcional)"
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
          />
        </div>
      </div>

      <div className="text-end mt-4">
        <button
          type="button"
          className="btn btn-secondary me-2"
          onClick={onCancel}
        >
          <i className="bi bi-x-circle d-none d-lg-inline-block me-1"></i>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          <i className="bi bi-check2-circle d-none d-lg-inline-block me-1"></i>
          Salvar
        </button>
      </div>
    </form>
  );
}

function ProdutoCard({
  produto,
  onMovimentar,
  onEditar,
  onExcluir,
  onTogglePrioritario,
}: {
  produto: Produto;
  onMovimentar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onTogglePrioritario: () => void;
}) {
  const isBelowMin =
    produto.estoqueMinimo != null &&
    produto.quantidade <= produto.estoqueMinimo;

  return (
    <div
      className={`card h-100 product-card ${
        isBelowMin ? 'border-warning' : ''
      }`}
    >
      <div className="card-body d-flex flex-column p-3 position-relative">
        <div className="card-indicators">
          {isBelowMin && (
            <i
              className="bi bi-exclamation-triangle-fill text-warning"
              title="Estoque abaixo do mínimo!"
            ></i>
          )}
          {produto.prioritario && (
            <i
              className="bi bi-flag-fill text-danger"
              title="Item prioritário!"
            ></i>
          )}
        </div>

        <h6 className="card-title card-title-clamp mb-2 fw-bold">
          {produto.nome}
        </h6>

        <div className="card-info-grid my-2">
          <div>
            <strong>Estoque</strong>
            <span>
              {produto.quantidade} {produto.unidade}
            </span>
          </div>
          <div>
            <strong>Local</strong>
            <span>{produto.localArmazenamento || '-'}</span>
          </div>
          <div>
            <strong>Categoria</strong>
            <span>{produto.categoria || '-'}</span>
          </div>
          <div>
            <strong>SKU</strong>
            <span className="sku">{produto.sku}</span>
          </div>
        </div>

        <div className="mt-auto dropdown">
          <button
            className="btn btn-sm btn-secondary dropdown-toggle w-100"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="bi bi-gear-fill me-1"></i> Ações
          </button>
          <ul className="dropdown-menu">
            <li>
              <button className="dropdown-item" onClick={onMovimentar}>
                <i className="bi bi-arrows-move me-2"></i>Movimentar
              </button>
            </li>
            <li>
              <button className="dropdown-item" onClick={onEditar}>
                <i className="bi bi-pencil-square me-2"></i>Editar
              </button>
            </li>
            <li>
              <button className="dropdown-item" onClick={onTogglePrioritario}>
                <i className="bi bi-flag me-2"></i>
                {produto.prioritario
                  ? 'Desmarcar Prioridade'
                  : 'Marcar Prioridade'}
              </button>
            </li>
            <li>
              <hr className="dropdown-divider" />
            </li>
            <li>
              <button className="dropdown-item text-danger" onClick={onExcluir}>
                <i className="bi bi-trash me-2"></i>Excluir
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ProdutosTable({
  produtos,
  onEdit,
  onDelete,
  onAddMov,
  onTogglePrioritario,
  categorias,
  locais,
}: {
  produtos: Produto[];
  onEdit: (id: UUID, patch: Partial<Produto>) => void;
  onDelete: (id: UUID) => void;
  onAddMov: (m: Omit<Movimentacao, 'id' | 'criadoEm'>) => void;
  onTogglePrioritario: (id: UUID, currentState: boolean) => void;
  categorias: string[];
  locais: string[];
}) {
  const [editingId, setEditingId] = useState<UUID | null>(null);
  const [movProdId, setMovProdId] = useState<UUID | null>(null);
  const [deleteId, setDeleteId] = useState<UUID | null>(null);

  const produtoParaEditar = useMemo(
    () => produtos.find((p) => p.id === editingId),
    [editingId, produtos],
  );
  const produtoParaMov = useMemo(
    () => produtos.find((p) => p.id === movProdId),
    [movProdId, produtos],
  );
  const produtoParaDeletar = useMemo(
    () => produtos.find((p) => p.id === deleteId),
    [deleteId, produtos],
  );

  return (
    <>
      <div className="d-none d-lg-block products-table">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th style={{ width: '4%' }}></th> {/* Prioridade */}
                <th style={{ width: '12%' }}>SKU</th>
                <th style={{ width: '36%' }}>Nome</th>
                <th style={{ width: '12%' }}>Categoria</th>
                <th style={{ width: '8%' }}>Qtd.</th>
                <th style={{ width: '8%' }}>Est. Mín.</th>
                <th style={{ width: '12%' }}>Local</th>
                <th style={{ width: '12%' }} className="text-end">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr
                  key={p.id}
                  className={
                    p.estoqueMinimo != null && p.quantidade <= p.estoqueMinimo
                      ? 'table-warning'
                      : ''
                  }
                >
                  <td className="text-center">
                    <button
                      className="btn-icon"
                      onClick={() => onTogglePrioritario(p.id, !!p.prioritario)}
                      title={
                        p.prioritario
                          ? 'Desmarcar como prioritário'
                          : 'Marcar como prioritário'
                      }
                    >
                      <i
                        className={`bi bi-flag-fill fs-5 priority-flag ${
                          p.prioritario ? 'is-priority' : ''
                        }`}
                      ></i>
                    </button>
                  </td>
                  <td>
                    <span className="sku">{p.sku}</span>
                  </td>
                  <td>
                    <span className="product-name">{p.nome}</span>
                    {p.estoqueMinimo != null &&
                      p.quantidade <= p.estoqueMinimo && (
                        <i
                          className="bi bi-exclamation-triangle-fill text-warning ms-2"
                          title="Estoque abaixo do mínimo!"
                        ></i>
                      )}
                  </td>
                  <td>{p.categoria ?? '-'}</td>
                  <td>
                    {p.quantidade}{' '}
                    <small className="text-muted">{p.unidade}</small>
                  </td>
                  <td>{p.estoqueMinimo ?? '-'}</td>
                  <td>{p.localArmazenamento ?? '-'}</td>
                  <td className="text-end">
                    <div className="btn-group btn-group-sm action-buttons-group" role="group">
                      <button
                        type="button"
                        className="btn btn-movimentar"
                        onClick={() => setMovProdId(p.id)}
                        title="Movimentar"
                      >
                        <i className="bi bi-arrows-move"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-editar"
                        onClick={() => setEditingId(p.id)}
                        title="Editar"
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-excluir"
                        onClick={() => setDeleteId(p.id)}
                        title="Excluir"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {produtos.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <h5>Nenhum produto encontrado</h5>
                    <p className="text-muted">
                      Tente ajustar seus filtros ou busca.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="d-lg-none">
        <div className="row g-3">
          {produtos.map((p) => (
            <div key={p.id} className="col-12 col-sm-6">
              <ProdutoCard
                produto={p}
                onMovimentar={() => setMovProdId(p.id)}
                onEditar={() => setEditingId(p.id)}
                onExcluir={() => setDeleteId(p.id)}
                onTogglePrioritario={() =>
                  onTogglePrioritario(p.id, !!p.prioritario)
                }
              />
            </div>
          ))}
          {produtos.length === 0 && (
            <div className="col-12 text-center text-muted py-5">
              <h5>Nenhum produto encontrado</h5>
              <p className="text-muted">Tente ajustar seus filtros ou busca.</p>
            </div>
          )}
        </div>
      </div>

      {produtoParaEditar && (
        <ModalComponent
          title={`Editar: ${produtoParaEditar.nome}`}
          onClose={() => setEditingId(null)}
        >
          <ProdutoForm
            produto={produtoParaEditar}
            onCancel={() => setEditingId(null)}
            onSave={(vals) => {
              onEdit(editingId!, vals);
              setEditingId(null);
            }}
            categorias={categorias}
            locais={locais}
          />
        </ModalComponent>
      )}
      {produtoParaMov && (
        <ModalComponent
          title={`Movimentar: ${produtoParaMov.nome}`}
          onClose={() => setMovProdId(null)}
        >
          <MovimentacaoForm
            produto={produtoParaMov}
            onCancel={() => setMovProdId(null)}
            onSave={(m) => {
              onAddMov(m);
              setMovProdId(null);
            }}
          />
        </ModalComponent>
      )}
      {produtoParaDeletar && (
        <ModalComponent title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <p>
            Você tem certeza que deseja excluir o produto{' '}
            <strong>{produtoParaDeletar.nome}</strong>?
          </p>
          <p>
            Esta ação não pode ser desfeita e removerá todas as movimentações
            associadas.
          </p>
          <div className="text-end mt-4">
            <button
              className="btn btn-secondary me-2"
              onClick={() => setDeleteId(null)}
            >
              Cancelar
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                onDelete(deleteId!);
                setDeleteId(null);
              }}
            >
              Confirmar Exclusão
            </button>
          </div>
        </ModalComponent>
      )}
    </>
  );
}

function MovimentacaoForm({
  produto,
  onCancel,
  onSave,
}: {
  produto: Produto;
  onCancel: () => void;
  onSave: (m: Omit<Movimentacao, 'id' | 'criadoEm'>) => void;
}) {
  const [tipo, setTipo] = useState<TipoMov>('saida');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [motivo, setMotivo] = useState<string>('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (quantidade <= 0) return;
    onSave({
      produtoId: produto.id,
      tipo,
      quantidade,
      motivo: motivo.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-3">
        Estoque atual:{' '}
        <strong>
          {produto.quantidade} {produto.unidade}
        </strong>
      </div>
      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label">Tipo</label>
          <select
            className="form-select"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMov)}
          >
            <option value="saida">Saída</option>
            <option value="entrada">Entrada</option>
            <option value="ajuste">Ajuste de Estoque</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">
            {tipo === 'ajuste' ? 'Nova Quantidade' : 'Quantidade'}
          </label>
          <input
            type="number"
            min={1}
            className="form-control"
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            required
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Motivo (opcional)</label>
          <input
            className="form-control"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: Uso na obra, Requisição"
          />
        </div>
      </div>
      <div className="text-end mt-4">
        <button
          type="button"
          className="btn btn-secondary me-2"
          onClick={onCancel}
        >
          <i className="bi bi-x-circle d-none d-lg-inline-block me-1"></i>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          <i className="bi bi-check2-circle d-none d-lg-inline-block me-1"></i>
          Salvar Movimentação
        </button>
      </div>
    </form>
  );
}

function MovsList({
  movs,
  produtos,
}: {
  movs: Movimentacao[];
  produtos: Produto[];
}) {
  const produtoMap = useMemo(
    () => new Map(produtos.map((p) => [p.id, p])),
    [produtos],
  );
  const getProdutoNome = (id: UUID) => produtoMap.get(id)?.nome ?? 'N/A';

  if (movs.length === 0)
    return (
      <div className="text-center text-muted py-3">
        Nenhuma movimentação registrada ainda.
      </div>
    );

  return (
    <ul className="list-group">
      {movs.map((m) => (
        <li
          key={m.id}
          className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2"
        >
          <div>
            <span
              className={`badge me-2 bg-${
                m.tipo === 'entrada'
                  ? 'success'
                  : m.tipo === 'saida'
                  ? 'danger'
                  : 'warning'
              }`}
            >
              {m.tipo.toUpperCase()}
            </span>
            <strong>{m.quantidade}</strong> para o produto{' '}
            <strong>{getProdutoNome(m.produtoId)}</strong>
            {m.motivo && (
              <small className="d-block text-muted">Motivo: {m.motivo}</small>
            )}
          </div>
          <small className="text-muted align-self-start align-self-sm-center">
            {new Date(m.criadoEm).toLocaleString('pt-BR')}
          </small>
        </li>
      ))}
    </ul>
  );
}

function Relatorios({
  produtos,
  categoriaSelecionada,
}: {
  produtos: Produto[];
  categoriaSelecionada: string;
}) {
  const [loading, setLoading] = useState(false);
  const handleGenerate = () => {
    setLoading(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const produtosParaRelatorio = categoriaSelecionada
        ? produtos.filter((p) => p.categoria === categoriaSelecionada)
        : produtos;
      const itemsToReorder = produtosParaRelatorio
        .filter(
          (p) =>
            p.estoqueMinimo !== undefined && p.quantidade < p.estoqueMinimo,
        )
        .map((p) => ({ ...p, qtdRepor: p.estoqueMinimo! - p.quantidade }));
      if (itemsToReorder.length === 0) {
        alert(
          `Nenhum item precisa de reposição${
            categoriaSelecionada
              ? ` na categoria "${categoriaSelecionada}"`
              : ''
          }.`,
        );
        setLoading(false);
        return;
      }

      const title = `Relatório de Reposição${
        categoriaSelecionada ? `: ${categoriaSelecionada}` : ''
      }`;
      doc.text(title, 14, 22);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
      (doc as any).autoTable({
        startY: 35,
        head: [
          ['SKU', 'Nome', 'Estoque Atual', 'Estoque Mínimo', 'Qtd. a Repor'],
        ],
        body: itemsToReorder.map((item) => [
          item.sku,
          item.nome,
          `${item.quantidade} ${item.unidade}`,
          `${item.estoqueMinimo} ${item.unidade}`,
          `${item.qtdRepor} ${item.unidade}`,
        ]),
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: 245 },
      });
      doc.save(
        `relatorio-reposicao-${
          categoriaSelecionada || 'geral'
        }-${Date.now()}.pdf`,
      );
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Ocorreu um erro ao gerar o relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      className="btn btn-outline-secondary"
      onClick={handleGenerate}
      disabled={loading}
    >
      <i className="bi bi-file-earmark-arrow-down me-1"></i>
      Gerar Relatório
    </button>
  );
}

function Paginacao({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
}: {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) {
    return null;
  }
  const handlePageClick = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };
  const renderPageNumbers = () => {
    const pageNumbers: (number | string)[] = [];
    const pagesToShow = 3;
    if (totalPages <= pagesToShow + 4) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3) {
        startPage = 2;
        endPage = 3;
      }
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 2;
        endPage = totalPages - 1;
      }
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      pageNumbers.push(totalPages);
    }
    return pageNumbers.map((page, index) => (
      <li
        key={index}
        className={`page-item ${page === '...' ? 'disabled' : ''} ${
          currentPage === page ? 'active' : ''
        }`}
      >
        <button
          className="page-link"
          onClick={() => typeof page === 'number' && handlePageClick(page)}
        >
          {page}
        </button>
      </li>
    ));
  };
  return (
    <nav className="d-flex flex-column flex-sm-row justify-content-between align-items-center flex-wrap gap-2 w-100">
      <div>
        {totalItems > 0 && (
          <span className="text-muted small">
            Exibindo{' '}
            {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} -{' '}
            {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
          </span>
        )}
      </div>
      <ul className="pagination m-0">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => handlePageClick(currentPage - 1)}
            aria-label="Anterior"
          >
            &lt;
          </button>
        </li>
        {renderPageNumbers()}
        <li
          className={`page-item ${
            currentPage === totalPages ? 'disabled' : ''
          }`}
        >
          <button
            className="page-link"
            onClick={() => handlePageClick(currentPage + 1)}
            aria-label="Próxima"
          >
            &gt;
          </button>
        </li>
      </ul>
    </nav>
  );
}

// --- COMPONENTES DA PÁGINA DE MOVIMENTAÇÕES ---

function ConsultaMovimentacoes({
  movs,
  produtos,
  onDelete,
  onEdit,
}: {
  movs: Movimentacao[];
  produtos: Produto[];
  onDelete: (id: UUID) => void;
  onEdit: (id: UUID, patch: { quantidade: number; motivo?: string }) => void;
}) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [categoria, setCategoria] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  const [deleteId, setDeleteId] = useState<UUID | null>(null);
  const [editId, setEditId] = useState<UUID | null>(null);

  const produtoMap = useMemo(
    () => new Map(produtos.map((p) => [p.id, p])),
    [produtos],
  );
  const categorias = useMemo(
    () =>
      Array.from(
        new Set(produtos.map((p) => p.categoria || '').filter(Boolean)),
      ),
    [produtos],
  );

  const filteredMovs = useMemo(() => {
    return movs.filter((mov) => {
      const movDate = new Date(mov.criadoEm);
      if (dataInicio && movDate < new Date(`${dataInicio}T00:00:00`)) return false;
      if (dataFim) {
        const fimDate = new Date(`${dataFim}T00:00:00`);
        fimDate.setHours(23, 59, 59, 999);
        if (movDate > fimDate) return false;
      }
      if (categoria) {
        const produto = produtoMap.get(mov.produtoId);
        if (!produto || produto.categoria !== categoria) return false;
      }
      return true;
    });
  }, [movs, produtoMap, dataInicio, dataFim, categoria]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredMovs.length, itemsPerPage]);

  const paginatedMovs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMovs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMovs, currentPage, itemsPerPage]);

  const movParaDeletar = useMemo(
    () => movs.find((m) => m.id === deleteId),
    [deleteId, movs],
  );
  const movParaEditar = useMemo(
    () => movs.find((m) => m.id === editId),
    [editId, movs],
  );

  const resetFilters = () => {
    setDataInicio('');
    setDataFim('');
    setCategoria('');
  };

  return (
    <div>
      <h3 className="border-bottom pb-2 mb-4">Consulta de Movimentações</h3>
      <div className="filter-panel mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-sm-6 col-lg-3">
            <label htmlFor="dataInicio" className="form-label fw-bold">
              Data de Início
            </label>
            <input
              type="date"
              id="dataInicio"
              className="form-control"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <label htmlFor="dataFim" className="form-label fw-bold">
              Data de Fim
            </label>
            <input
              type="date"
              id="dataFim"
              className="form-control"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-2">
            <label htmlFor="catFilter" className="form-label fw-bold">
              Categoria
            </label>
            <select
              id="catFilter"
              className="form-select"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-sm-6 col-lg-2">
            <label htmlFor="itemsPerPage" className="form-label fw-bold">
              Itens por pág.
            </label>
            <select
              id="itemsPerPage"
              className="form-select"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              <option value={30}>30</option>
              <option value={70}>70</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="col-12 col-lg-2">
            <button
              className="btn btn-outline-secondary d-flex align-items-center w-100 justify-content-center"
              onClick={resetFilters}
            >
              <i className="bi bi-x-lg me-2"></i>Limpar
            </button>
          </div>
        </div>
      </div>
      <div className="products-table">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead /*className="table-light"*/>
              <tr>
                <th>Data/Hora</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th className="d-none d-md-table-cell">Motivo</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMovs.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.criadoEm).toLocaleString('pt-BR')}</td>
                  <td>{produtoMap.get(m.produtoId)?.nome ?? 'N/A'}</td>
                  <td>
                    <span
                      className={`badge bg-${
                        m.tipo === 'entrada'
                          ? 'success'
                          : m.tipo === 'saida'
                          ? 'danger'
                          : 'warning'
                      }`}
                    >
                      {m.tipo.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {m.quantidade}{' '}
                    <small className="text-muted">
                      {produtoMap.get(m.produtoId)?.unidade}
                    </small>
                  </td>
                  <td className="d-none d-md-table-cell">{m.motivo ?? '-'}</td>
                  <td className="text-end">
                    <button
                      className="btn-action text-primary"
                      onClick={() => setEditId(m.id)}
                      disabled={m.tipo === 'ajuste'}
                      title={
                        m.tipo === 'ajuste'
                          ? 'Não é possível editar movimentações de ajuste'
                          : 'Editar movimentação'
                      }
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <button
                      className="btn-action text-danger"
                      onClick={() => setDeleteId(m.id)}
                      disabled={m.tipo === 'ajuste'}
                      title={
                        m.tipo === 'ajuste'
                          ? 'Não é possível excluir movimentações de ajuste'
                          : 'Excluir movimentação'
                      }
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMovs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    Nenhuma movimentação encontrada com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-3">
        <Paginacao
          totalItems={filteredMovs.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
      {movParaDeletar && (
        <ModalComponent title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <p>Você tem certeza que deseja excluir esta movimentação?</p>
          <ul className="list-group mb-3">
            <li className="list-group-item">
              <strong>Produto:</strong>{' '}
              {produtoMap.get(movParaDeletar.produtoId)?.nome}
            </li>
            <li className="list-group-item">
              <strong>Tipo:</strong> {movParaDeletar.tipo.toUpperCase()}
            </li>
            <li className="list-group-item">
              <strong>Quantidade:</strong> {movParaDeletar.quantidade}
            </li>
            <li className="list-group-item">
              <strong>Data:</strong>{' '}
              {new Date(movParaDeletar.criadoEm).toLocaleString('pt-BR')}
            </li>
          </ul>
          <p className="text-danger">
            Esta ação não pode ser desfeita e irá reverter a alteração no
            estoque do produto.
          </p>
          <div className="text-end mt-4">
            <button
              className="btn btn-secondary me-2"
              onClick={() => setDeleteId(null)}
            >
              <i className="bi bi-x-circle d-none d-lg-inline-block me-1"></i>
              Cancelar
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                onDelete(deleteId!);
                setDeleteId(null);
              }}
            >
              <i className="bi bi-trash-fill d-none d-lg-inline-block me-1"></i>
              Confirmar Exclusão
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
            onSave={(patch) => {
              onEdit(editId!, patch);
              setEditId(null);
            }}
          />
        </ModalComponent>
      )}
    </div>
  );
}

function MovimentacaoEditForm({
  movimentacao,
  produto,
  onCancel,
  onSave,
}: {
  movimentacao: Movimentacao;
  produto?: Produto;
  onCancel: () => void;
  onSave: (patch: { quantidade: number; motivo?: string }) => void;
}) {
  const [quantidade, setQuantidade] = useState(movimentacao.quantidade);
  const [motivo, setMotivo] = useState(movimentacao.motivo ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantidade <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return;
    }
    onSave({ quantidade, motivo: motivo.trim() || undefined });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label">Produto</label>
        <input
          className="form-control"
          value={produto?.nome ?? 'N/A'}
          readOnly
          disabled
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Tipo de Movimentação</label>
        <input
          className="form-control"
          value={movimentacao.tipo.toUpperCase()}
          readOnly
          disabled
        />
      </div>
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="quantidade" className="form-label">
            Quantidade *
          </label>
          <input
            type="number"
            id="quantidade"
            className="form-control"
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            min="1"
            required
          />
        </div>
        <div className="col-md-6">
          <label htmlFor="motivo" className="form-label">
            Motivo (opcional)
          </label>
          <input
            type="text"
            id="motivo"
            className="form-control"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
      </div>
      <div className="text-end mt-4">
        <button
          type="button"
          className="btn btn-secondary me-2"
          onClick={onCancel}
        >
          <i className="bi bi-x-circle d-none d-lg-inline-block me-1"></i>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          <i className="bi bi-check2-circle d-none d-lg-inline-block me-1"></i>
          Salvar Alterações
        </button>
      </div>
    </form>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [allProdutos, setAllProdutos] = useState<Produto[]>([]);
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  // Estados de Entregas (Integração)
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [editingEntrega, setEditingEntrega] = useState<Entrega | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // View atualizada para incluir 'rotas'
  const [view, setView] = useState<'estoque' | 'movimentacoes' | 'rotas'>('estoque');
  
  const [showScroll, setShowScroll] = useState(false);

  const [q, setQ] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [mostrarAbaixoMin, setMostrarAbaixoMin] = useState(false);
  const [mostrarPrioritarios, setMostrarPrioritarios] = useState(false);
  const [page, setPage] = useState(1);

  // --- NOVOS ESTADOS PARA SELEÇÃO E MODAL DE REPROGRAMAÇÃO ---
  const [selectedEntregaIds, setSelectedEntregaIds] = useState<string[]>([]);
  const [showReprogramModal, setShowReprogramModal] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');

  const debouncedQ = useDebounce(q, 500);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);
        const firstPageRes = await fetch(
          `${API_URL}/produtos?_page=1&_limit=${ITEMS_PER_PAGE}`,
        );
        if (!firstPageRes.ok)
          throw new Error('Falha ao buscar dados iniciais.');
        const firstPageData = await firstPageRes.json();
        setProdutos(firstPageData);
        setLoading(false);

        // Busca completa (Produtos, Movimentações e Entregas)
        const [allProdsRes, movsRes, entregasRes] = await Promise.all([
          fetch(`${API_URL}/produtos?_limit=10000`),
          fetch(`${API_URL}/movimentacoes`),
          fetch(`${API_URL}/entregas`) // Nova rota de entregas
        ]);

        if (!allProdsRes.ok || !movsRes.ok || !entregasRes.ok)
          throw new Error('Falha ao buscar dados completos.');

        const allProdsData = await allProdsRes.json();
        const movsData = await movsRes.json();
        const entregasData = await entregasRes.json();

        setAllProdutos(allProdsData);
        setMovs(movsData);
        setEntregas(entregasData);
      } catch (err: any) {
        console.error('Falha ao buscar dados:', err);
        setError('Não foi possível conectar ao servidor. Verifique o backend.');
      } finally {
        setLoadingAll(false);
      }
    }

    fetchInitialData();

    const checkScrollTop = () => {
      if (window.pageYOffset > 400) {
        setShowScroll(true);
      } else {
        setShowScroll(false);
      }
    };
    window.addEventListener('scroll', checkScrollTop);
    return () => {
      window.removeEventListener('scroll', checkScrollTop);
    };
  }, []);

  // --- Ações de Produtos ---
  async function addProduto(
    p: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm' | 'sku'>,
  ) {
    try {
      const response = await fetch(`${API_URL}/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      if (!response.ok) throw new Error('Falha ao criar produto');
      const novoProduto = await response.json();
      setAllProdutos((prev) => [novoProduto, ...prev]);
    } catch (err) {
      console.error(err);
    }
  }

  async function updateProduto(
    id: UUID,
    patch: Partial<Omit<Produto, 'id' | 'sku' | 'criadoEm'>>,
  ) {
    try {
      const response = await fetch(`${API_URL}/produtos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error('Falha ao atualizar produto');
      const produtoAtualizado = await response.json();
      setAllProdutos((prev) =>
        prev.map((x) => (x.id === id ? produtoAtualizado : x)),
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteProduto(id: UUID) {
    try {
      await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
      setAllProdutos((prev) => prev.filter((p) => p.id !== id));
      setMovs((prev) => prev.filter((m) => m.produtoId !== id));
    } catch (err) {
      console.error(err);
    }
  }

  async function togglePrioritario(id: UUID, currentState: boolean) {
    setAllProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, prioritario: !currentState } : p)),
    );

    try {
      const response = await fetch(`${API_URL}/produtos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prioritario: !currentState }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar prioridade no servidor.');
      }
    } catch (err) {
      console.error(err);
      alert(
        'Não foi possível salvar a alteração de prioridade. Verifique sua conexão.',
      );
      setAllProdutos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, prioritario: currentState } : p,
        ),
      );
    }
  }

  // --- Ações de Movimentações ---
  async function addMov(m: Omit<Movimentacao, 'id' | 'criadoEm'>) {
    try {
      const response = await fetch(`${API_URL}/movimentacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m),
      });
      if (!response.ok) throw new Error('Falha ao criar movimentação');
      const { movimentacao, produto } = await response.json();
      setMovs((prev) => [movimentacao, ...prev]);
      setAllProdutos((prev) =>
        prev.map((p) => (p.id === produto.id ? produto : p)),
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function updateMov(
    id: UUID,
    patch: { quantidade: number; motivo?: string },
  ) {
    try {
      const response = await fetch(`${API_URL}/movimentacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error('Falha ao atualizar movimentação');

      const { movimentacaoAtualizada, produtoAtualizado } =
        await response.json();

      setMovs((prev) =>
        prev.map((m) => (m.id === id ? movimentacaoAtualizada : m)),
      );

      setAllProdutos((prev) =>
        prev.map((p) =>
          p.id === produtoAtualizado.id ? produtoAtualizado : p,
        ),
      );
    } catch (err) {
      console.error('Erro ao atualizar movimentação:', err);
    }
  }

  async function deleteMov(id: UUID) {
    try {
      const response = await fetch(`${API_URL}/movimentacoes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Falha ao excluir movimentação');
      const { produtoAtualizado } = await response.json();
      setMovs((prev) => prev.filter((m) => m.id !== id));
      setAllProdutos((prev) =>
        prev.map((p) =>
          p.id === produtoAtualizado.id ? produtoAtualizado : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  }

  // --- Ações de Entregas (Integração) ---
  async function addEntrega(data: any) {
    try {
        const res = await fetch(`${API_URL}/entregas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        // Recarrega a página para garantir que o saldo de estoque e histórico estejam sincronizados
        window.location.reload(); 
    } catch (err: any) {
        alert(err.message);
    }
  }

  async function deleteEntrega(id: string) {
      if(!confirm("Deseja realmente excluir esta entrega? O estoque NÃO será estornado automaticamente.")) return;
      try {
          await fetch(`${API_URL}/entregas/${id}`, { method: 'DELETE' });
          setEntregas(prev => prev.filter(e => e.id !== id));
          setSelectedEntregaIds(prev => prev.filter(sid => sid !== id));
      } catch (err) { console.error(err); }
  }

  async function updateEntregaStatus(id: string, status: string) {
      try {
          await fetch(`${API_URL}/entregas/${id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status })
          });
          setEntregas(prev => prev.map(e => e.id === id ? { ...e, status } : e));
      } catch (err) { console.error(err); }
  }

  // --- FUNCIONALIDADES DE SELEÇÃO E RELATÓRIOS PARA ENTREGAS ---

  const formatPhoneNumber = (value: string) => {
    if (!value) return "";
    const cleanedValue = value.replace(/\D/g, '');
    const match = cleanedValue.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
    return value;
  };
  
  const handleSelectEntrega = (id: string) => {
    setSelectedEntregaIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEntregas = (isChecked: boolean) => {
    setSelectedEntregaIds(isChecked ? entregas.map(e => e.id) : []);
  };

  const handleGenerateDeliveryReport = () => {
    if (selectedEntregaIds.length === 0) {
      alert('Selecione ao menos uma entrega para gerar o relatório.');
      return;
    }

    const selectedDeliveries = entregas
      .filter(d => selectedEntregaIds.includes(d.id))
      .sort((a, b) => new Date(a.dataHoraSolicitacao).getTime() - new Date(b.dataHoraSolicitacao).getTime());

    // Import dinâmico ou uso direto se já importado
    const { jsPDF } = window.jspdf || { jsPDF: (window as any).jspdf.jsPDF };
    const doc = new jsPDF('l', 'mm', 'a4');

    // Data para o cabeçalho do relatório
    const reportDateObj = selectedDeliveries.length > 0 ? new Date(selectedDeliveries[0].dataHoraSolicitacao) : new Date();
    const reportDate = reportDateObj.toLocaleDateString('pt-BR');

    doc.setFontSize(16);
    doc.text('Programação de Caminhões para Entrega de Materiais', 14, 15);
    doc.setFontSize(10);
    doc.text(`Relatório do Dia: ${reportDate}`, 14, 22);

    const tableHead = [['Nº', 'Entregue', 'Hora', 'Local da Obra', 'Material', 'Qtd', 'Un', 'Armazem', 'Responsável', 'Telefone']];
    const tableBody = selectedDeliveries.map((d, index) => [
      index + 1,
      '', // Coluna para Checkbox
      new Date(d.dataHoraSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      d.localObra,
      d.itemNome || '-',
      d.itemQuantidade,
      d.itemUnidadeMedida || '-',
      d.localArmazenagem,
      d.responsavelNome || '',
      formatPhoneNumber(d.responsavelTelefone || '')
    ]);

    (doc as any).autoTable({
      head: tableHead,
      body: tableBody,
      startY: 28,
      theme: 'striped',
      headStyles: { fillColor: [41, 45, 50] }, // Cor escura conforme modelo antigo
      didDrawCell: (data: any) => {
        // Desenha o quadrado na coluna "Entregue" (index 1)
        if (data.section === 'body' && data.column.index === 1) {
          doc.setLineWidth(0.3);
          const cell = data.cell;
          const squareSize = 4;
          const x = cell.x + (cell.width - squareSize) / 2;
          const y = cell.y + (cell.height - squareSize) / 2;
          doc.rect(x, y, squareSize, squareSize, 'S');
        }
      },
    });

    // Assinaturas
    const finalY = (doc as any).lastAutoTable.finalY;
    const centerX = doc.internal.pageSize.getWidth() / 2;
    
    // Verifica se precisa de nova página para assinaturas
    if (finalY + 40 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        doc.setLineWidth(0.3); // Reset line width just in case
    }

    // Usar o finalY da tabela ou um topo fixo se nova página foi criada (simplificado aqui para usar finalY + offset)
    const startSignaturesY = finalY + 20 > doc.internal.pageSize.getHeight() ? 30 : finalY + 20;

    const linhaYMotorista = startSignaturesY;
    doc.line(centerX - 50, linhaYMotorista, centerX + 50, linhaYMotorista);
    doc.text('Assinatura do Motorista', centerX, linhaYMotorista + 5, { align: 'center' });
    
    const linhaYSolicitante = linhaYMotorista + 25;
    doc.line(centerX - 50, linhaYSolicitante, centerX + 50, linhaYSolicitante);
    doc.text('Assinatura do Solicitante', centerX, linhaYSolicitante + 5, { align: 'center' });

    doc.save(`Programacao-Diaria-${reportDate.replace(/\//g, '-')}.pdf`);
  };

  const handleReprogramDeliveries = async () => {
    if (selectedEntregaIds.length === 0) return;
    if (!newDeliveryDate) {
      alert('Escolha uma nova data.');
      return;
    }

    // Chamada para a rota de atualização (que criamos no backend)
    try {
        await Promise.all(selectedEntregaIds.map(id => {
            const entrega = entregas.find(e => e.id === id);
            if (!entrega) return Promise.resolve();
            // Preserva a hora original, muda apenas a data
            const timePart = entrega.dataHoraSolicitacao.split('T')[1] || '08:00:00';
            const newDateTime = `${newDeliveryDate}T${timePart}`;
            
            return fetch(`${API_URL}/entregas/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ dataHoraSolicitacao: newDateTime })
            });
        }));
        alert('Entregas reprogramadas com sucesso!');
        setShowReprogramModal(false);
        setNewDeliveryDate('');
        window.location.reload();
    } catch (e) { 
        console.error(e);
        alert('Erro ao reprogramar entregas.');
    }
  };

  // --- Filtros ---
  const categorias = useMemo(
    () =>
      Array.from(
        new Set(allProdutos.map((p) => p.categoria || '').filter(Boolean)),
      ),
    [allProdutos],
  );
  const locaisArmazenamento = useMemo(
    () =>
      Array.from(
        new Set(
          allProdutos.map((p) => p.localArmazenamento || '').filter(Boolean),
        ),
      ),
    [allProdutos],
  );

  const filteredProdutos = useMemo(() => {
    if (loadingAll) {
      return produtos;
    }
    return allProdutos.filter((p) => {
      const query = debouncedQ.trim().toLowerCase();
      const matchesQuery =
        query === '' ||
        p.nome.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.categoria?.toLowerCase().includes(query);
      const matchesCategoria =
        !categoriaFilter || p.categoria === categoriaFilter;
      const matchesAbaixoMin =
        !mostrarAbaixoMin ||
        (p.estoqueMinimo != null && p.quantidade <= p.estoqueMinimo);
      const matchesPrioritario = !mostrarPrioritarios || p.prioritario;
      return (
        matchesQuery &&
        matchesCategoria &&
        matchesAbaixoMin &&
        matchesPrioritario
      );
    });
  }, [
    debouncedQ,
    categoriaFilter,
    mostrarAbaixoMin,
    mostrarPrioritarios,
    allProdutos,
    produtos,
    loadingAll,
  ]);

  useEffect(() => {
    setPage(1);
  }, [filteredProdutos.length]);

  const paginatedProdutos = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredProdutos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProdutos, page]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container-fluid bg-light min-vh-100 px-0">
      <header className="main-header d-flex flex-column flex-md-row align-items-center justify-content-between sticky-top bg-white shadow-sm px-4 py-3 mb-4">
        <div className="d-flex align-items-center">
            <img src={meuLogo} alt="Logo da Empresa" className="app-logo me-3" style={{height: '50px'}} />
            <h5 className="m-0 text-secondary d-none d-md-block">Sistema Integrado</h5>
        </div>
        
        <ul className="nav nav-pills my-3 my-md-0">
          <li className="nav-item">
            <button
              className={`nav-link ${view === 'estoque' ? 'active' : ''}`}
              onClick={() => setView('estoque')}
            >
              <i className="bi bi-box-seam me-1"></i> Estoque
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${view === 'movimentacoes' ? 'active' : ''}`}
              onClick={() => setView('movimentacoes')}
            >
              <i className="bi bi-clipboard-data me-1"></i> Movimentações
            </button>
          </li>
          {/* Botão Novo: Rotas */}
          <li className="nav-item">
            <button
              className={`nav-link ${view === 'rotas' ? 'active' : ''}`}
              onClick={() => setView('rotas')}
            >
              <i className="bi bi-truck me-1"></i> Rotas & Entregas
            </button>
          </li>
        </ul>
      </header>

      <div className="container pb-5">
      {view === 'estoque' && (
        <>
          <div className="filter-panel card-modern">
            <div className="row gy-3 align-items-end">
              <div className="col-12 col-lg-5">
                <label htmlFor="search-input" className="form-label fw-bold">
                  Pesquisar
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    id="search-input"
                    className="form-control"
                    placeholder={
                      loadingAll
                        ? 'Carregando produtos...'
                        : 'Nome, SKU ou categoria'
                    }
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    disabled={loadingAll}
                  />
                  {q && (
                    <button
                      className="btn btn-light btn-clear-search"
                      type="button"
                      onClick={() => setQ('')}
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="col-12 col-md-4 col-lg-3">
                <label htmlFor="category-filter" className="form-label fw-bold">
                  Categoria
                </label>
                <select
                  id="category-filter"
                  className="form-select"
                  value={categoriaFilter}
                  onChange={(e) => setCategoriaFilter(e.target.value)}
                >
                  <option value="">Todas as categorias</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-8 col-lg-4 d-flex align-items-center justify-content-start">
                <div className="d-flex gap-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="abaixoMin"
                      checked={mostrarAbaixoMin}
                      onChange={(e) => setMostrarAbaixoMin(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="abaixoMin">
                      Abaixo do mínimo
                    </label>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="prioritarios"
                      checked={mostrarPrioritarios}
                      onChange={(e) => setMostrarPrioritarios(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="prioritarios">
                      Prioritários
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <hr />
            <div className="d-flex justify-content-between align-items-center">
              <ValorTotalEstoque allProdutos={allProdutos} />
              <div className="d-flex gap-2">
                <Relatorios
                  produtos={allProdutos}
                  categoriaSelecionada={categoriaFilter}
                />
                <BotaoNovoProduto
                  onCreate={addProduto}
                  categorias={categorias}
                  locais={locaisArmazenamento}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <ProdutosTable
              produtos={paginatedProdutos}
              onEdit={updateProduto}
              onDelete={deleteProduto}
              onAddMov={addMov}
              onTogglePrioritario={togglePrioritario}
              categorias={categorias}
              locais={locaisArmazenamento}
            />
          )}

          <div className="mt-4 d-flex justify-content-center">
            {!loading && !loadingAll && (
              <Paginacao
                totalItems={filteredProdutos.length}
                itemsPerPage={ITEMS_PER_PAGE}
                currentPage={page}
                onPageChange={setPage}
              />
            )}
          </div>

          <hr className="my-4" />
          <h5 className="mb-3">Movimentações Recentes</h5>
          <MovsList movs={movs.slice(0, 10)} produtos={allProdutos} />
        </>
      )}

      {view === 'movimentacoes' && (
        <div className="card-modern">
            <ConsultaMovimentacoes
            movs={movs}
            produtos={allProdutos}
            onDelete={deleteMov}
            onEdit={updateMov}
            />
        </div>
      )}

      {/* NOVA VIEW: ROTAS */}
      {view === 'rotas' && (
        <div className="animate-fade-in">
            <div className="row g-4">
                {/* Coluna Esquerda: Formulário */}
                <div className="col-lg-4">
                    <DeliveryForm 
                        onSave={addEntrega}
                        produtosDisponiveis={allProdutos}
                        deliveryToEdit={editingEntrega}
                        onCancelEdit={() => setEditingEntrega(null)}
                    />
                </div>

                {/* Coluna Direita: Tabela e Ações em Massa */}
                <div className="col-lg-8">
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <h4 className="text-primary fw-bold mb-0">Cronograma</h4>
                        
                        {/* Botões de Ação em Massa */}
                        <div className="d-flex gap-2">
                            <Button 
                                variant="outline-secondary" 
                                size="sm"
                                disabled={selectedEntregaIds.length === 0}
                                onClick={handleGenerateDeliveryReport}
                            >
                                <ClipboardData className="me-1"/> Relatório PDF
                            </Button>
                            <Button 
                                variant="outline-primary" 
                                size="sm"
                                disabled={selectedEntregaIds.length === 0}
                                onClick={() => setShowReprogramModal(true)}
                            >
                                <CalendarWeek className="me-1"/> Reprogramar
                            </Button>
                        </div>
                    </div>

                    <DeliveryTable 
                        deliveries={entregas}
                        onDelete={deleteEntrega}
                        onEdit={setEditingEntrega}
                        onStatusChange={updateEntregaStatus}
                        // Props de seleção
                        selectedIds={selectedEntregaIds}
                        onSelectItem={handleSelectEntrega}
                        onSelectAll={handleSelectAllEntregas}
                    />
                </div>
            </div>
        </div>
      )}

      {showScroll && (
        <button
          className="btn btn-primary rounded-circle shadow-lg"
          onClick={scrollTop}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '45px',
            height: '45px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <i className="bi bi-arrow-up fs-4"></i>
        </button>
      )}
      </div>

      {/* Modal de Reprogramação */}
      <ModalComponent title="Reprogramar Entregas" onClose={() => setShowReprogramModal(false)}>
        {showReprogramModal && (
        <div className="p-2">
            <p>Você selecionou <strong>{selectedEntregaIds.length}</strong> entrega(s) para reprogramar.</p>
            <Form.Group>
                <Form.Label>Nova Data de Entrega</Form.Label>
                <Form.Control 
                    type="date" 
                    value={newDeliveryDate} 
                    onChange={(e) => setNewDeliveryDate(e.target.value)} 
                    className="mb-3"
                />
            </Form.Group>
            <div className="text-end">
                <Button variant="secondary" onClick={() => setShowReprogramModal(false)} className="me-2">Cancelar</Button>
                <Button variant="primary" onClick={handleReprogramDeliveries}>Confirmar</Button>
            </div>
        </div>
        )}
      </ModalComponent>

    </div>
  );
}