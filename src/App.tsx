import { useEffect, useState, useMemo } from 'react';
import meuLogo from './assets/logo.svg';
import { DeliveryForm } from './components/DeliveryForm';
import { DeliveryTable } from './components/DeliveryTable';
import { EntradaSaidaForm } from './components/EntradaSaidaForm';
import './styles.css';

import type { Produto, Movimentacao, Entrega } from './types';
import { API_URL, ITEMS_PER_PAGE } from './constants';
import { isDelivered, normalizeEntrega, formatPhoneNumber } from './utils';
import { useDebounce } from './hooks';
import { ModalComponent, Paginacao } from './components/Shared';
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
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const IconClipboard = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);
const IconTruck = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
const IconArrowLeftRight = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <polyline points="7 16 3 12 7 8" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <polyline points="17 8 21 12 17 16" />
  </svg>
);
const IconBell = ({ active }: { active?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    width="20"
    height="20"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconCalendar = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="15"
    height="15"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
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
const IconRefresh = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="14"
    height="14"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4" />
  </svg>
);
const IconReprog = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="14"
    height="14"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconPDF = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="14"
    height="14"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const IconWarningLg = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="40"
    height="40"
    style={{ color: 'var(--warning)' }}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconCheckLg = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="40"
    height="40"
    style={{ color: 'var(--success)' }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconSearch = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="15"
    height="15"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconArrowUp = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    width="18"
    height="18"
  >
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);
const IconError = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="28"
    height="28"
    style={{ color: 'var(--danger)' }}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

// ── APP ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [allProdutos, setAllProdutos] = useState<Produto[]>([]);
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [editingEntrega, setEditingEntrega] = useState<Entrega | null>(null);

  const [entregaToDeleteId, setEntregaToDeleteId] = useState<string | null>(
    null,
  );
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState('');
  const [showStockLimitModal, setShowStockLimitModal] = useState(false);
  const [pendingDeliveryData, setPendingDeliveryData] = useState<any>(null);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<
    'estoque' | 'movimentacoes' | 'rotas' | 'entradas_saidas'
  >('estoque');
  const [showScroll, setShowScroll] = useState(false);
  const [q, setQ] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [mostrarAbaixoMin, setMostrarAbaixoMin] = useState(false);
  const [mostrarPrioritarios, setMostrarPrioritarios] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedEntregaIds, setSelectedEntregaIds] = useState<string[]>([]);
  const [showReprogramModal, setShowReprogramModal] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');

  const [rotaDateFilter, setRotaDateFilter] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  });

  const debouncedQ = useDebounce(q, 500);

  // 👇 COLE O CÓDIGO DO KEEP-ALIVE AQUI 👇
  useEffect(() => {
    // Ping para manter o backend (Koyeb) acordado enquanto o utilizador usa a app
    const keepAliveInterval = setInterval(() => {
      fetch('https://small-lanae-caiobezerra-b22ba187.koyeb.app/ping')
        .catch(err => console.error('Falha no ping:', err));
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(keepAliveInterval);
  }, []);
  // 👆 -------------------------------- 👆

  // ── DATA FETCH ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);
        const firstPageRes = await fetch(
          `${API_URL}/produtos?_page=1&_limit=${ITEMS_PER_PAGE}`,
        );
        if (!firstPageRes.ok)
          throw new Error('Falha ao buscar dados iniciais.');
        setProdutos(await firstPageRes.json());
        setLoading(false);

        const [allProdsRes, movsRes, entregasRes] = await Promise.all([
          fetch(`${API_URL}/produtos?_limit=10000`),
          fetch(`${API_URL}/movimentacoes`),
          fetch(`${API_URL}/entregas`),
        ]);
        if (!allProdsRes.ok || !movsRes.ok || !entregasRes.ok)
          throw new Error('Falha ao buscar dados completos.');
        setAllProdutos(await allProdsRes.json());
        setMovs(await movsRes.json());
        setEntregas((await entregasRes.json()).map(normalizeEntrega));
      } catch (err: any) {
        setError('Não foi possível conectar ao servidor. Verifique o backend.');
      } finally {
        setLoadingAll(false);
      }
    }
    fetchInitialData();

    const onScroll = () => setShowScroll(window.pageYOffset > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── CRUD PRODUTOS ────────────────────────────────────────────────────────

  async function addProduto(
    p: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm' | 'sku'>,
  ) {
    try {
      const res = await fetch(`${API_URL}/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      if (!res.ok) throw new Error();
      const novoProduto = await res.json();
      setAllProdutos((prev) => [novoProduto, ...prev]);
    } catch {
      console.error('addProduto failed');
    }
  }

  async function updateProduto(
    id: UUID,
    patch: Partial<Omit<Produto, 'id' | 'sku' | 'criadoEm'>>,
  ) {
    try {
      const res = await fetch(`${API_URL}/produtos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setAllProdutos((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch {
      console.error('updateProduto failed');
    }
  }

  async function deleteProduto(id: UUID) {
    try {
      await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
      setAllProdutos((prev) => prev.filter((p) => p.id !== id));
      setMovs((prev) => prev.filter((m) => m.produtoId !== id));
    } catch {
      console.error('deleteProduto failed');
    }
  }

  async function togglePrioritario(id: UUID, currentState: boolean) {
    setAllProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, prioritario: !currentState } : p)),
    );
    try {
      const res = await fetch(`${API_URL}/produtos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prioritario: !currentState }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Não foi possível salvar a alteração de prioridade.');
      setAllProdutos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, prioritario: currentState } : p,
        ),
      );
    }
  }

  // ── CRUD MOVIMENTAÇÕES ───────────────────────────────────────────────────

  async function addMov(
    m: Omit<Movimentacao, 'id' | 'criadoEm'>,
    custoEntrada?: number,
  ) {
    try {
      const res = await fetch(`${API_URL}/movimentacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...m, custoEntrada }),
      });
      if (!res.ok) throw new Error('Falha ao criar movimentação');
      const { movimentacao, produto } = await res.json();
      setMovs((prev) => [movimentacao, ...prev]);
      setAllProdutos((prev) =>
        prev.map((p) => (p.id === produto.id ? produto : p)),
      );
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const handleEntradaSaidaSubmit = async (dados: any) => {
    try {
      setLoading(true);
      const partes = [];
      if (dados.ordemCompra) partes.push(`OC: ${dados.ordemCompra}`);
      if (dados.nomeObra) partes.push(`Obra: ${dados.nomeObra}`);
      const motivoFinal =
        partes.length > 0
          ? partes.join(' | ')
          : `Movimentação em lote (${dados.tipo})`;
      for (const item of dados.itens) {
        await addMov(
          {
            produtoId: item.produtoId,
            tipo: dados.tipo,
            quantidade: item.quantidade,
            motivo: motivoFinal,
            nomeObra: dados.nomeObra || undefined,
            ordemCompra: dados.ordemCompra || undefined,
            custoUnitarioHistorico: item.valorUnitario,
          },
          dados.tipo === 'entrada' ? item.valorUnitario : undefined,
        );
      }
      toast.success('Movimentações registradas com sucesso!');
      setView('estoque');
      scrollTop();
    } catch {
      toast.error('Erro ao registrar entradas/saídas.');
    } finally {
      setLoading(false);
    }
  };

  async function updateMov(
    id: UUID,
    patch: { quantidade: number; motivo?: string },
  ) {
    try {
      const res = await fetch(`${API_URL}/movimentacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const { movimentacaoAtualizada, produtoAtualizado } = await res.json();
      setMovs((prev) =>
        prev.map((m) => (m.id === id ? movimentacaoAtualizada : m)),
      );
      setAllProdutos((prev) =>
        prev.map((p) =>
          p.id === produtoAtualizado.id ? produtoAtualizado : p,
        ),
      );
      const eRes = await fetch(`${API_URL}/entregas`);
      setEntregas((await eRes.json()).map(normalizeEntrega));
    } catch {
      console.error('updateMov failed');
    }
  }

  async function deleteMov(id: UUID) {
    try {
      const res = await fetch(`${API_URL}/movimentacoes/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      const { produtoAtualizado } = await res.json();
      setMovs((prev) => prev.filter((m) => m.id !== id));
      setAllProdutos((prev) =>
        prev.map((p) =>
          p.id === produtoAtualizado.id ? produtoAtualizado : p,
        ),
      );
      const eRes = await fetch(`${API_URL}/entregas`);
      setEntregas((await eRes.json()).map(normalizeEntrega));
    } catch {
      console.error('deleteMov failed');
    }
  }

  // ── CRUD ENTREGAS ────────────────────────────────────────────────────────

  async function updateEntregaFull(id: string, data: any) {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/entregas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Falha ao atualizar');
      }
      const [eRes, pRes, mRes] = await Promise.all([
        fetch(`${API_URL}/entregas`),
        fetch(`${API_URL}/produtos?_limit=10000`),
        fetch(`${API_URL}/movimentacoes`),
      ]);
      setEntregas((await eRes.json()).map(normalizeEntrega));
      setAllProdutos(await pRes.json());
      setMovs(await mRes.json());
      setEditingEntrega(null);
      toast.success('Entrega atualizada com sucesso!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addEntrega(data: any) {
    try {
      const res = await fetch(`${API_URL}/entregas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const [eRes, pRes, mRes] = await Promise.all([
        fetch(`${API_URL}/entregas`),
        fetch(`${API_URL}/produtos?_limit=10000`),
        fetch(`${API_URL}/movimentacoes`),
      ]);
      setEntregas((await eRes.json()).map(normalizeEntrega));
      setAllProdutos(await pRes.json());
      setMovs(await mRes.json());
      toast.success('Agendamento criado com sucesso!');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const processDeliverySave = (data: any) => {
    if (editingEntrega) updateEntregaFull(editingEntrega.id, data);
    else addEntrega(data);
  };

  const handleSaveDelivery = (data: any) => {
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

  async function confirmDeleteEntrega(id: string) {
    try {
      const res = await fetch(`${API_URL}/entregas/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Erro ao excluir');
      }
      const [eRes, pRes, mRes] = await Promise.all([
        fetch(`${API_URL}/entregas`),
        fetch(`${API_URL}/produtos?_limit=10000`),
        fetch(`${API_URL}/movimentacoes`),
      ]);
      setEntregas((await eRes.json()).map(normalizeEntrega));
      setAllProdutos(await pRes.json());
      setMovs(await mRes.json());
      setEntregaToDeleteId(null);
      toast.success('Entrega excluída com sucesso.');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function updateEntregaStatus(id: string, status: string) {
    try {
      await fetch(`${API_URL}/entregas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setEntregas((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e)),
      );
      toast.success(`Status atualizado para ${status}.`);
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  }

  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedEntregaIds.length === 0) return;
    setBulkTargetStatus(newStatus);
    setShowBulkConfirmModal(true);
  };

  const confirmBulkStatusChange = async () => {
    try {
      setLoading(true);
      await Promise.all(
        selectedEntregaIds.map((id) =>
          fetch(`${API_URL}/entregas/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: bulkTargetStatus }),
          }),
        ),
      );
      const eRes = await fetch(`${API_URL}/entregas`);
      setEntregas((await eRes.json()).map(normalizeEntrega));
      setSelectedEntregaIds([]);
      setShowBulkConfirmModal(false);
      toast.success(`Entregas marcadas como ${bulkTargetStatus}.`);
    } catch {
      toast.error('Erro ao atualizar status em massa.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEntrega = (id: string) =>
    setSelectedEntregaIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  // ── PDF ENTREGAS ─────────────────────────────────────────────────────────

  const handleGenerateDeliveryReport = () => {
    if (selectedEntregaIds.length === 0) {
      toast.error('Selecione ao menos uma entrega.');
      return;
    }
    const selected = entregas
      .filter(
        (d) => selectedEntregaIds.includes(d.id) && !isDelivered(d.status),
      )
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
    const reportDate = new Date(first.dataHoraSolicitacao).toLocaleDateString(
      'pt-BR',
    );
    const responsavel = first.responsavelNome || 'Nao informado';
    const telefone = first.responsavelTelefone
      ? formatPhoneNumber(first.responsavelTelefone)
      : 'Nao informado';
    const DARK = [22, 34, 56] as [number, number, number];
    const HEADER = [40, 58, 100] as [number, number, number];
    const ACCENT = [60, 90, 160] as [number, number, number];
    const GRAY = [110, 120, 140] as [number, number, number];
    const LGRAY = [180, 188, 205] as [number, number, number];
    const LIGHT = [246, 247, 250] as [number, number, number];
    const BORDER = [215, 220, 232] as [number, number, number];
    const WHITE = [255, 255, 255] as [number, number, number];
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ML = 20,
      MR = 20,
      cw = pageW - ML - MR;
    doc.setFillColor(...HEADER);
    doc.rect(0, 0, pageW, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.text('Programacao de Caminhoes para Entrega de Materiais', ML, 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 195, 225);
    doc.text(
      'Data:',
      pageW - MR - doc.getTextWidth('Data:  ') - doc.getTextWidth(reportDate),
      9,
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(reportDate, pageW - MR, 9, { align: 'right' });
    let y = 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text('Responsavel:', ML, y);
    let cx = ML + doc.getTextWidth('Responsavel:  ');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(responsavel, cx, y);
    cx += doc.getTextWidth(responsavel + '   ');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...LGRAY);
    doc.text('|', cx, y);
    cx += doc.getTextWidth('|   ');
    doc.setTextColor(...GRAY);
    doc.text('Telefone:', cx, y);
    cx += doc.getTextWidth('Telefone:  ');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(telefone, cx, y);
    y += 4;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);
    doc.line(ML, y, ML + cw, y);
    y += 8;
    doc.setFillColor(...ACCENT);
    doc.rect(ML, y - 3.5, 3, 4.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...ACCENT);
    doc.text('PROGRAMACAO DE ENTREGAS', ML + 5, y);
    y += 5;
    const colRatios = [0.05, 0.07, 0.08, 0.285, 0.275, 0.065, 0.075, 0.1];
    const colW = colRatios.map((r) => r * cw);
    (doc as any).autoTable({
      head: [
        [
          'N.',
          'OK',
          'Hora',
          'Local da Obra',
          'Material',
          'Qtd',
          'Un',
          'Armazem',
        ],
      ],
      body: selected.map((d, i) => [
        String(i + 1).padStart(2, '0'),
        '',
        new Date(d.dataHoraSolicitacao).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        d.localObra,
        d.itemNome || '-',
        String(d.itemQuantidade),
        d.itemUnidadeMedida || '-',
        d.localArmazenagem || '-',
      ]),
      startY: y,
      margin: { left: ML, right: MR },
      tableWidth: cw,
      columnStyles: {
        0: { cellWidth: colW[0], halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: colW[1], halign: 'center' },
        2: { cellWidth: colW[2], halign: 'center' },
        3: { cellWidth: colW[3], halign: 'left' },
        4: { cellWidth: colW[4], halign: 'left', fontStyle: 'bold' },
        5: { cellWidth: colW[5], halign: 'center' },
        6: { cellWidth: colW[6], halign: 'center' },
        7: { cellWidth: colW[7], halign: 'center' },
      },
      headStyles: {
        fillColor: HEADER,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: DARK,
        cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
      },
      alternateRowStyles: { fillColor: LIGHT },
      styles: { lineColor: BORDER, lineWidth: 0.2, valign: 'middle' },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
          const sz = 3.8,
            bx = data.cell.x + (data.cell.width - sz) / 2,
            by = data.cell.y + (data.cell.height - sz) / 2;
          doc.setDrawColor(...LGRAY);
          doc.setLineWidth(0.3);
          doc.rect(bx, by, sz, sz);
        }
      },
    });
    const endY = (doc as any).lastAutoTable.finalY;
    const sigY = endY + 22,
      lineLen = cw * 0.36,
      lX = ML,
      rX = ML + cw - lineLen;
    doc.setDrawColor(...GRAY);
    doc.setLineWidth(0.4);
    doc.line(lX, sigY, lX + lineLen, sigY);
    doc.line(rX, sigY, rX + lineLen, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Assinatura do Motorista', lX + lineLen / 2, sigY + 5, {
      align: 'center',
    });
    doc.text('Assinatura do Solicitante', rX + lineLen / 2, sigY + 5, {
      align: 'center',
    });
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(ML, pageH - 12, ML + cw, pageH - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Sistema de Gestao de Entregas', pageW / 2, pageH - 7, {
      align: 'center',
    });
    doc.save(`Programacao-Diaria-${reportDate.replace(/\//g, '-')}.pdf`);
  };

  const handleReprogramDeliveries = async () => {
    if (!newDeliveryDate) {
      toast.error('Escolha uma nova data.');
      return;
    }
    const valid = selectedEntregaIds.filter((id) => {
      const e = entregas.find((e) => e.id === id);
      return e && !isDelivered(e.status);
    });
    if (valid.length === 0) {
      toast.error('Apenas itens pendentes podem ser reprogramados.');
      setShowReprogramModal(false);
      return;
    }
    try {
      await Promise.all(
        valid.map((id) => {
          const e = entregas.find((e) => e.id === id);
          if (!e) return Promise.resolve();
          const time = e.dataHoraSolicitacao.split('T')[1] || '08:00:00';
          return fetch(`${API_URL}/entregas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataHoraSolicitacao: `${newDeliveryDate}T${time}`,
            }),
          });
        }),
      );
      toast.success(`${valid.length} entrega(s) reprogramada(s)!`);
      setShowReprogramModal(false);
      setNewDeliveryDate('');
      const eRes = await fetch(`${API_URL}/entregas`);
      setEntregas((await eRes.json()).map(normalizeEntrega));
    } catch {
      toast.error('Erro ao reprogramar.');
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

  const filteredDeliveries = useMemo(() => {
    let data = entregas;
    if (rotaDateFilter)
      data = data.filter(
        (d) =>
          new Date(d.dataHoraSolicitacao).toLocaleDateString('en-CA') ===
          rotaDateFilter,
      );
    return data.sort(
      (a, b) =>
        new Date(a.dataHoraSolicitacao).getTime() -
        new Date(b.dataHoraSolicitacao).getTime(),
    );
  }, [entregas, rotaDateFilter]);

  const handleSelectAllEntregas = (checked: boolean) =>
    setSelectedEntregaIds(checked ? filteredDeliveries.map((e) => e.id) : []);

  const filteredProdutos = useMemo(() => {
    if (loadingAll) return produtos;
    let result = allProdutos.filter((p) => {
      const q2 = debouncedQ.trim().toLowerCase();
      return (
        (q2 === '' ||
          p.nome.toLowerCase().includes(q2) ||
          p.sku.toLowerCase().includes(q2) ||
          p.categoria?.toLowerCase().includes(q2)) &&
        (!categoriaFilter || p.categoria === categoriaFilter) &&
        (!mostrarAbaixoMin ||
          (p.estoqueMinimo != null && p.quantidade <= p.estoqueMinimo)) &&
        (!mostrarPrioritarios || p.prioritario)
      );
    });
    if (sortOrder)
      result = [...result].sort((a, b) =>
        sortOrder === 'asc'
          ? a.nome.localeCompare(b.nome)
          : b.nome.localeCompare(a.nome),
      );
    return result;
  }, [
    debouncedQ,
    categoriaFilter,
    mostrarAbaixoMin,
    mostrarPrioritarios,
    allProdutos,
    produtos,
    loadingAll,
    sortOrder,
  ]);

  const paginatedProdutos = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredProdutos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProdutos, page]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const handleToggleSort = () =>
    setSortOrder((cur) =>
      cur === null ? 'asc' : cur === 'asc' ? 'desc' : null,
    );

  // ── ERROR STATE ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'var(--surface-2)',
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            maxWidth: '420px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="mb-3">
            <IconError />
          </div>
          <h4
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-1)',
              marginBottom: '8px',
            }}
          >
            Erro de Conexão
          </h4>
          <p style={{ color: 'var(--text-2)', fontSize: '13.5px', margin: 0 }}>
            {error}
          </p>
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
              {
                id: 'movimentacoes',
                label: 'Movimentações',
                Icon: IconClipboard,
              },
              { id: 'rotas', label: 'Rotas & Entregas', Icon: IconTruck },
              {
                id: 'entradas_saidas',
                label: 'Entrada / Saída',
                Icon: IconArrowLeftRight,
              },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item-clean ${view === id ? 'active' : ''}`}
              onClick={() => {
                setView(id);
                scrollTop();
              }}
            >
              <Icon /> {label}
            </button>
          ))}
        </nav>
        {/* ── SIDEBAR FOOTER ── */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            marginTop: 'auto',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
            }}
          >
            Desenvolvido por
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.3px',
              marginTop: '2px',
            }}
          >
            Caio Vinícius
          </div>
        </div>
      </aside>

      {/* ── MOBILE HEADER ── */}
      <div className="mobile-header d-lg-none d-flex justify-content-between align-items-center px-3">
        <img src={meuLogo} alt="Logo" style={{ height: '32px' }} />
        <div
          onClick={() => setShowLowStockModal(true)}
          style={{
            cursor: 'pointer',
            position: 'relative',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color:
                produtosAbaixoMinimo.length > 0
                  ? 'var(--danger)'
                  : 'var(--text-3)',
            }}
          >
            <IconBell active={produtosAbaixoMinimo.length > 0} />
          </span>
          {produtosAbaixoMinimo.length > 0 && (
            <span
              className="notif-count"
              style={{ top: '-2px', right: '-2px' }}
            >
              {produtosAbaixoMinimo.length}
            </span>
          )}
        </div>
      </div>

      {/* ── MAIN ── */}
      <main className="main-content">
        {/* Topbar desktop */}
        <header className="page-header d-none d-lg-flex">
          <div>
            <h1 className="page-title m-0">
              {view === 'estoque' && 'Visão Geral do Estoque'}
              {view === 'movimentacoes' && 'Histórico de Movimentações'}
              {view === 'rotas' && 'Cronograma de Entregas'}
              {view === 'entradas_saidas' && 'Lançamento de Entradas e Saídas'}
            </h1>
            <div className="page-date-subtitle">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
          <div
            className="icon-btn"
            onClick={() => setShowLowStockModal(true)}
            title="Alertas de Estoque"
            style={{ cursor: 'pointer' }}
          >
            <span
              style={{
                color:
                  produtosAbaixoMinimo.length > 0
                    ? 'var(--danger)'
                    : 'var(--text-3)',
              }}
            >
              <IconBell active={produtosAbaixoMinimo.length > 0} />
            </span>
            {produtosAbaixoMinimo.length > 0 && (
              <span className="notif-count">{produtosAbaixoMinimo.length}</span>
            )}
          </div>
        </header>

        {/* ── ESTOQUE ── */}
        {view === 'estoque' && (
          <div className="content-area animate-fade-in">
            {!loadingAll && <MetricCards allProdutos={allProdutos} />}

            <div className="card-modern">
              <div className="row gy-3 align-items-end">
                {/* Busca */}
                <div className="col-12 col-lg-5">
                  <label className="form-label">Pesquisar Produto</label>
                  <div className="input-wrap">
                    <IconSearch />
                    <input
                      className="form-control"
                      placeholder={
                        loadingAll
                          ? 'Carregando...'
                          : 'Nome, SKU ou categoria...'
                      }
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      disabled={loadingAll}
                    />
                  </div>
                </div>

                {/* Categoria */}
                <div className="col-12 col-md-4 col-lg-3">
                  <label className="form-label">Categoria</label>
                  <select
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

                {/* Localização */}
                <div className="col-12 col-md-4 col-lg-2">
                  <label className="form-label">Localização</label>
                  <select className="form-select" defaultValue="">
                    <option value="">Todos os locais</option>
                    {locaisArmazenamento.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status toggles */}
                <div className="col-12 col-md-4 col-lg-2">
                  <label className="form-label">Status</label>
                  <div className="d-flex flex-column gap-1">
                    <button
                      className={`toggle-chip${mostrarAbaixoMin ? ' active-warning' : ''}`}
                      onClick={() => setMostrarAbaixoMin(!mostrarAbaixoMin)}
                    >
                      <span className="dot" /> Abaixo do mín.
                    </button>
                    <button
                      className={`toggle-chip${mostrarPrioritarios ? ' active-danger' : ''}`}
                      onClick={() =>
                        setMostrarPrioritarios(!mostrarPrioritarios)
                      }
                    >
                      <span className="dot" /> Prioritários
                    </button>
                  </div>
                </div>
              </div>

              <hr
                style={{
                  margin: '20px 0',
                  borderColor: 'var(--border)',
                  opacity: 1,
                }}
              />

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <ValorTotalEstoque allProdutos={allProdutos} />
                  {!loadingAll && (
                    <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                      Exibindo{' '}
                      <strong style={{ color: 'var(--text-1)' }}>
                        {Math.min(
                          (page - 1) * ITEMS_PER_PAGE + 1,
                          filteredProdutos.length,
                        )}
                        –
                        {Math.min(
                          page * ITEMS_PER_PAGE,
                          filteredProdutos.length,
                        )}
                      </strong>{' '}
                      de{' '}
                      <strong style={{ color: 'var(--text-1)' }}>
                        {filteredProdutos.length}
                      </strong>{' '}
                      produtos
                    </span>
                  )}
                </div>
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
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div
                  className="spinner-border"
                  style={{ color: 'var(--primary)' }}
                  role="status"
                />
                <p
                  style={{
                    marginTop: '12px',
                    color: 'var(--text-3)',
                    fontSize: '13.5px',
                  }}
                >
                  Carregando estoque...
                </p>
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
                sortOrder={sortOrder}
                onToggleSort={handleToggleSort}
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
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.8px',
                  color: 'var(--text-3)',
                  marginBottom: '12px',
                }}
              >
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
            <ConsultaMovimentacoes
              movs={movs}
              produtos={allProdutos}
              onDelete={deleteMov}
              onEdit={updateMov}
            />
          </div>
        )}

        {/* ── ROTAS ── */}
        {view === 'rotas' && (
          <div className="content-area animate-fade-in">
            <div className="row g-4">
              {/* Form */}
              <div className="col-lg-4">
                <DeliveryForm
                  onSave={handleSaveDelivery}
                  produtosDisponiveis={allProdutos}
                  deliveryToEdit={editingEntrega}
                  onCancelEdit={() => setEditingEntrega(null)}
                  historicoEntregas={entregas}
                />
              </div>

              {/* Table + toolbar */}
              <div className="col-lg-8">
                <div className="d-flex flex-column gap-3 mb-3">
                  {/* Date filter */}
                  <div className="d-flex align-items-center gap-2">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        border: '1.5px solid var(--border)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#fff',
                        maxWidth: '220px',
                      }}
                    >
                      <span
                        style={{
                          padding: '0 10px',
                          color: 'var(--text-3)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <IconCalendar />
                      </span>
                      <input
                        type="date"
                        className="form-control"
                        style={{
                          border: 'none',
                          borderRadius: 0,
                          boxShadow: 'none',
                          padding: '0 8px 0 0',
                        }}
                        value={rotaDateFilter}
                        onChange={(e) => setRotaDateFilter(e.target.value)}
                      />
                      {rotaDateFilter && (
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '0 10px',
                            cursor: 'pointer',
                            color: 'var(--text-3)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onClick={() => setRotaDateFilter('')}
                          title="Limpar data"
                        >
                          <IconX />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bulk actions bar */}
                  <div
                    style={{
                      background: '#fff',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: '999px',
                          padding: '3px 10px',
                          color: 'var(--text-2)',
                        }}
                      >
                        {selectedEntregaIds.length} selecionados
                      </span>
                      <button
                        className="btn btn-sm d-flex align-items-center gap-1"
                        style={{
                          background: 'var(--success-light)',
                          color: 'var(--success)',
                          border: '1.5px solid var(--success)',
                          borderRadius: '7px',
                          height: '30px',
                          padding: '0 10px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                        }}
                        onClick={() => handleBulkStatusChange('Entregue')}
                        disabled={selectedEntregaIds.length === 0}
                      >
                        <IconCheck /> Entregue
                      </button>
                      <button
                        className="btn btn-sm d-flex align-items-center gap-1"
                        style={{
                          background: 'var(--warning-light)',
                          color: 'var(--primary-dark)',
                          border: '1.5px solid var(--warning)',
                          borderRadius: '7px',
                          height: '30px',
                          padding: '0 10px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                        }}
                        onClick={() => handleBulkStatusChange('Pendente')}
                        disabled={selectedEntregaIds.length === 0}
                      >
                        <IconRefresh /> Pendente
                      </button>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-ghost btn-sm d-flex align-items-center gap-1"
                        disabled={selectedEntregaIds.length === 0}
                        onClick={() => setShowReprogramModal(true)}
                      >
                        <IconReprog /> Reprogramar
                      </button>
                      <button
                        className="btn btn-secondary btn-sm d-flex align-items-center gap-1"
                        disabled={selectedEntregaIds.length === 0}
                        onClick={handleGenerateDeliveryReport}
                      >
                        <IconPDF /> PDF
                      </button>
                    </div>
                  </div>
                </div>

                <div className="table-wrap">
                  <DeliveryTable
                    deliveries={filteredDeliveries}
                    onDelete={(id) => setEntregaToDeleteId(id)}
                    onEdit={(item: any) => {
                      const ent = normalizeEntrega(item);
                      if (!isDelivered(ent.status)) {
                        setEditingEntrega(ent);
                        scrollTop();
                      } else
                        toast.error('Itens entregues não podem ser editados.');
                    }}
                    onStatusChange={updateEntregaStatus}
                    selectedIds={selectedEntregaIds}
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
            <EntradaSaidaForm
              produtos={allProdutos}
              onSubmit={handleEntradaSaidaSubmit}
            />
          </div>
        )}
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
          <button
            key={id}
            className={`bottom-nav-item ${view === id ? 'active' : ''}`}
            onClick={() => {
              setView(id);
              scrollTop();
            }}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Scroll to top */}
      {showScroll && (
        <button className="btn-scroll-top" onClick={scrollTop}>
          <IconArrowUp />
        </button>
      )}

      {/* ── MODALS ── */}

      {/* Alertas de estoque */}
      {showLowStockModal && (
        <ModalComponent
          title="Alertas de Estoque"
          onClose={() => setShowLowStockModal(false)}
        >
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-3)',
              marginBottom: '16px',
            }}
          >
            Produtos abaixo da quantidade mínima ({produtosAbaixoMinimo.length}
            ):
          </p>
          {produtosAbaixoMinimo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div className="mb-3">
                <IconCheckLg />
              </div>
              <p
                style={{
                  fontWeight: 700,
                  color: 'var(--text-1)',
                  marginBottom: '4px',
                }}
              >
                Estoque estabilizado!
              </p>
              <p
                style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}
              >
                Nenhum material em rutura no momento.
              </p>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                maxHeight: '50vh',
                overflowY: 'auto',
              }}
            >
              {produtosAbaixoMinimo.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '13.5px',
                        color: 'var(--text-1)',
                      }}
                    >
                      {p.nome}
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--text-3)',
                        marginTop: '2px',
                      }}
                    >
                      SKU: {p.sku} · {p.localArmazenamento || 'N/A'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        background: 'var(--danger-light)',
                        color: 'var(--danger)',
                        fontWeight: 700,
                        fontSize: '13.5px',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        marginBottom: '2px',
                      }}
                    >
                      {p.quantidade} {p.unidade}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                      Mín: {p.estoqueMinimo}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowLowStockModal(false)}
            >
              Fechar
            </button>
          </div>
        </ModalComponent>
      )}

      {/* Reprogramar */}
      {showReprogramModal && (
        <ModalComponent
          title="Reprogramar Entregas"
          onClose={() => setShowReprogramModal(false)}
        >
          <p style={{ fontSize: '13.5px', color: 'var(--text-2)' }}>
            Reprogramar <strong>{selectedEntregaIds.length}</strong> entrega(s).
          </p>
          <div className="mb-3">
            <label className="form-label">Nova Data</label>
            <input
              type="date"
              className="form-control"
              value={newDeliveryDate}
              onChange={(e) => setNewDeliveryDate(e.target.value)}
            />
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setShowReprogramModal(false)}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleReprogramDeliveries}
            >
              Confirmar
            </button>
          </div>
        </ModalComponent>
      )}

      {/* Confirmação em massa */}
      {showBulkConfirmModal && (
        <ModalComponent
          title="Confirmar Alteração"
          onClose={() => setShowBulkConfirmModal(false)}
        >
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div className="mb-3">
              <IconWarningLg />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
              Marcar <strong>{selectedEntregaIds.length}</strong> item(ns) como{' '}
              <strong>"{bulkTargetStatus}"</strong>?
            </p>
            <div className="d-flex justify-content-center gap-2 mt-4">
              <button
                className="btn btn-secondary"
                onClick={() => setShowBulkConfirmModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmBulkStatusChange}
              >
                Confirmar
              </button>
            </div>
          </div>
        </ModalComponent>
      )}

      {/* Estoque insuficiente */}
      {showStockLimitModal && (
        <ModalComponent
          title="Estoque Insuficiente"
          onClose={() => setShowStockLimitModal(false)}
        >
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div className="mb-3">
              <IconWarningLg />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
              A quantidade solicitada excede o disponível.
            </p>
            <p style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>
              Deseja forçar o agendamento?
            </p>
            <div className="d-flex justify-content-center gap-3 mt-4">
              <button
                className="btn btn-secondary"
                onClick={() => setShowStockLimitModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmStockOverride}
              >
                Confirmar
              </button>
            </div>
          </div>
        </ModalComponent>
      )}

      {/* Excluir entrega */}
      {entregaToDeleteId && (
        <ModalComponent
          title="Confirmar Exclusão"
          onClose={() => setEntregaToDeleteId(null)}
        >
          <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
            Deseja excluir esta entrega? O estoque será devolvido.
          </p>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setEntregaToDeleteId(null)}
            >
              Cancelar
            </button>
            <button
              className="btn btn-danger"
              onClick={() => confirmDeleteEntrega(entregaToDeleteId!)}
            >
              Excluir
            </button>
          </div>
        </ModalComponent>
      )}

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
