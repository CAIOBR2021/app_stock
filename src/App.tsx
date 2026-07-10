import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import meuLogo from './assets/logo.svg';
import { DeliveryForm } from './components/DeliveryForm';
import { DeliveryTable } from './components/DeliveryTable';
import { EntradaSaidaForm } from './components/EntradaSaidaForm';
import { NotaFiscalReader } from './components/NotaFiscalReader';
import { PrevisaoConsumo } from './components/PrevisaoConsumo';
import { ChatWidget } from './components/ChatWidget';
import { VisitanteChat } from './components/VisitanteChat';
import { Solicitacoes, useSolicitacoesPendentes } from './components/Solicitacoes';
import './styles.css';

import type { Produto, Movimentacao, Entrega, EntregaPayload, LoteMovimentacaoDados } from './types';
import { PING_URL, ITEMS_PER_PAGE } from './constants';
import { apiFetch, errorMessage } from './utils/api';
import { isDelivered, normalizeEntrega, formatPhoneNumber } from './utils';
import { useDebounce, useAppViewportHeight } from './hooks';
import { ModalComponent, Paginacao, IdentificacaoModal } from './components/Shared';
import { safeLocalStorageGet, safeLocalStorageSet } from './utils/storage';
import {
  ValorTotalEstoque,
  Relatorios,
  BotaoNovoProduto,
  ProdutosTable,
} from './components/Estoque';
import { MetricCards } from './components/MetricCards';
import { ConsultaMovimentacoes, MovsList } from './components/Movimentacoes';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type UUID = string;

// ── SVG ICONS ─────────────────────────────────────────────────────────────────

