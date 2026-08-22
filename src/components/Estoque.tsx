// src/components/Estoque.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import type { StylesConfig } from 'react-select';
import type { Produto, Movimentacao, TipoMov, UUID } from '../types';
import { API_URL, isUnidadeInteira, sanitizeQuantidade } from '../constants';
import {
  ModalComponent,
  PasswordEntryModal,
  GerenciarHistoricoModal,
} from './Shared';
import { StockLevelBar } from './MetricCards';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage';
import { RelatorioModal, type RelatorioFiltros } from './RelatorioModal';
import { gerarPdfEstoque } from '../utils/Gerarpdfestoque';
import { classificarMaterial } from '../utils/classificarMaterial';

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
    '&:hover': {
      borderColor: state.isFocused ? 'var(--primary)' : 'var(--border)',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--text-3)',
    fontSize: '13.5px',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--text-1)',
    fontSize: '13.5px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--primary)'
      : state.isFocused
        ? 'var(--primary-light)'
        : '#fff',
    color: state.isSelected ? '#fff' : 'var(--text-1)',
    fontSize: '13.5px',
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer',
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    borderRadius: '8px',
    border: '1px solid var(--border)',
    boxShadow: '0 4px 12px rgba(0,0,0,.08)',
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  indicatorSeparator: () => ({ display: 'none' }),
};

const formatBRL = (valor: number) =>
  Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

// ── SVG ICONS ─────────────────────────────────────────────────────────────────

const IconEye = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="15"
    height="15"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEyeOff = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="15"
    height="15"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const IconDownload = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="15"
    height="15"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <polyline points="9 15 12 18 15 15" />
  </svg>
);
const IconPlus = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    width="15"
    height="15"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconX = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="14"
    height="14"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCheck = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    width="14"
    height="14"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconEdit = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="14"
    height="14"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconTrash = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="14"
    height="14"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IconMove = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="14"
    height="14"
  >
    <polyline points="5 9 2 12 5 15" />
    <polyline points="9 5 12 2 15 5" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <polyline points="19 9 22 12 19 15" />
    <polyline points="9 19 12 22 15 19" />
  </svg>
);
const IconFlag = ({
  filled,
  active,
}: {
  filled?: boolean;
  active?: boolean;
}) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled || active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
    style={{
      color: active ? 'var(--danger)' : 'var(--text-3)',
      opacity: active ? 1 : 0.3,
      transition: 'all .3s',
    }}
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
  </svg>
);
const IconGear = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="15"
    height="15"
  >
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconTag = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width="12"
    height="12"
    style={{ color: 'var(--success)' }}
  >
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" stroke="white" strokeWidth="2" />
  </svg>
);
const IconWarning = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="14"
    height="14"
    style={{ color: 'var(--warning)' }}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconAlertCircle = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="40"
    height="40"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const IconInfoLg = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="40"
    height="40"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const SortIcon = ({ order }: { order?: 'asc' | 'desc' | null }) => {
  if (order === 'asc')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10">
        <path d="M12 5v14M5 12l7-7 7 7" />
      </svg>
    );
  if (order === 'desc')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10">
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10" style={{ opacity: 0.4 }}>
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
    </svg>
  );
};

type ManageFieldKey = 'categorias' | 'locais' | 'fornecedores';

type SelectOption = { value: string; label: string };

/** Dados produzidos pelo ProdutoForm: tudo opcional exceto o nome (quantidade só na criação). */
type ProdutoFormData = Partial<Omit<Produto, 'id' | 'sku' | 'criadoEm' | 'atualizadoEm'>> & {
  nome: string;
};

const FieldLabel = ({
  label,
  field,
  onManage,
}: {
  label: string;
  field: ManageFieldKey;
  onManage: (field: ManageFieldKey) => void;
}) => (
  <div className="d-flex justify-content-between align-items-center mb-1">
    <label className="form-label mb-0">{label}</label>
    <button
      type="button"
      className="btn-manage-discreet"
      style={{ height: '24px', padding: '0 6px' }}
      onClick={() => onManage(field)}
      title="Gerenciar histórico"
    >
      <IconGear />
    </button>
  </div>
);

// ── VALOR TOTAL ESTOQUE ───────────────────────────────────────────────────────

export function ValorTotalEstoque({ allProdutos }: { allProdutos: Produto[] }) {
  const [apiValorTotal, setApiValorTotal] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const localValorTotal = useMemo(() => {
    if (allProdutos.length === 0) return null;
    return allProdutos.reduce((acc, p) => {
      if (p.valorUnitario && p.quantidade)
        return acc + p.valorUnitario * p.quantidade;
      return acc;
    }, 0);
  }, [allProdutos]);

  const valorTotal = localValorTotal ?? apiValorTotal;

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
        throw new Error();
      }
      const data = await response.json();
      setApiValorTotal(data.valorTotal);
      setIsVisible(true);
      setShowPasswordModal(false);
    } catch (err) {
      setError(err instanceof Error && err.message === 'Senha incorreta.' ? err.message : 'Não conseguimos exibir o valor total. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = () => {
    if (isVisible) {
      setIsVisible(false);
      setApiValorTotal(null);
    } else {
      setError('');
      setShowPasswordModal(true);
    }
  };

  return (
    <div className="d-flex align-items-center gap-2">
      {isVisible && valorTotal !== null && (
        <span className="total-value-badge">
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
        className="btn btn-ghost btn-sm"
        onClick={toggleVisibility}
        title={isVisible ? 'Ocultar valor total' : 'Mostrar valor total'}
      >
        {isVisible ? <IconEyeOff /> : <IconEye />}
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

// ── RELATÓRIOS ────────────────────────────────────────────────────────────────

export function Relatorios({ produtos, perfilUsuario }: { produtos: Produto[]; perfilUsuario?: string }) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalInfo, setModalInfo] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'info' | 'error';
  }>({ show: false, title: '', message: '', type: 'info' });

  const closeInfo = () => setModalInfo((prev) => ({ ...prev, show: false }));

  const categorias = useMemo(
    () =>
      Array.from(
        new Set(produtos.map((p) => p.categoria || '').filter(Boolean)),
      ),
    [produtos],
  );

  const handleGerar = (filtros: RelatorioFiltros) => {
    setLoading(true);
    try {
      const result = gerarPdfEstoque(produtos, filtros, perfilUsuario);
      if (!result.ok) {
        setModalInfo({
          show: true,
          title: 'Aviso',
          message:
            result.mensagem ??
            'Nenhum produto encontrado para os filtros selecionados.',
          type: 'info',
        });
      }
    } catch {
      setModalInfo({
        show: true,
        title: 'Erro',
        message: 'Não conseguimos gerar o relatório. Tente novamente em instantes.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="btn btn-ghost btn-sm d-flex align-items-center gap-2"
        onClick={() => setShowModal(true)}
        disabled={loading}
      >
        {loading ? (
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          />
        ) : (
          <IconDownload />
        )}
        Gerar Relatório
      </button>

      {showModal && (
        <RelatorioModal
          categorias={categorias}
          produtos={produtos}
          onGerar={handleGerar}
          onClose={() => setShowModal(false)}
        />
      )}

      {modalInfo.show && (
        <ModalComponent title={modalInfo.title} onClose={closeInfo}>
          <div className="p-3 text-center">
            <div
              className="mb-3"
              style={{
                color:
                  modalInfo.type === 'error'
                    ? 'var(--danger)'
                    : 'var(--warning)',
              }}
            >
              {modalInfo.type === 'error' ? (
                <IconAlertCircle />
              ) : (
                <IconInfoLg />
              )}
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>
              {modalInfo.message}
            </p>
            <div className="mt-4">
              <button className="btn btn-secondary px-4" onClick={closeInfo}>
                Entendi
              </button>
            </div>
          </div>
        </ModalComponent>
      )}
    </>
  );
}

// ── PRODUTO FORM ──────────────────────────────────────────────────────────────

export function ProdutoForm({
  onCancel,
  onSave,
  produto,
  categorias,
  locais,
  allProdutos = [],
}: {
  onCancel: () => void;
  onSave: (p: ProdutoFormData) => void;
  produto?: Produto;
  categorias: string[];
  locais: string[];
  allProdutos?: Produto[];
}) {
  const [nomeOption, setNomeOption] = useState<SelectOption | null>(
    produto?.nome ? { value: produto.nome, label: produto.nome } : null,
  );
  const [descricao, setDescricao] = useState(produto?.descricao ?? '');
  const [unidade, setUnidade] = useState(produto?.unidade ?? 'un');
  const [quantidade, setQuantidade] = useState<number>(
    produto?.quantidade ?? 0,
  );
  const [estoqueMinimo, setEstoqueMinimo] = useState<number | undefined>(
    produto?.estoqueMinimo ?? undefined,
  );
  const [valorUnitario, setValorUnitario] = useState<number | undefined>(
    produto?.valorUnitario ?? undefined,
  );
  const [categoriaOption, setCategoriaOption] = useState<SelectOption | null>(
    produto?.categoria
      ? { value: produto.categoria, label: produto.categoria }
      : null,
  );
  const [localOption, setLocalOption] = useState<SelectOption | null>(
    produto?.localArmazenamento
      ? { value: produto.localArmazenamento, label: produto.localArmazenamento }
      : null,
  );
  const [fornecedorOption, setFornecedorOption] = useState<SelectOption | null>(
    produto?.fornecedor
      ? { value: produto.fornecedor, label: produto.fornecedor }
      : null,
  );
  const [conversoes, setConversoes] = useState<{ unidade: string; fator: number }[]>(
    produto?.conversoes ?? [],
  );

  const [classificando, setClassificando] = useState(false);
  const classificandoRef = useRef(false);
  const jaClassificouRef = useRef(!!produto);
  const categoriaRef = useRef(categoriaOption);
  const unidadeRef = useRef(unidade);
  const descricaoRef = useRef(descricao);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { categoriaRef.current = categoriaOption; }, [categoriaOption]);
  useEffect(() => { unidadeRef.current = unidade; }, [unidade]);
  useEffect(() => { descricaoRef.current = descricao; }, [descricao]);

  const autoClassificar = useCallback(async (texto: string) => {
    if (!texto.trim() || texto.trim().length < 5 || produto || jaClassificouRef.current || classificandoRef.current) return;
    classificandoRef.current = true;
    setClassificando(true);
    try {
      const result = await classificarMaterial(texto);
      if (result) {
        if (result.categoria && !categoriaRef.current?.value) setCategoriaOption({ value: result.categoria, label: result.categoria });
        if (result.unidade && unidadeRef.current === 'un') setUnidade(result.unidade);
        if (result.descricao && !descricaoRef.current?.trim()) setDescricao(result.descricao);
        jaClassificouRef.current = true;
      }
    } finally {
      classificandoRef.current = false;
      setClassificando(false);
    }
  }, [produto]);

  const handleNomeInputChange = (inputValue: string, { action }: { action: string }) => {
    if (action !== 'input-change') return;
    setNomeOption({ value: inputValue, label: inputValue });
    jaClassificouRef.current = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (inputValue.trim().length >= 5 && !produto) {
      debounceRef.current = setTimeout(() => autoClassificar(inputValue), 1500);
    }
  };

  const [showManageModal, setShowManageModal] = useState(false);
  const [manageField, setManageField] = useState<
    'categorias' | 'locais' | 'fornecedores' | null
  >(null);

  const [hiddenOptions, setHiddenOptions] = useState(() =>
    safeLocalStorageGet('produtoHiddenOptions', {
      categorias: [] as string[],
      locais: [] as string[],
      fornecedores: [] as string[],
    }),
  );
  useEffect(() => {
    safeLocalStorageSet('produtoHiddenOptions', hiddenOptions);
  }, [hiddenOptions]);

  const visibleCategorias = categorias.filter(
    (c) => !hiddenOptions.categorias?.includes(c),
  );
  const visibleLocais = locais.filter(
    (l) => !hiddenOptions.locais?.includes(l),
  );

  const fornecedoresList = useMemo(() => {
    const set = new Set<string>();
    allProdutos.forEach((p) => {
      if (p.fornecedor) set.add(p.fornecedor);
    });
    return Array.from(set).filter(
      (f) => !hiddenOptions.fornecedores?.includes(f),
    );
  }, [allProdutos, hiddenOptions]);

  const nomesOptions = useMemo(() => {
    const set = new Set<string>();
    allProdutos.forEach((p) => {
      if (p.nome) set.add(p.nome);
    });
    return Array.from(set).map((n) => ({ value: n, label: n }));
  }, [allProdutos]);

  const categoriasOptions = visibleCategorias.map((c) => ({
    value: c,
    label: c,
  }));
  const locaisOptions = visibleLocais.map((l) => ({ value: l, label: l }));
  const fornecedoresOptions = fornecedoresList.map((f) => ({
    value: f,
    label: f,
  }));

  const handleRemoveOption = (item: string) => {
    if (manageField)
      setHiddenOptions((prev) => ({
        ...prev,
        [manageField]: [...(prev[manageField] || []), item],
      }));
  };
  const handleClearAllOptions = () => {
    if (manageField) {
      const current =
        manageField === 'categorias'
          ? visibleCategorias
          : manageField === 'locais'
            ? visibleLocais
            : fornecedoresList;
      setHiddenOptions((prev) => ({
        ...prev,
        [manageField]: [...(prev[manageField] || []), ...current],
      }));
    }
  };

  let valorTotalDisplay = '---';
  const qtdCalc = produto ? produto.quantidade : quantidade;
  const valNum =
    valorUnitario != null && !isNaN(parseFloat(String(valorUnitario)))
      ? parseFloat(String(valorUnitario))
      : null;
  if (typeof qtdCalc === 'number' && typeof valNum === 'number') {
    valorTotalDisplay = (qtdCalc * valNum).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const openManageModal = (field: 'categorias' | 'locais' | 'fornecedores') => {
    setManageField(field);
    setShowManageModal(true);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const nomeVal = nomeOption?.value?.trim() || '';
    if (!nomeVal) return;
    const validConversoes = conversoes.filter(c => c.unidade.trim() && c.fator > 0);
    const baseData = {
      nome: nomeVal,
      descricao: descricao.trim(),
      categoria: categoriaOption?.value || undefined,
      unidade,
      estoqueMinimo,
      localArmazenamento: localOption?.value || undefined,
      fornecedor: fornecedorOption?.value || undefined,
      valorUnitario,
      conversoes: validConversoes.length > 0 ? validConversoes : undefined,
    };
    onSave(!produto ? { ...baseData, quantidade } : baseData);
  }

  return (
    <>
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
            <CreatableSelect
              isClearable
              options={nomesOptions}
              value={nomeOption}
              onChange={(opt) => {
                setNomeOption(opt);
                if (opt && opt.value && !produto) {
                  jaClassificouRef.current = false;
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  debounceRef.current = setTimeout(() => autoClassificar(opt.value), 800);
                }
              }}
              onInputChange={handleNomeInputChange}
              placeholder="Ex: Parafuso sextavado 10mm aço galvanizado"
              isValidNewOption={() => false}
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
            {classificando && (
              <div className="d-flex align-items-center gap-1 mt-1">
                <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, borderWidth: 2, color: 'var(--primary)' }} />
                <small style={{ color: 'var(--text-3)', fontSize: 11 }}>Classificando automaticamente...</small>
              </div>
            )}
          </div>
          <div className="col-12">
            <label className="form-label">Descrição</label>
            <textarea
              className="form-control"
              placeholder="Detalhes do produto (opcional)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              style={{ height: '72px', resize: 'none' }}
            />
          </div>
          <div className="col-12 col-md-6">
            <FieldLabel label="Categoria" field="categorias" onManage={openManageModal} />
            <CreatableSelect
              isClearable
              options={categoriasOptions}
              value={categoriaOption}
              onChange={(opt) => setCategoriaOption(opt)}
              placeholder="Ex: Ferragens"
              formatCreateLabel={(i: string) => `Usar "${i}"`}
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
          </div>
          <div className="col-12 col-md-6">
            <FieldLabel label="Local de Armazenamento" field="locais" onManage={openManageModal} />
            <CreatableSelect
              isClearable
              options={locaisOptions}
              value={localOption}
              onChange={(opt) => setLocalOption(opt)}
              placeholder="Ex: Pátio 04"
              formatCreateLabel={(i: string) => `Usar "${i}"`}
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
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
              step={isUnidadeInteira(unidade) ? 1 : 0.01}
              className="form-control"
              value={quantidade}
              onChange={(e) => setQuantidade(sanitizeQuantidade(Number(e.target.value), unidade))}
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
          {/* ── Conversões de Unidade ── */}
          <div className="col-12">
            <div style={{ border: '1.5px dashed var(--border)', borderRadius: '10px', padding: '16px', background: 'var(--surface-2)' }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label mb-0" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Conversões de Unidade
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 400, marginLeft: '8px' }}>
                    (opcional)
                  </span>
                </label>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ fontSize: '12px', padding: '2px 10px', background: 'var(--primary-light)', color: 'var(--primary-dark)', border: '1px solid var(--primary)', borderRadius: '8px', fontWeight: 600 }}
                  onClick={() => setConversoes(prev => [...prev, { unidade: '', fator: 0 }])}
                >
                  + Adicionar
                </button>
              </div>
              {conversoes.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '8px 0' }}>
                  Nenhuma conversão cadastrada. Ex: 1 {unidade || 'un'} = X m²
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {conversoes.map((conv, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        1 {unidade || 'un'} =
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={conv.fator || ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setConversoes(prev => prev.map((c, i) => i === idx ? { ...c, fator: val } : c));
                        }}
                        style={{ width: '90px', height: '32px', border: '1.5px solid var(--border)', borderRadius: '6px', padding: '0 8px', fontSize: '13px', fontFamily: 'DM Mono, monospace', outline: 'none' }}
                      />
                      <input
                        type="text"
                        placeholder="m², kg, L..."
                        value={conv.unidade}
                        onChange={e => {
                          const val = e.target.value;
                          setConversoes(prev => prev.map((c, i) => i === idx ? { ...c, unidade: val } : c));
                        }}
                        style={{ width: '100px', height: '32px', border: '1.5px solid var(--border)', borderRadius: '6px', padding: '0 8px', fontSize: '13px', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => setConversoes(prev => prev.filter((_, i) => i !== idx))}
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#FFF5F5', color: '#E53E3E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}
                        title="Remover conversão"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-md-12">
            <FieldLabel label="Fornecedor" field="fornecedores" onManage={openManageModal} />
            <CreatableSelect
              isClearable
              options={fornecedoresOptions}
              value={fornecedorOption}
              onChange={(opt) => setFornecedorOption(opt)}
              placeholder="Nome do fornecedor (opcional)"
              formatCreateLabel={(i: string) => `Usar "${i}"`}
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
          </div>
        </div>
        <div className="text-end mt-4 d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            <IconX /> Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            <IconCheck /> Salvar
          </button>
        </div>
      </form>

      <GerenciarHistoricoModal
        show={showManageModal}
        onClose={() => setShowManageModal(false)}
        title={
          manageField === 'categorias'
            ? 'Categorias'
            : manageField === 'locais'
              ? 'Locais de Armazenamento'
              : 'Fornecedores'
        }
        items={
          manageField === 'categorias'
            ? visibleCategorias
            : manageField === 'locais'
              ? visibleLocais
              : fornecedoresList
        }
        onRemove={handleRemoveOption}
        onClearAll={handleClearAllOptions}
      />
    </>
  );
}

// ── BOTÃO NOVO PRODUTO ────────────────────────────────────────────────────────

export function BotaoNovoProduto({
  onCreate,
  categorias,
  locais,
  allProdutos = [],
}: {
  onCreate: (
    p: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm' | 'sku'>,
  ) => void;
  categorias: string[];
  locais: string[];
  allProdutos?: Produto[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="btn btn-primary d-flex align-items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <IconPlus /> Novo Produto
      </button>
      {open && (
        <ModalComponent title="Novo Produto" onClose={() => setOpen(false)}>
          <ProdutoForm
            onCancel={() => setOpen(false)}
            onSave={(p) => {
              onCreate(p as Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm' | 'sku'>);
              setOpen(false);
            }}
            categorias={categorias}
            locais={locais}
            allProdutos={allProdutos}
          />
        </ModalComponent>
      )}
    </>
  );
}

// ── PRODUTO CARD (mobile) ─────────────────────────────────────────────────────

export function ProdutoCard({
  produto,
  onMovimentar,
  onEditar,
  onExcluir,
  onTogglePrioritario,
  bloqueado = false,
}: {
  produto: Produto;
  onMovimentar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onTogglePrioritario: () => void;
  bloqueado?: boolean;
}) {
  const isBelowMin =
    produto.estoqueMinimo != null &&
    produto.quantidade <= produto.estoqueMinimo;
  return (
    <div className={`product-card h-100${isBelowMin ? ' border-warning' : ''}`}>
      <div className="card-body d-flex flex-column p-3 position-relative">
        <div className="card-indicators">
          {isBelowMin && (
            <span title="Estoque abaixo do mínimo!">
              <IconWarning />
            </span>
          )}
          {produto.prioritario && (
            <button
              className="btn-icon"
              onClick={onTogglePrioritario}
              title="Desmarcar Prioridade"
            >
              <IconFlag filled active />
            </button>
          )}
          {produto.valorUnitario != null && produto.valorUnitario > 0 && (
            <span title="Valor unitário registrado">
              <IconTag />
            </span>
          )}
        </div>
        <h6 className="card-title card-title-clamp mb-2 fw-bold">
          {produto.nome}
        </h6>
        {produto.categoria && (
          <div className="mb-2">
            <span className="category-badge" title={produto.categoria}>
              {produto.categoria}
            </span>
          </div>
        )}
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
            <strong>SKU</strong>
            <span className="sku">{produto.sku}</span>
          </div>
        </div>
        <div className="mb-2">
          <StockLevelBar produto={produto} />
        </div>
        <div className="mt-auto d-flex gap-1">
          <button
            className="btn btn-sm btn-movimentar flex-fill"
            onClick={onMovimentar}
            disabled={bloqueado}
            title={bloqueado ? 'Sem permissão — apenas itens EPI' : undefined}
            style={bloqueado ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
          >
            <IconMove /> Mover
          </button>
          <button
            className="btn btn-sm btn-editar  flex-fill"
            onClick={onEditar}
            disabled={bloqueado}
            title={bloqueado ? 'Sem permissão — apenas itens EPI' : undefined}
            style={bloqueado ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
          >
            <IconEdit /> Editar
          </button>
          <button
            className="btn btn-sm btn-excluir"
            onClick={onExcluir}
            disabled={bloqueado}
            title={bloqueado ? 'Sem permissão — apenas itens EPI' : undefined}
            style={bloqueado ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
          >
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MOVIMENTAÇÃO FORM ─────────────────────────────────────────────────────────

export function MovimentacaoForm({
  produto,
  onCancel,
  onSave,
}: {
  produto: Produto;
  onCancel: () => void;
  onSave: (
    m: Omit<Movimentacao, 'id' | 'criadoEm'>,
    custoEntrada?: number,
  ) => void;
}) {
  const [tipo, setTipo] = useState<TipoMov>('saida');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [motivo, setMotivo] = useState<string>('');
  const [custoEntrada, setCustoEntrada] = useState<number | undefined>(
    undefined,
  );

  const tipoOptions = [
    { value: 'saida', label: 'Saída' },
    { value: 'entrada', label: 'Entrada' },
    { value: 'ajuste', label: 'Ajuste de Estoque' },
  ];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (quantidade <= 0) return;
    onSave(
      {
        produtoId: produto.id,
        tipo,
        quantidade,
        motivo: motivo.trim() || undefined,
      },
      custoEntrada,
    );
  }

  return (
    <form onSubmit={submit}>
      <div
        className="mb-3"
        style={{ fontSize: '13.5px', color: 'var(--text-2)' }}
      >
        Estoque atual:{' '}
        <strong style={{ color: 'var(--text-1)' }}>
          {produto.quantidade} {produto.unidade}
        </strong>
        {produto.valorUnitario != null && (
          <span
            className="ms-2"
            style={{ color: 'var(--text-3)', fontSize: '12px' }}
          >
            (Valor Unit.: R${' '}
            {Number(produto.valorUnitario).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
            )
          </span>
        )}
      </div>
      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label">Tipo</label>
          <Select
            options={tipoOptions}
            value={tipoOptions.find((o) => o.value === tipo) || null}
            onChange={(opt) => {
              const novoTipo = opt?.value as TipoMov;
              setTipo(novoTipo);
              if (novoTipo !== 'entrada') setCustoEntrada(undefined);
            }}
            styles={selectStyles}
            menuPortalTarget={document.body}
            isSearchable={false}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">
            {tipo === 'ajuste' || tipo === 'saldo_inicial'
              ? 'Nova Quantidade'
              : 'Quantidade'}
          </label>
          <input
            type="number"
            min={1}
            step={isUnidadeInteira(produto.unidade) ? 1 : 0.01}
            className="form-control"
            value={quantidade}
            onChange={(e) => setQuantidade(sanitizeQuantidade(Number(e.target.value), produto.unidade))}
            required
          />
        </div>
        {tipo === 'entrada' && (
          <div className="col-md-4">
            <label className="form-label">Custo Unit. (Novo)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-control"
              placeholder="R$"
              value={custoEntrada ?? ''}
              onChange={(e) =>
                setCustoEntrada(
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
            />
            <small style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Atualiza média ponderada
            </small>
          </div>
        )}
        <div className="col-md-12">
          <label className="form-label">Motivo (opcional)</label>
          <input
            className="form-control"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: Uso na obra, Requisição"
          />
        </div>
      </div>
      <div className="text-end mt-4 d-flex justify-content-end gap-2">
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

// ── PRODUTOS TABLE ────────────────────────────────────────────────────────────

export function ProdutosTable({
  produtos,
  onEdit,
  onDelete,
  onAddMov,
  onTogglePrioritario,
  categorias,
  locais,
  sortOrder,
  onToggleSort,
  allProdutos = [],
  canEdit,
}: {
  produtos: Produto[];
  onEdit: (id: UUID, patch: Partial<Produto>) => void;
  onDelete: (id: UUID) => void;
  onAddMov: (m: Omit<Movimentacao, 'id' | 'criadoEm'>, custo?: number) => void;
  onTogglePrioritario: (id: UUID, currentState: boolean) => void;
  categorias: string[];
  locais: string[];
  sortOrder?: 'asc' | 'desc' | null;
  onToggleSort?: () => void;
  allProdutos?: Produto[];
  canEdit?: (produto: Produto) => boolean;
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
      <div className="d-none d-lg-block">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '4%' }} />
                <th style={{ width: '11%' }}>SKU</th>
                <th
                  className="sortable"
                  style={{
                    width: '26%',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={onToggleSort}
                  title="Ordenar por nome"
                >
                  Nome{' '}
                  <span
                    style={{
                      display: 'inline-flex',
                      verticalAlign: 'middle',
                      marginLeft: 4,
                    }}
                  >
                    <SortIcon order={sortOrder} />
                  </span>
                </th>
                <th style={{ width: '11%' }}>Categoria</th>
                <th style={{ width: '9%' }}>Qtd.</th>
                <th style={{ width: '8%' }}>Est. Mín.</th>
                <th style={{ width: '10%' }}>Nível</th>
                <th style={{ width: '10%' }}>Local</th>
                <th style={{ width: '11%', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => {
                const belowMin =
                  p.estoqueMinimo != null && p.quantidade <= p.estoqueMinimo;
                return (
                  <tr key={p.id} className={belowMin ? 'row-warning' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-icon"
                        onClick={() =>
                          onTogglePrioritario(p.id, !!p.prioritario)
                        }
                        title={
                          p.prioritario
                            ? 'Desmarcar prioritário'
                            : 'Marcar prioritário'
                        }
                      >
                        <IconFlag filled active={!!p.prioritario} />
                      </button>
                    </td>
                    <td>
                      <span className="sku">{p.sku}</span>
                    </td>
                    <td>
                      <span className="product-name">{p.nome}</span>
                      {belowMin && (
                        <span className="ms-2" title="Abaixo do mínimo">
                          <IconWarning />
                        </span>
                      )}
                      {p.valorUnitario != null && p.valorUnitario > 0 && (
                        <>
                          <span className="ms-2" title="Valor registrado">
                            <IconTag />
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '11.5px',
                              color: 'var(--text-3)',
                              fontWeight: 400,
                              marginTop: '3px',
                            }}
                          >
                            {formatBRL(p.valorUnitario)} un{' · '}
                            <span style={{ color: 'var(--text-2)' }}>
                              {formatBRL(p.valorUnitario * p.quantidade)}
                            </span>{' '}
                            total
                          </span>
                        </>
                      )}
                    </td>
                    <td>
                      {p.categoria ? (
                        <span className="category-badge" title={p.categoria}>
                          {p.categoria}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-3)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <span
                          className="stock-dot"
                          style={{
                            background:
                              p.quantidade === 0
                                ? 'var(--danger)'
                                : belowMin
                                  ? 'var(--warning)'
                                  : 'var(--success)',
                          }}
                        />
                        <strong>{p.quantidade}</strong>
                        <small style={{ color: 'var(--text-3)' }}>
                          {p.unidade}
                        </small>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>
                      {p.estoqueMinimo ?? '—'}
                    </td>
                    <td>
                      <StockLevelBar produto={p} />
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: '13px' }}>
                      {p.localArmazenamento ?? '—'}
                    </td>
                    <td>
                      {(() => {
                        const permitido = !canEdit || canEdit(p);
                        const bloqueioTitle = 'Sem permissão — apenas itens EPI';
                        return (
                          <div className="action-group d-flex justify-content-end gap-1">
                            <button
                              type="button"
                              className="act-btn"
                              onClick={() => permitido && setMovProdId(p.id)}
                              title={permitido ? 'Movimentar' : bloqueioTitle}
                              disabled={!permitido}
                              style={!permitido ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
                            >
                              <IconMove />
                            </button>
                            <button
                              type="button"
                              className="act-btn"
                              onClick={() => permitido && setEditingId(p.id)}
                              title={permitido ? 'Editar' : bloqueioTitle}
                              disabled={!permitido}
                              style={!permitido ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
                            >
                              <IconEdit />
                            </button>
                            <button
                              type="button"
                              className="act-btn del"
                              onClick={() => permitido && setDeleteId(p.id)}
                              title={permitido ? 'Excluir' : bloqueioTitle}
                              disabled={!permitido}
                              style={!permitido ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
              {produtos.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: 'center',
                      padding: '48px 16px',
                      color: 'var(--text-3)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: 'var(--text-2)',
                        marginBottom: 4,
                      }}
                    >
                      Nenhum produto encontrado
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      Tente ajustar seus filtros ou busca.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="d-lg-none">
        <div className="row g-3">
          {produtos.map((p) => {
            const permitido = !canEdit || canEdit(p);
            return (
            <div key={p.id} className="col-12 col-md-6">
              <ProdutoCard
                produto={p}
                onMovimentar={() => permitido && setMovProdId(p.id)}
                onEditar={() => permitido && setEditingId(p.id)}
                onExcluir={() => permitido && setDeleteId(p.id)}
                onTogglePrioritario={() =>
                  onTogglePrioritario(p.id, !!p.prioritario)
                }
                bloqueado={!permitido}
              />
            </div>
          ); })}
          {produtos.length === 0 && (
            <div
              className="col-12 text-center py-5"
              style={{ color: 'var(--text-3)' }}
            >
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  marginBottom: 4,
                }}
              >
                Nenhum produto encontrado
              </div>
              <div style={{ fontSize: '13px' }}>
                Tente ajustar seus filtros ou busca.
              </div>
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
            allProdutos={allProdutos}
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
            onSave={(m, custo) => {
              onAddMov(m, custo);
              setMovProdId(null);
            }}
          />
        </ModalComponent>
      )}
      {produtoParaDeletar && (
        <ModalComponent
          title="Confirmar Exclusão"
          onClose={() => setDeleteId(null)}
        >
          <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>
            Você tem certeza que deseja excluir o produto{' '}
            <strong style={{ color: 'var(--text-1)' }}>
              {produtoParaDeletar.nome}
            </strong>
            ?
          </p>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: 6 }}>
            Esta ação não pode ser desfeita e removerá todas as movimentações
            associadas.
          </p>
          <div className="text-end mt-4 d-flex justify-content-end gap-2">
            <button
              className="btn btn-secondary"
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
              <IconTrash /> Excluir
            </button>
          </div>
        </ModalComponent>
      )}
    </>
  );
}