const IconBox = () => (
  /* caixa 3D isométrica */
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const IconClipboard = () => (
  /* duas setas horizontais opostas (swap) */
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polyline points="16 3 20 7 16 11" />
    <line x1="4" y1="7" x2="20" y2="7" />
    <polyline points="8 13 4 17 8 21" />
    <line x1="20" y1="17" x2="4" y2="17" />
  </svg>
);
const IconTruck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
const IconArrowLeftRight = () => (
  /* setas opostas verticais: entrada ↓ e saída ↑ */
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="3 16 7 20 11 16" />
    <line x1="7" y1="20" x2="7" y2="4" />
    <polyline points="21 8 17 4 13 8" />
    <line x1="17" y1="4" x2="17" y2="20" />
  </svg>
);
const IconScan = () => (
  /* documento com dobra no canto */
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const IconTrendingUp = () => (
  /* gráfico de linha crescente */
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconInbox = () => (
  /* caixa de entrada de solicitações */
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);
const IconBell = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4" />
  </svg>
);
const IconReprog = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconPDF = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const IconWarningLg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="40" height="40" style={{ color: 'var(--warning)' }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconCheckLg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="40" height="40" style={{ color: 'var(--success)' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconArrowUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);
const IconError = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28" style={{ color: 'var(--danger)' }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const IconMore = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);
const IconSliders = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);
const IconChevronDown = ({ up }: { up?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"
    style={{ transform: up ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ── APP ───────────────────────────────────────────────────────────────────────

export default function App() {
  useAppViewportHeight();

  const [editingEntrega, setEditingEntrega] = useState<Entrega | null>(null);

  const [entregaToDeleteId, setEntregaToDeleteId] = useState<string | null>(null);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState('');
  const [showStockLimitModal, setShowStockLimitModal] = useState(false);
  const [pendingDeliveryData, setPendingDeliveryData] = useState<EntregaPayload | null>(null);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  // Ligado durante mutações demoradas (lote, edição de entrega) para exibir o spinner
  const [mutating, setMutating] = useState(false);

  const [view, setView] = useState<'estoque' | 'movimentacoes' | 'rotas' | 'entradas_saidas' | 'nota_fiscal' | 'previsao' | 'solicitacoes'>('estoque');
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  // No mobile os filtros ficam recolhidos por padrão; no desktop são sempre visíveis
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const [q, setQ] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [localFilter, setLocalFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [mostrarAbaixoMin, setMostrarAbaixoMin] = useState(false);
  const [mostrarPrioritarios, setMostrarPrioritarios] = useState(false);
  const [page, setPage] = useState(1);

  // ── IDENTIFICAÇÃO DO OPERADOR ──────────────────────────────────────────────
  const [nomeUsuario, setNomeUsuario] = useState<string>(
    () => safeLocalStorageGet<string>('nomeOperador', '')
  );
  const [perfilUsuario, setPerfilUsuario] = useState<string>(
    () => safeLocalStorageGet<string>('perfilOperador', '')
  );
  const [showIdentModal, setShowIdentModal] = useState<boolean>(
    () => !safeLocalStorageGet<string>('nomeOperador', '') || !safeLocalStorageGet<string>('perfilOperador', '')
  );
  const [showEditarNome, setShowEditarNome] = useState(false);
  const salvarNomeOperador = useCallback((nome: string, perfil: string) => {
    setNomeUsuario(nome);
    setPerfilUsuario(perfil);
    safeLocalStorageSet('nomeOperador', nome);
    safeLocalStorageSet('perfilOperador', perfil);
    setShowIdentModal(false);
    setShowEditarNome(false);
    // A página de solicitações é exclusiva do almoxarifado
    if (perfil !== 'almoxarifado') setView((v) => (v === 'solicitacoes' ? 'estoque' : v));
  }, []);

  const canEditarProduto = useCallback((produto: { categoria?: string | null }) => {
    if (perfilUsuario === 'seguranca') return produto.categoria === 'EPI';
    return true; // almoxarifado ou sem perfil → acesso total
  }, [perfilUsuario]);

  const [selectedEntregaIds, setSelectedEntregaIds] = useState<string[]>([]);
  const [showReprogramModal, setShowReprogramModal] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');

  const [rotaDateFilter, setRotaDateFilter] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  });

  const debouncedQ = useDebounce(q, 500);

  // ── KEEP-ALIVE ────────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const keepAliveInterval = setInterval(() => {
      fetch(PING_URL, { signal: controller.signal }).catch(() => {});
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(keepAliveInterval);
      controller.abort();
    };
  }, []);

  // ── DATA FETCH (TanStack Query) ──────────────────────────────────────────
  // O cache das chaves ['produtos'], ['movimentacoes'] e ['entregas'] é a
  // fonte de verdade; mutações invalidam a chave (ou escrevem no cache) e a
  // lib cuida de refetch, dedupe e revalidação ao refocar a janela.

  const queryClient = useQueryClient();

  // Visitante tem acesso somente via chat: nenhuma listagem é carregada.
  const isVisitante = perfilUsuario === 'visitante';

  // Primeira página: carrega rápido e serve de placeholder enquanto a lista
  // completa (10k itens) chega. Só é usada no boot, por isso nunca "envelhece".
  const primeiraPaginaQuery = useQuery({
    queryKey: ['produtos-primeira-pagina'],
    queryFn: () => apiFetch<Produto[]>(`/produtos?_page=1&_limit=${ITEMS_PER_PAGE}`),
    staleTime: Infinity,
    enabled: !isVisitante,
  });

  const produtosQuery = useQuery({
    queryKey: ['produtos'],
    queryFn: () => apiFetch<Produto[]>('/produtos?_limit=10000'),
    placeholderData: primeiraPaginaQuery.data,
    enabled: !isVisitante,
  });
  // useMemo mantém a referência estável enquanto data é undefined (memos abaixo dependem delas)
  const allProdutos = useMemo(() => produtosQuery.data ?? [], [produtosQuery.data]);

  const movsQuery = useQuery({
    queryKey: ['movimentacoes'],
    queryFn: () => apiFetch<Movimentacao[]>('/movimentacoes'),
    enabled: !isVisitante,
  });
  const movs = useMemo(() => movsQuery.data ?? [], [movsQuery.data]);

  const entregasQuery = useQuery({
    queryKey: ['entregas'],
    queryFn: async () => (await apiFetch<Entrega[]>('/entregas')).map(normalizeEntrega),
    enabled: !isVisitante,
  });
  const entregas = useMemo(() => entregasQuery.data ?? [], [entregasQuery.data]);

  // Badge do menu: quantidade de solicitações de material pendentes (só almoxarifado)
  const solicitacoesPendentesQuery = useSolicitacoesPendentes(perfilUsuario === 'almoxarifado');
  const solicitacoesPendentesCount = solicitacoesPendentesQuery.data?.length ?? 0;

  // Estados derivados, com a mesma semântica dos antigos useStates:
  // loading    → nada de produtos na tela ainda (nem o placeholder), ou mutação em curso
  // loadingAll → a lista completa de produtos/movimentações ainda não chegou
  const loading = produtosQuery.data === undefined || mutating;
  const loadingAll =
    produtosQuery.data === undefined || produtosQuery.isPlaceholderData || movsQuery.isPending;
  const error =
    primeiraPaginaQuery.isError || produtosQuery.isError || movsQuery.isError
      ? 'Tivemos um problema ao carregar seus dados. Tente atualizar a página.'
      : null;

  const invalidateEntregas = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['entregas'] }),
    [queryClient],
  );
  const invalidateProdutos = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['produtos'] }),
    [queryClient],
  );
  const invalidateMovs = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['movimentacoes'] }),
    [queryClient],
  );

  useEffect(() => {
    const onScroll = () => setShowScroll(window.pageYOffset > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── CRUD PRODUTOS (TanStack Query) ───────────────────────────────────────
  // O backend devolve a entidade atualizada, então escrevemos direto no cache
  // (setQueryData) em vez de refazer a busca da lista inteira.

  const addProdutoMutation = useMutation({
    mutationFn: (p: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm' | 'sku'>) =>
      apiFetch<Produto>('/produtos', {
        method: 'POST',
        body: { ...p, operadorNome: nomeUsuario || undefined },
      }),
    onSuccess: (novoProduto) => {
      queryClient.setQueryData<Produto[]>(['produtos'], (prev = []) => [novoProduto, ...prev]);
      if (novoProduto.quantidade > 0) invalidateMovs();
    },
    onError: () =>
      toast.error('Não conseguimos cadastrar o produto. Tente novamente em instantes.'),
  });
  const addProduto = (p: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm' | 'sku'>) =>
    addProdutoMutation.mutate(p);

  const updateProdutoMutation = useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<Omit<Produto, 'id' | 'sku' | 'criadoEm'>> }) =>
      apiFetch<Produto>(`/produtos/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<Produto[]>(['produtos'], (prev = []) =>
        prev.map((x) => (x.id === id ? updated : x)),
      );
    },
    onError: () =>
      toast.error('Não conseguimos salvar as alterações do produto. Tente novamente em instantes.'),
  });
  const updateProduto = (id: UUID, patch: Partial<Omit<Produto, 'id' | 'sku' | 'criadoEm'>>) =>
    updateProdutoMutation.mutate({ id, patch });

  const deleteProdutoMutation = useMutation({
    mutationFn: (id: UUID) => apiFetch(`/produtos/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Produto[]>(['produtos'], (prev = []) =>
        prev.filter((p) => p.id !== id),
      );
      queryClient.setQueryData<Movimentacao[]>(['movimentacoes'], (prev = []) =>
        prev.filter((m) => m.produtoId !== id),
      );
    },
    onError: () =>
      toast.error('Não conseguimos remover o produto. Tente novamente em instantes.'),
  });
  const deleteProduto = (id: UUID) => deleteProdutoMutation.mutate(id);

  // Atualização otimista: marca/desmarca na hora e reverte se o servidor recusar
  const togglePrioritarioMutation = useMutation({
    mutationFn: ({ id, prioritario }: { id: UUID; prioritario: boolean }) =>
      apiFetch(`/produtos/${id}`, { method: 'PATCH', body: { prioritario } }),
    onMutate: async ({ id, prioritario }) => {
      await queryClient.cancelQueries({ queryKey: ['produtos'] });
      const anterior = queryClient.getQueryData<Produto[]>(['produtos']);
      queryClient.setQueryData<Produto[]>(['produtos'], (prev = []) =>
        prev.map((p) => (p.id === id ? { ...p, prioritario } : p)),
      );
      return { anterior };
    },
    onError: (_err, _vars, contexto) => {
      toast.error('Não conseguimos salvar a alteração. Tente novamente em instantes.');
      if (contexto?.anterior) queryClient.setQueryData(['produtos'], contexto.anterior);
    },
  });
  const togglePrioritario = (id: UUID) => {
    const produto = (queryClient.getQueryData<Produto[]>(['produtos']) ?? []).find((p) => p.id === id);
    if (!produto) return;
    togglePrioritarioMutation.mutate({ id, prioritario: !produto.prioritario });
  };

  // ── CRUD MOVIMENTAÇÕES (TanStack Query) ──────────────────────────────────

  const addMovMutation = useMutation({
    mutationFn: ({ m, custoEntrada }: { m: Omit<Movimentacao, 'id' | 'criadoEm'>; custoEntrada?: number }) =>
      apiFetch<{ movimentacao: Movimentacao; produto: Produto }>('/movimentacoes', {
        method: 'POST',
        body: {
          ...m,
          custoEntrada,
          dataCompetencia: m.dataCompetencia,
          operadorNome: nomeUsuario || undefined,
        },
      }),
    onSuccess: ({ movimentacao, produto }) => {
      queryClient.setQueryData<Movimentacao[]>(['movimentacoes'], (prev = []) => [movimentacao, ...prev]);
      queryClient.setQueryData<Produto[]>(['produtos'], (prev = []) =>
        prev.map((p) => (p.id === produto.id ? produto : p)),
      );
    },
    onError: (err) =>
      toast.error(errorMessage(err, 'Não conseguimos registrar a movimentação. Tente novamente em instantes.')),
  });
  const addMov = (m: Omit<Movimentacao, 'id' | 'criadoEm'>, custoEntrada?: number) =>
    addMovMutation.mutate({ m, custoEntrada });

  const handleEntradaSaidaSubmit = async (dados: LoteMovimentacaoDados) => {
    try {
      setMutating(true);

      const partes = [];
      if (dados.ordemCompra) partes.push(`OC: ${dados.ordemCompra}`);
      if (dados.nomeObra) partes.push(`Obra: ${dados.nomeObra}`);
      const motivoFinal =
        partes.length > 0
          ? partes.join(' | ')
          : `Movimentação em lote (${dados.tipo})`;

      const payload = {
        itens: dados.itens.map((item) => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          valorUnitario: dados.tipo === 'entrada' ? item.valorUnitario : undefined,
        })),
        tipo: dados.tipo,
        motivo: motivoFinal,
        nomeObra: dados.nomeObra || undefined,
        ordemCompra: dados.ordemCompra || undefined,
        dataCompetencia: dados.dataCompetencia,
        operadorNome: nomeUsuario || undefined,
      };
      await apiFetch('/movimentacoes/lote', { method: 'POST', body: payload });

      await Promise.all([invalidateMovs(), invalidateProdutos()]);
      toast.success('Movimentações registradas com sucesso!');
      setView('estoque');
      scrollTop();
    } catch (err) {
      toast.error(errorMessage(err, 'Não conseguimos registrar as movimentações. Tente novamente em instantes.'));
    } finally {
      setMutating(false);
    }
  };

  const updateMovMutation = useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: { quantidade: number; motivo?: string } }) =>
      apiFetch<{ movimentacaoAtualizada: Movimentacao; produtoAtualizado: Produto }>(
        `/movimentacoes/${id}`,
        { method: 'PATCH', body: patch },
      ),
    onSuccess: async ({ movimentacaoAtualizada, produtoAtualizado }, { id }) => {
      queryClient.setQueryData<Movimentacao[]>(['movimentacoes'], (prev = []) =>
        prev.map((m) => (m.id === id ? movimentacaoAtualizada : m)),
      );
      queryClient.setQueryData<Produto[]>(['produtos'], (prev = []) =>
        prev.map((p) => (p.id === produtoAtualizado.id ? produtoAtualizado : p)),
      );
      await invalidateEntregas();
    },
    onError: (err) =>
      toast.error(errorMessage(err, 'Não conseguimos salvar a alteração da movimentação. Tente novamente em instantes.')),
  });
  const updateMov = (id: UUID, patch: { quantidade: number; motivo?: string }) =>
    updateMovMutation.mutate({ id, patch });

  const deleteMovMutation = useMutation({
    mutationFn: (id: UUID) =>
      apiFetch<{ produtoAtualizado: Produto; solicitacaoReaberta?: boolean }>(
        `/movimentacoes/${id}`,
        { method: 'DELETE' },
      ),
    onSuccess: async ({ produtoAtualizado, solicitacaoReaberta }, id) => {
      queryClient.setQueryData<Movimentacao[]>(['movimentacoes'], (prev = []) =>
        prev.filter((m) => m.id !== id),
      );
      queryClient.setQueryData<Produto[]>(['produtos'], (prev = []) =>
        prev.map((p) => (p.id === produtoAtualizado.id ? produtoAtualizado : p)),
      );
      await invalidateEntregas();
      if (solicitacaoReaberta) {
        await queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
        toast.info('A solicitação vinculada a esta saída voltou para "Solicitações em Andamento".');
      }
    },
    onError: (err) =>
      toast.error(errorMessage(err, 'Não conseguimos remover a movimentação. Tente novamente em instantes.')),
  });
  const deleteMov = (id: UUID) => deleteMovMutation.mutate(id);

  // ── CRUD ENTREGAS (TanStack Query) ───────────────────────────────────────
  // Entregas mexem no estoque no backend, então além de ['entregas']
  // invalidamos também ['produtos'] e ['movimentacoes'].

  const invalidateTudo = useCallback(
    () => Promise.all([invalidateEntregas(), invalidateProdutos(), invalidateMovs()]),
    [invalidateEntregas, invalidateProdutos, invalidateMovs],
  );

  const updateEntregaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EntregaPayload }) =>
      apiFetch(`/entregas/${id}`, {
        method: 'PUT',
        body: { ...data, operadorNome: nomeUsuario || undefined },
      }),
    onMutate: () => setMutating(true),
    onSuccess: async () => {
      await invalidateTudo();
      setEditingEntrega(null);
      toast.success('Entrega atualizada com sucesso!');
    },
    onError: (err) =>
      toast.error(errorMessage(err, 'Não conseguimos atualizar a entrega. Tente novamente em instantes.')),
    onSettled: () => setMutating(false),
  });

  const addEntregaMutation = useMutation({
    mutationFn: (data: EntregaPayload) =>
      apiFetch('/entregas', {
        method: 'POST',
        body: { ...data, operadorNome: nomeUsuario || undefined },
      }),
    onSuccess: async () => {
      await invalidateTudo();
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (err) =>
      toast.error(errorMessage(err, 'Não conseguimos criar o agendamento. Tente novamente em instantes.')),
  });

  const processDeliverySave = (data: EntregaPayload) => {
    if (editingEntrega) updateEntregaMutation.mutate({ id: editingEntrega.id, data });
    else addEntregaMutation.mutate(data);
  };

  const handleSaveDelivery = (data: EntregaPayload) => {
    let produto = allProdutos.find((p) => p.id === data.produtoId);
    if (!produto && data.itemNome)
      produto = allProdutos.find(
        (p) => p.nome.toLowerCase() === data.itemNome.toLowerCase(),
      );
    if (produto) {
      let estoque = produto.quantidade;
      if (
        editingEntrega &&
        (editingEntrega.produtoId === produto.id ||
          editingEntrega.itemNome === produto.nome)
      )
        estoque += Number(editingEntrega.itemQuantidade);
      if (Number(String(data.itemQuantidade).replace(',', '.')) > estoque) {
        setPendingDeliveryData(data);
        setShowStockLimitModal(true);
        return;
      }
    }
    processDeliverySave(data);
  };

  const handleConfirmStockOverride = () => {
    if (pendingDeliveryData) {
      processDeliverySave(pendingDeliveryData);
      setPendingDeliveryData(null);
    }
    setShowStockLimitModal(false);
  };

  const deleteEntregaMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/entregas/${id}`, {
        method: 'DELETE',
        body: { operadorNome: nomeUsuario || undefined },
      }),
    onSuccess: async () => {
      await invalidateTudo();
      setEntregaToDeleteId(null);
      toast.success('Entrega excluída com sucesso.');
    },
    onError: (err) =>
      toast.error(errorMessage(err, 'Não conseguimos remover a entrega. Tente novamente em instantes.')),
  });
  const confirmDeleteEntrega = (id: string) => deleteEntregaMutation.mutate(id);

  const updateEntregaStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/entregas/${id}/status`, {
        method: 'PATCH',
        body: { status, operadorNome: nomeUsuario || undefined },
      }),
    onSuccess: (_data, { id, status }) => {
      // Atualiza o cache localmente (o backend não devolve a entrega atualizada)
      queryClient.setQueryData<Entrega[]>(['entregas'], (prev = []) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e)),
      );
      toast.success(`Status atualizado para ${status}.`);
    },
    onError: () =>
      toast.error('Não conseguimos atualizar o status. Tente novamente em instantes.'),
  });
  const updateEntregaStatus = (id: string, status: string) =>
    updateEntregaStatusMutation.mutate({ id, status });

  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedEntregaIds.length === 0) return;
    setBulkTargetStatus(newStatus);
    setShowBulkConfirmModal(true);
  };

  const confirmBulkStatusChange = async () => {
    try {
      setMutating(true);
      await apiFetch('/entregas/status/lote', {
        method: 'PATCH',
        body: { ids: selectedEntregaIds, status: bulkTargetStatus, operadorNome: nomeUsuario || undefined },
      });
      await invalidateEntregas();
      setSelectedEntregaIds([]);
      setShowBulkConfirmModal(false);
      toast.success(`Entregas marcadas como ${bulkTargetStatus}.`);
    } catch {
      toast.error('Não conseguimos atualizar as entregas. Tente novamente em instantes.');
    } finally {
      setMutating(false);
    }
  };

  const handleSelectEntrega = useCallback(
    (id: string) =>
      setSelectedEntregaIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
      ),
    [],
  );

  const selectedEntregaIdSet = useMemo(() => new Set(selectedEntregaIds), [selectedEntregaIds]);

  // ── PDF ENTREGAS ─────────────────────────────────────────────────────────
  const handleGenerateDeliveryReport = () => {
    if (selectedEntregaIds.length === 0) {
      toast.error('Selecione ao menos uma entrega.');
      return;
    }
    const selected = entregas
      .filter((d) => selectedEntregaIds.includes(d.id) && !isDelivered(d.status))
      .sort(
        (a, b) =>
          new Date(a.dataHoraSolicitacao).getTime() -
          new Date(b.dataHoraSolicitacao).getTime(),
      );
    if (selected.length === 0) {
      toast.error('Nenhum item pendente selecionado.');
      return;
    }
    const first = selected[0];
    const responsavel = first.responsavelNome || 'Não informado';
    const telefone = first.responsavelTelefone
      ? formatPhoneNumber(first.responsavelTelefone)
      : 'Não informado';
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ML = 14, MR = 14, CW = pageW - ML - MR;
    const NAVY  = [26, 34, 56]   as [number, number, number];
    const AMBER = [245, 166, 35] as [number, number, number];
    const WHITE = [255, 255, 255] as [number, number, number];
    const LIGHT = [244, 246, 249] as [number, number, number];
    const BORDER = [218, 224, 232] as [number, number, number];
    const TEXT1  = [44, 62, 80]  as [number, number, number];
    const TEXT3  = [127, 140, 141] as [number, number, number];
    const now = new Date(first.dataHoraSolicitacao);
    const dataRelatorio = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const dataEmissao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const horaEmissao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // ── Cabeçalho ──────────────────────────────────────────────────────────
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 26, 'F');
    doc.setFillColor(...AMBER);
    doc.roundedRect(ML, 4, 18, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text('P', ML + 9, 16.5, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('Portal de Suprimentos', ML + 22, 12);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 195, 225);
    doc.text(`Emitido em: ${dataEmissao} às ${horaEmissao}`, pageW - MR, 11, { align: 'right' });
    doc.text(`Data da programação: ${dataRelatorio}`, pageW - MR, 18, { align: 'right' });

    // ── Título ──────────────────────────────────────────────────────────────
    let y = 34;
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('Programação de Caminhões — Entrega de Materiais', ML, y);
    y += 3;
    doc.setFillColor(...AMBER);
    doc.rect(ML, y, 50, 1.2, 'F');
    y += 6;

    // ── Painel informativo ─────────────────────────────────────────────────
    const panelH = 18;
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(ML, y, CW, panelH, 3, 3, 'FD');

    const clamp = (text: string, maxW: number) => {
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      if (doc.getTextWidth(text) <= maxW) return text;
      while (text.length > 3 && doc.getTextWidth(text + '...') > maxW)
        text = text.slice(0, -1);
      return text + '...';
    };

    const panelSections = [
      { label: 'RESPONSÁVEL', value: responsavel, xStart: 0, xEnd: 0.35 },
      { label: 'TELEFONE', value: telefone, xStart: 0.35, xEnd: 0.62 },
      { label: 'TOTAL DE ENTREGAS', value: `${selected.length} item(ns) programado(s)`, xStart: 0.62, xEnd: 1 },
    ];

    panelSections.forEach(({ label, value, xStart, xEnd }, idx) => {
      const x = ML + CW * xStart + 6;
      const maxW = CW * (xEnd - xStart) - 14;
      if (idx > 0) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.line(ML + CW * xStart, y + 3, ML + CW * xStart, y + panelH - 3);
      }
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT3);
      doc.text(label, x, y + 7);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(clamp(value, maxW), x, y + 14);
    });
    y += panelH + 6;

    // ── Tabela com checkboxes ──────────────────────────────────────────────
    const colNum = 10;
    const colCheck = 10;
    const colHora = 18;
    const colLocal = 50;
    const colQtd = 16;
    const colUn = 20;
    const colArm = 32;
    const colMaterial = CW - (colNum + colCheck + colHora + colLocal + colQtd + colUn + colArm);

    const tableBody = selected.map((d, i) => [
      String(i + 1), '',
      new Date(d.dataHoraSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      d.localObra, d.itemNome || '—', String(d.itemQuantidade),
      d.itemUnidadeMedida || '—', d.localArmazenagem || '—',
    ]);

    (doc as any).autoTable({
      startY: y,
      margin: { left: ML, right: MR },
      tableWidth: CW,
      head: [['#', 'Conf.', 'Hora', 'Local da Obra', 'Material', 'Qtd.', 'Unid.', 'Armazém']],
      body: tableBody,
      headStyles: {
        fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5,
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 }, halign: 'center', minCellHeight: 10,
      },
      bodyStyles: {
        fontSize: 8.5, textColor: TEXT1,
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 }, valign: 'middle',
        minCellHeight: 12,
      },
      columnStyles: {
        0: { cellWidth: colNum, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: colCheck, halign: 'center' },
        2: { cellWidth: colHora, halign: 'center' },
        3: { cellWidth: colLocal, halign: 'left', overflow: 'linebreak', fontSize: 8 },
        4: { cellWidth: colMaterial, halign: 'left', overflow: 'linebreak', fontStyle: 'bold' },
        5: { cellWidth: colQtd, halign: 'center' },
        6: { cellWidth: colUn, halign: 'center' },
        7: { cellWidth: colArm, halign: 'center', overflow: 'linebreak', fontSize: 8 },
      },
      alternateRowStyles: { fillColor: LIGHT },
      styles: { lineColor: BORDER, lineWidth: 0.2, valign: 'middle', overflow: 'linebreak' },
      didDrawCell: (data: any) => {
        if (data.section !== 'body' || data.column.index !== 1) return;
        const cellX = data.cell.x;
        const cellY = data.cell.y;
        const cellW = data.cell.width;
        const cellH = data.cell.height;
        const boxSize = 4;
        const bx = cellX + (cellW - boxSize) / 2;
        const by = cellY + (cellH - boxSize) / 2;
        doc.setDrawColor(...NAVY);
        doc.setLineWidth(0.4);
        doc.setFillColor(...WHITE);
        doc.roundedRect(bx, by, boxSize, boxSize, 0.6, 0.6, 'FD');
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? WHITE : LIGHT;
        if (data.column.index === 1) data.cell.text = [''];
      },
    });

    // ── Campos de assinatura ───────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable?.finalY ?? pageH - 60;
    const sigY = Math.min(finalY + 22, pageH - 40);
    const sigLineW = CW * 0.36;
    const sigGap = CW - sigLineW * 2;

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.line(ML, sigY, ML + sigLineW, sigY);
    doc.line(ML + sigLineW + sigGap, sigY, ML + sigLineW + sigGap + sigLineW, sigY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('Motorista', ML + sigLineW / 2, sigY + 5, { align: 'center' });
    doc.text('Solicitante', ML + sigLineW + sigGap + sigLineW / 2, sigY + 5, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT3);
    doc.text('Nome / Assinatura', ML + sigLineW / 2, sigY + 9, { align: 'center' });
    doc.text('Nome / Assinatura', ML + sigLineW + sigGap + sigLineW / 2, sigY + 9, { align: 'center' });

    // ── Rodapé em todas as páginas ─────────────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(...NAVY);
      doc.rect(0, pageH - 12, pageW, 12, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 195, 225);
      doc.text('Portal de Suprimentos — Documento Confidencial — Uso Interno', ML, pageH - 4.5);
      doc.setTextColor(...AMBER);
      doc.setFont('helvetica', 'bold');
      doc.text(`Página ${i} de ${totalPages}`, pageW - MR, pageH - 4.5, { align: 'right' });
    }
    doc.save(`Programacao-Diaria-${dataRelatorio.replace(/\s+/g, '-')}.pdf`);
  };

  const handleReprogramDeliveries = async () => {
    if (!newDeliveryDate) { toast.error('Escolha uma nova data.'); return; }
    const entregaMap = new Map(entregas.map(e => [e.id, e]));
    const valid = selectedEntregaIds.filter((id) => {
      const e = entregaMap.get(id);
      return e && !isDelivered(e.status);
    });
    if (valid.length === 0) {
      toast.error('Apenas itens pendentes podem ser reprogramados.');
      setShowReprogramModal(false);
      return;
    }
    try {
      const CHUNK_SIZE = 10;
      for (let start = 0; start < valid.length; start += CHUNK_SIZE) {
        const chunk = valid.slice(start, start + CHUNK_SIZE);
        await Promise.all(
          chunk.map((id) => {
            const e = entregaMap.get(id);
            if (!e) return Promise.resolve();
            const time = e.dataHoraSolicitacao.split('T')[1] || '08:00:00';
            return apiFetch(`/entregas/${id}`, {
              method: 'PUT',
              body: { dataHoraSolicitacao: `${newDeliveryDate}T${time}` },
            });
          }),
        );
      }
      toast.success(`${valid.length} entrega(s) reprogramada(s)!`);
      setShowReprogramModal(false);
      setNewDeliveryDate('');
      await invalidateEntregas();
    } catch {
      toast.error('Não conseguimos reprogramar as entregas. Tente novamente em instantes.');
    }
  };

  // ── DERIVED STATE ────────────────────────────────────────────────────────

  const produtosAbaixoMinimo = useMemo(
    () =>
      allProdutos.filter(
        (p) => p.estoqueMinimo != null && p.quantidade <= p.estoqueMinimo,
      ),
    [allProdutos],
  );
  const alertCountLabel =
    produtosAbaixoMinimo.length > 99 ? '99+' : String(produtosAbaixoMinimo.length);

  const activeFilterCount =
    (categoriaFilter ? 1 : 0) +
    (localFilter ? 1 : 0) +
    (mostrarAbaixoMin ? 1 : 0) +
    (mostrarPrioritarios ? 1 : 0);

  const categorias = useMemo(
    () =>
      Array.from(new Set(allProdutos.map((p) => p.categoria || '').filter(Boolean))),
    [allProdutos],
  );

  const locaisArmazenamento = useMemo(
    () =>
      Array.from(
        new Set(allProdutos.map((p) => p.localArmazenamento || '').filter(Boolean)),
      ),
    [allProdutos],
  );

  const filteredDeliveries = useMemo(() => {
    let data = entregas;
    if (rotaDateFilter)
      data = data.filter(
        (d) =>
          new Date(d.dataHoraSolicitacao).toLocaleDateString('en-CA') === rotaDateFilter,
      );
    return data.sort(
      (a, b) =>
        new Date(a.dataHoraSolicitacao).getTime() -
        new Date(b.dataHoraSolicitacao).getTime(),
    );
  }, [entregas, rotaDateFilter]);

  // ── CORRIGIDO: handleSelectAllEntregas após filteredDeliveries ────────────
  const handleSelectAllEntregas = useCallback(
    (checked: boolean) =>
      setSelectedEntregaIds(checked ? filteredDeliveries.map((e) => e.id) : []),
    [filteredDeliveries],
  );

  // Enquanto a lista completa carrega, allProdutos contém a primeira página (placeholderData)
  const fonteDados = allProdutos;

  const filteredProdutos = useMemo(() => {
    let result = fonteDados.filter((p) => {
      const tokens = debouncedQ.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const searchableText = [
        p.nome, p.sku, p.categoria ?? '', p.descricao ?? '',
        p.localArmazenamento ?? '', p.fornecedor ?? '',
      ].join(' ').toLowerCase();

      return (
        (tokens.length === 0 || tokens.every((token) => searchableText.includes(token))) &&
        (!categoriaFilter || p.categoria === categoriaFilter) &&
        (!localFilter || (p.localArmazenamento ?? '').toLowerCase().includes(localFilter.toLowerCase())) &&
        (!mostrarAbaixoMin || (p.estoqueMinimo != null && p.quantidade <= p.estoqueMinimo)) &&
        (!mostrarPrioritarios || p.prioritario)
      );
    });

    if (sortOrder)
      result = [...result].sort((a, b) =>
        sortOrder === 'asc' ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome),
      );
    return result;
  }, [fonteDados, debouncedQ, categoriaFilter, localFilter, mostrarAbaixoMin, mostrarPrioritarios, sortOrder]);

  const paginatedProdutos = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredProdutos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProdutos, page]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const handleToggleSort = () =>
    setSortOrder((cur) => (cur === null ? 'asc' : cur === 'asc' ? 'desc' : null));

  // ── VISITANTE: acesso exclusivamente via chat (somente leitura + solicitação) ──

  if (isVisitante) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--app-dvh, 100dvh)', background: 'var(--surface-2)' }}>
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px', background: '#1e1b2e', flexShrink: 0,
        }}>
          <img src={meuLogo} alt="Logo" style={{ height: '34px' }} />
          <button
            type="button"
            onClick={() => setShowEditarNome(true)}
            title="Alterar identificação"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <span style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                {nomeUsuario || 'Identificar-me'}
              </span>
              <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,.5)' }}>Visitante</span>
            </span>
            <span style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: '#F5A623', color: '#fff', border: '2px solid #C47D0E',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px', flexShrink: 0,
            }}>
              {(nomeUsuario.trim().charAt(0) || '?').toUpperCase()}
            </span>
          </button>
        </header>

        <div style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          width: '100%', maxWidth: '860px', margin: '0 auto', padding: '16px',
        }}>
          <VisitanteChat />
        </div>

        {showIdentModal && (
          <IdentificacaoModal
            initialValue={nomeUsuario}
            initialPerfil={perfilUsuario}
            onConfirm={salvarNomeOperador}
          />
        )}
        {showEditarNome && (
          <IdentificacaoModal
            initialValue={nomeUsuario}
            initialPerfil={perfilUsuario}
            onConfirm={salvarNomeOperador}
            onClose={() => setShowEditarNome(false)}
          />
        )}
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      </div>
    );
  }

  // ── ERROR STATE ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--surface-2)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '32px', maxWidth: '420px', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
          <div className="mb-3"><IconError /></div>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>Erro de Conexão</h4>
          <p style={{ color: 'var(--text-2)', fontSize: '13.5px', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  // ── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="app-layout">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo-area">
          <img src={meuLogo} alt="Logo" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          {(
            [
              { id: 'estoque', label: 'Controle de Estoque', Icon: IconBox },
              { id: 'movimentacoes', label: 'Movimentações', Icon: IconClipboard },
              { id: 'rotas', label: 'Rotas & Entregas', Icon: IconTruck },
              { id: 'entradas_saidas', label: 'Entrada / Saída', Icon: IconArrowLeftRight },
              ...(perfilUsuario === 'almoxarifado'
                ? [{ id: 'solicitacoes', label: 'Solicitações em Andamento', Icon: IconInbox }]
                : []),
              { id: 'nota_fiscal', label: 'Leitura de Documento', Icon: IconScan },
              { id: 'previsao', label: 'Previsão de Consumo', Icon: IconTrendingUp },
            ] as { id: typeof view; label: string; Icon: () => JSX.Element }[]
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item-clean ${view === id ? 'active' : ''}`}
              onClick={() => { setView(id); scrollTop(); }}
            >
              <Icon /> {label}
              {id === 'solicitacoes' && solicitacoesPendentesCount > 0 && (
                <span style={{ fontSize: '10px', fontWeight: 700, background: 'var(--danger)', color: '#fff', minWidth: '18px', height: '18px', lineHeight: '18px', padding: '0 5px', borderRadius: 999, marginLeft: 'auto', textAlign: 'center' }}>
                  {solicitacoesPendentesCount > 99 ? '99+' : solicitacoesPendentesCount}
                </span>
              )}
              {(id === 'nota_fiscal' || id === 'previsao') && (
                <span style={{ fontSize: '9px', fontWeight: 700, background: '#1e1b2e', color: '#f59e0b', border: '1px solid #f59e0b', padding: '3px 8px', borderRadius: 999, marginLeft: 'auto', letterSpacing: '.5px', textIndent: '.5px', textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap' }}>
                  Novo
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ── PERFIL RODAPÉ ── */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="user-card"
            onClick={() => setShowEditarNome(true)}
            title={nomeUsuario ? `${nomeUsuario} — alterar identificação` : 'Identificar-me'}
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
          >
            {/* Avatar com indicador de presença */}
            <span style={{ position: 'relative', flexShrink: 0 }}>
              <span style={{
                width: '46px', height: '46px', borderRadius: '50%',
                background: '#F5A623',
                color: '#fff',
                border: '2px solid #C47D0E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '15px', letterSpacing: '0.5px',
              }}>
                {nomeUsuario.trim()
                  ? nomeUsuario.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
                  : '?'}
              </span>
              {/* Overlay de edição no hover */}
              <span className="user-avatar-edit-overlay">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </span>
              {/* Indicador de presença */}
              <span style={{
                position: 'absolute', bottom: '1px', right: '1px',
                width: '9px', height: '9px', borderRadius: '50%',
                background: '#22C55E', border: '2px solid #1e1b2e',
              }} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', minWidth: 0, flex: 1 }}>
              <span style={{
                fontSize: '16px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
                letterSpacing: '0.1px',
              }}>
                {nomeUsuario || 'Identificar-me'}
              </span>
              {/* Cargo com ícone */}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', lineHeight: 1 }}>
                {perfilUsuario === 'almoxarifado' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#F5A623', flexShrink: 0 }}>
                    <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                )}
                {perfilUsuario === 'seguranca' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
                  </svg>
                )}
                <span style={{
                  fontSize: '13px', fontWeight: 500,
                  color: perfilUsuario === 'almoxarifado' ? 'var(--primary)' : 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.2px',
                }}>
                  {perfilUsuario === 'almoxarifado' ? 'Almoxarifado' : perfilUsuario === 'seguranca' ? 'Seg. Trabalho' : 'Sem perfil'}
                </span>
              </span>
            </div>
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER ── */}
      <div className="mobile-header d-lg-none d-flex justify-content-between align-items-center px-3">
        <img src={meuLogo} alt="Logo" style={{ height: '36px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            onClick={() => setShowLowStockModal(true)}
            style={{ cursor: 'pointer', position: 'relative', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ color: produtosAbaixoMinimo.length > 0 ? 'var(--danger)' : 'var(--text-3)' }}>
              <IconBell active={produtosAbaixoMinimo.length > 0} />
            </span>
            {produtosAbaixoMinimo.length > 0 && (
              <span className="notif-count" style={{ top: '-2px', right: '-2px' }}>
                {alertCountLabel}
              </span>
            )}
          </div>
          <div
            onClick={() => setShowEditarNome(true)}
            title="Alterar identificação"
            style={{
              cursor: 'pointer', width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '14px', flexShrink: 0,
            }}
          >
            {(nomeUsuario.trim().charAt(0) || '?').toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <main className="main-content">
        <header className="page-header d-none d-lg-flex">
          <div>
            <h1 className="page-title m-0">
              {view === 'estoque' && 'Visão Geral do Estoque'}
              {view === 'movimentacoes' && 'Histórico de Movimentações'}
              {view === 'rotas' && 'Cronograma de Entregas'}
              {view === 'entradas_saidas' && 'Lançamento de Entradas e Saídas'}
              {view === 'nota_fiscal' && 'Leitura de Documento'}
              {view === 'previsao' && 'Previsão de Consumo e Reposição'}
              {view === 'solicitacoes' && 'Solicitações em Andamento'}
            </h1>
            <div className="page-date-subtitle">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="icon-btn" onClick={() => setShowLowStockModal(true)} title="Alertas de Estoque" style={{ cursor: 'pointer' }}>
              <span style={{ color: produtosAbaixoMinimo.length > 0 ? 'var(--danger)' : 'var(--text-3)' }}>
                <IconBell active={produtosAbaixoMinimo.length > 0} />
              </span>
              {produtosAbaixoMinimo.length > 0 && (
                <span className="notif-count">{alertCountLabel}</span>
              )}
            </div>

          </div>
        </header>

        {/* ── ESTOQUE ── */}
        {view === 'estoque' && (
          <div className="content-area animate-fade-in">
            {!loadingAll && <MetricCards allProdutos={allProdutos} />}

            <div className="card-modern">
              <div className="row gy-3 align-items-end">
                <div className="col-12 col-lg-5">
                  <label className="form-label">Pesquisar Produto</label>
                  <div className="input-wrap">
                    <IconSearch />
                    <input
                      className="form-control"
                      placeholder={loadingAll ? 'Carregando...' : 'Nome, SKU, categoria... (várias palavras)'}
                      value={q}
                      onChange={(e) => { setQ(e.target.value); setPage(1); }}
                      disabled={loadingAll}
                    />
                  </div>
                </div>
                <div className="col-12 d-lg-none">
                  <button
                    type="button"
                    className="btn btn-ghost w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => setShowFiltersMobile((v) => !v)}
                  >
                    <IconSliders /> Filtros
                    {activeFilterCount > 0 && (
                      <span style={{
                        background: 'var(--primary)', color: '#fff', fontSize: '11px', fontWeight: 700,
                        borderRadius: 999, minWidth: '18px', height: '18px', lineHeight: '18px',
                        padding: '0 5px', textAlign: 'center',
                      }}>
                        {activeFilterCount}
                      </span>
                    )}
                    <IconChevronDown up={showFiltersMobile} />
                  </button>
                </div>
                <div className={`col-12 col-md-4 col-lg-3 ${showFiltersMobile ? '' : 'd-none d-lg-block'}`}>
                  <label className="form-label">Categoria</label>
                  <select className="form-select" value={categoriaFilter} onChange={(e) => { setCategoriaFilter(e.target.value); setPage(1); }}>
                    <option value="">Todas as categorias</option>
                    {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className={`col-12 col-md-4 col-lg-2 ${showFiltersMobile ? '' : 'd-none d-lg-block'}`}>
                  <label className="form-label">Localização</label>
                  <select className="form-select" value={localFilter} onChange={(e) => { setLocalFilter(e.target.value); setPage(1); }}>
                    <option value="">Todos os locais</option>
                    {locaisArmazenamento.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className={`col-12 col-md-4 col-lg-2 ${showFiltersMobile ? '' : 'd-none d-lg-block'}`}>
                  <label className="form-label">Status</label>
                  <div className="d-flex flex-lg-column gap-2 gap-lg-1">
                    <button className={`toggle-chip flex-fill flex-lg-grow-0 justify-content-center justify-content-lg-start${mostrarAbaixoMin ? ' active-warning' : ''}`} onClick={() => { setMostrarAbaixoMin(!mostrarAbaixoMin); setPage(1); }}>
                      <span className="dot" /> Abaixo do mín.
                    </button>
                    <button className={`toggle-chip flex-fill flex-lg-grow-0 justify-content-center justify-content-lg-start${mostrarPrioritarios ? ' active-danger' : ''}`} onClick={() => { setMostrarPrioritarios(!mostrarPrioritarios); setPage(1); }}>
                      <span className="dot" /> Prioritários
                    </button>
                  </div>
                </div>
              </div>

              <hr style={{ margin: '20px 0', borderColor: 'var(--border)', opacity: 1 }} />

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <ValorTotalEstoque allProdutos={allProdutos} />
                </div>
                <div className="d-flex gap-2">
                  <Relatorios produtos={allProdutos} />
                  <BotaoNovoProduto onCreate={addProduto} categorias={categorias} locais={locaisArmazenamento} allProdutos={allProdutos} />
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div className="spinner-border" style={{ color: 'var(--primary)' }} role="status" />
                <p style={{ marginTop: '12px', color: 'var(--text-3)', fontSize: '13.5px' }}>Carregando estoque...</p>
              </div>
            ) : (
              <ProdutosTable
                produtos={paginatedProdutos}
                onEdit={updateProduto}
                onDelete={deleteProduto}
                onAddMov={addMov}
                onTogglePrioritario={(id) => togglePrioritario(id)}
                categorias={categorias}
                locais={locaisArmazenamento}
                sortOrder={sortOrder}
                onToggleSort={handleToggleSort}
                allProdutos={allProdutos}
                canEdit={canEditarProduto}
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

            <div style={{ marginTop: '40px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-3)', marginBottom: '12px' }}>
                Últimas Movimentações
              </div>
              <div className="card-modern" style={{ padding: '12px 16px' }}>
                <MovsList movs={movs.slice(0, 5)} produtos={allProdutos} />
              </div>
            </div>
          </div>
        )}

        {/* ── MOVIMENTAÇÕES ── */}
        {view === 'movimentacoes' && (
          <div className="content-area card-modern animate-fade-in">
            <ConsultaMovimentacoes movs={movs} produtos={allProdutos} onDelete={deleteMov} onEdit={updateMov} perfilUsuario={perfilUsuario} />
          </div>
        )}

        {/* ── ROTAS ── */}
        {view === 'rotas' && (
          <div className="content-area animate-fade-in">
            <div className="row g-4">
              <div className="col-lg-4">
                <DeliveryForm
                  onSave={handleSaveDelivery}
                  produtosDisponiveis={allProdutos}
                  deliveryToEdit={editingEntrega}
                  onCancelEdit={() => setEditingEntrega(null)}
                  historicoEntregas={entregas}
                />
              </div>
              <div className="col-lg-8">
                <div className="d-flex flex-column gap-3 mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: '#fff', maxWidth: '220px' }}>
                      <span style={{ padding: '0 10px', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
                        <IconCalendar />
                      </span>
                      <input
                        type="date"
                        className="form-control"
                        style={{ border: 'none', borderRadius: 0, boxShadow: 'none', padding: '0 8px 0 0' }}
                        value={rotaDateFilter}
                        onChange={(e) => setRotaDateFilter(e.target.value)}
                      />
                      {rotaDateFilter && (
                        <button
                          style={{ background: 'none', border: 'none', padding: '0 10px', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}
                          onClick={() => setRotaDateFilter('')}
                          title="Limpar data"
                        >
                          <IconX />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span style={{ fontSize: '12px', fontWeight: 600, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '999px', padding: '3px 10px', color: 'var(--text-2)' }}>
                        {selectedEntregaIds.length} selecionados
                      </span>
                      <button
                        className="btn btn-sm d-flex align-items-center gap-1"
                        style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1.5px solid var(--success)', borderRadius: '7px', height: '30px', padding: '0 10px', fontSize: '12.5px', fontWeight: 600 }}
                        onClick={() => handleBulkStatusChange('Entregue')}
                        disabled={selectedEntregaIds.length === 0}
                      >
                        <IconCheck /> Entregue
                      </button>
                      <button
                        className="btn btn-sm d-flex align-items-center gap-1"
                        style={{ background: 'var(--warning-light)', color: 'var(--primary-dark)', border: '1.5px solid var(--warning)', borderRadius: '7px', height: '30px', padding: '0 10px', fontSize: '12.5px', fontWeight: 600 }}
                        onClick={() => handleBulkStatusChange('Pendente')}
                        disabled={selectedEntregaIds.length === 0}
                      >
                        <IconRefresh /> Pendente
                      </button>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-ghost btn-sm d-flex align-items-center gap-1" disabled={selectedEntregaIds.length === 0} onClick={() => setShowReprogramModal(true)}>
                        <IconReprog /> Reprogramar
                      </button>
                      <button className="btn btn-secondary btn-sm d-flex align-items-center gap-1" disabled={selectedEntregaIds.length === 0} onClick={handleGenerateDeliveryReport}>
                        <IconPDF /> PDF
                      </button>
                    </div>
                  </div>
                </div>
                <div className="table-wrap">
                  <DeliveryTable
                    deliveries={filteredDeliveries}
                    onDelete={(id) => setEntregaToDeleteId(id)}
                    onEdit={(item: Entrega) => {
                      const ent = normalizeEntrega(item);
                      if (!isDelivered(ent.status)) {
                        setEditingEntrega(ent);
                        scrollTop();
                      } else toast.error('Itens entregues não podem ser editados.');
                    }}
                    onStatusChange={updateEntregaStatus}
                    selectedIdSet={selectedEntregaIdSet}
                    onSelectItem={handleSelectEntrega}
                    onSelectAll={handleSelectAllEntregas}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ENTRADAS/SAÍDAS ── */}
        {view === 'entradas_saidas' && (
          <div className="content-area animate-fade-in">
            <EntradaSaidaForm produtos={allProdutos} onSubmit={handleEntradaSaidaSubmit} perfilUsuario={perfilUsuario} />
          </div>
        )}

        {/* ── LEITURA DE NF ── */}
        {view === 'nota_fiscal' && (
          <div className="content-area animate-fade-in">
            <NotaFiscalReader
              produtos={allProdutos}
              perfilUsuario={perfilUsuario}
              onImportar={(dados) => {
                handleEntradaSaidaSubmit(dados);
              }}
            />
          </div>
        )}

        {/* ── PREVISÃO DE CONSUMO ── */}
        {view === 'previsao' && (
          <div className="content-area animate-fade-in">
            <PrevisaoConsumo produtos={allProdutos} movimentacoes={movs} />
          </div>
        )}

        {/* ── SOLICITAÇÕES EM ANDAMENTO (almoxarifado) ── */}
        {view === 'solicitacoes' && perfilUsuario === 'almoxarifado' && (
          <div className="content-area animate-fade-in">
            <Solicitacoes nomeUsuario={nomeUsuario} />
          </div>
        )}
        <div style={{ marginTop: 'auto', padding: '20px 0', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '8px', width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: '10px', color: '#9B97B2', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 500 }}>Desenvolvido por</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e1b2e', letterSpacing: '0.2px' }}>Caio Vinícius de Carvalho Bezerra</span>
        </div>
      </main>

      {/* ── BOTTOM NAV ── */}
      <nav className="bottom-nav">
        {(
          [
            { id: 'estoque', label: 'Estoque', Icon: IconBox },
            { id: 'movimentacoes', label: 'Movs', Icon: IconClipboard },
            { id: 'entradas_saidas', label: 'Fluxo', Icon: IconArrowLeftRight },
            { id: 'rotas', label: 'Rotas', Icon: IconTruck },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button key={id} className={`bottom-nav-item ${view === id ? 'active' : ''}`} onClick={() => { setView(id); setShowMoreSheet(false); scrollTop(); }}>
            <Icon /><span>{label}</span>
          </button>
        ))}
        <button
          className={`bottom-nav-item ${view === 'nota_fiscal' || view === 'previsao' || view === 'solicitacoes' ? 'active' : ''}`}
          onClick={() => setShowMoreSheet((v) => !v)}
          style={{ position: 'relative' }}
        >
          <IconMore /><span>Mais</span>
          {perfilUsuario === 'almoxarifado' && solicitacoesPendentesCount > 0 && (
            <span className="notif-count" style={{ top: '2px', right: '14px' }}>
              {solicitacoesPendentesCount > 99 ? '99+' : solicitacoesPendentesCount}
            </span>
          )}
        </button>
      </nav>

      {/* ── SHEET "MAIS" (mobile) ── */}
      {showMoreSheet && (
        <div className="more-sheet-backdrop" onClick={() => setShowMoreSheet(false)}>
          <div className="more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="more-sheet-handle" />
            {(
              [
                ...(perfilUsuario === 'almoxarifado'
                  ? [{ id: 'solicitacoes', label: 'Solicitações em Andamento', Icon: IconInbox }]
                  : []),
                { id: 'nota_fiscal', label: 'Leitura de Documento', Icon: IconScan },
                { id: 'previsao', label: 'Previsão de Consumo', Icon: IconTrendingUp },
              ] as { id: typeof view; label: string; Icon: () => JSX.Element }[]
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`more-sheet-item ${view === id ? 'active' : ''}`}
                onClick={() => { setView(id); setShowMoreSheet(false); scrollTop(); }}
              >
                <Icon />
                <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                {id === 'solicitacoes' ? (
                  solicitacoesPendentesCount > 0 && (
                    <span className="more-sheet-badge" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}>
                      {solicitacoesPendentesCount > 99 ? '99+' : solicitacoesPendentesCount}
                    </span>
                  )
                ) : (
                  <span className="more-sheet-badge">Novo</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {showScroll && (
        <button className="btn-scroll-top" onClick={scrollTop}><IconArrowUp /></button>
      )}

      {/* ── MODALS ── */}
      {showLowStockModal && (
        <ModalComponent title="Alertas de Estoque" onClose={() => setShowLowStockModal(false)}>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px' }}>
            Produtos abaixo da quantidade mínima ({produtosAbaixoMinimo.length}):
          </p>
          {produtosAbaixoMinimo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div className="mb-3"><IconCheckLg /></div>
              <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>Estoque estabilizado!</p>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>Nenhum material em rutura no momento.</p>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', maxHeight: '50vh', overflowY: 'auto' }}>
              {produtosAbaixoMinimo.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-1)' }}>{p.nome}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px' }}>SKU: {p.sku} · {p.localArmazenamento || 'N/A'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 700, fontSize: '13.5px', padding: '3px 10px', borderRadius: '999px', marginBottom: '2px' }}>
                      {p.quantidade} {p.unidade}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Mín: {p.estoqueMinimo}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            <button className="btn btn-secondary" onClick={() => setShowLowStockModal(false)}>Fechar</button>
          </div>
        </ModalComponent>
      )}

      {showReprogramModal && (
        <ModalComponent title="Reprogramar Entregas" onClose={() => setShowReprogramModal(false)}>
          <p style={{ fontSize: '13.5px', color: 'var(--text-2)' }}>
            Reprogramar <strong>{selectedEntregaIds.length}</strong> entrega(s).
          </p>
          <div className="mb-3">
            <label className="form-label">Nova Data</label>
            <input type="date" className="form-control" value={newDeliveryDate} onChange={(e) => setNewDeliveryDate(e.target.value)} />
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setShowReprogramModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleReprogramDeliveries}>Confirmar</button>
          </div>
        </ModalComponent>
      )}

      {showBulkConfirmModal && (
        <ModalComponent title="Confirmar Alteração" onClose={() => setShowBulkConfirmModal(false)}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div className="mb-3"><IconWarningLg /></div>
            <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
              Marcar <strong>{selectedEntregaIds.length}</strong> item(ns) como <strong>"{bulkTargetStatus}"</strong>?
            </p>
            <div className="d-flex justify-content-center gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => setShowBulkConfirmModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmBulkStatusChange}>Confirmar</button>
            </div>
          </div>
        </ModalComponent>
      )}

      {showStockLimitModal && (
        <ModalComponent title="Estoque Insuficiente" onClose={() => setShowStockLimitModal(false)}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div className="mb-3"><IconWarningLg /></div>
            <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>A quantidade solicitada excede o disponível.</p>
            <p style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>Deseja forçar o agendamento?</p>
            <div className="d-flex justify-content-center gap-3 mt-4">
              <button className="btn btn-secondary" onClick={() => setShowStockLimitModal(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleConfirmStockOverride}>Confirmar</button>
            </div>
          </div>
        </ModalComponent>
      )}

      {entregaToDeleteId && (
        <ModalComponent title="Confirmar Exclusão" onClose={() => setEntregaToDeleteId(null)}>
          <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>Deseja excluir esta entrega? O estoque será devolvido.</p>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setEntregaToDeleteId(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={() => confirmDeleteEntrega(entregaToDeleteId!)}>Excluir</button>
          </div>
        </ModalComponent>
      )}

      {showIdentModal && (
        <IdentificacaoModal
          initialValue={nomeUsuario}
          initialPerfil={perfilUsuario}
          onConfirm={salvarNomeOperador}
        />
      )}

      {showEditarNome && (
        <IdentificacaoModal
          initialValue={nomeUsuario}
          initialPerfil={perfilUsuario}
          onConfirm={salvarNomeOperador}
          onClose={() => setShowEditarNome(false)}
        />
      )}

      <ChatWidget />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}