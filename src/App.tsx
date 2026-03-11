import { useEffect, useState, useMemo } from 'react';
import { Form, Button, Badge, ListGroup } from 'react-bootstrap';
import { 
  ClipboardData, CalendarWeek, XCircle, BoxSeam, Truck, 
  CheckCircleFill, ArrowCounterclockwise, ExclamationTriangleFill,
  ArrowLeftRight, BellFill
} from 'react-bootstrap-icons'; 

import meuLogo from './assets/logo.png';
import { DeliveryForm } from './components/DeliveryForm';
import { DeliveryTable } from './components/DeliveryTable';
import { EntradaSaidaForm } from './components/EntradaSaidaForm';
import './styles.css';

// Importações dos novos módulos
import type { Produto, Movimentacao, Entrega } from './types';
import { API_URL, ITEMS_PER_PAGE } from './constants';
import { isDelivered, normalizeEntrega, formatPhoneNumber } from './utils';
import { useDebounce } from './hooks';
import { ModalComponent, Paginacao } from './components/Shared';
import { ValorTotalEstoque, Relatorios, BotaoNovoProduto, ProdutosTable } from './components/Estoque';
import { ConsultaMovimentacoes, MovsList } from './components/Movimentacoes';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type UUID = string;

export default function App() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [allProdutos, setAllProdutos] = useState<Produto[]>([]);
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [editingEntrega, setEditingEntrega] = useState<Entrega | null>(null);

  const [entregaToDeleteId, setEntregaToDeleteId] = useState<string | null>(null);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState('');
   
  const [showStockLimitModal, setShowStockLimitModal] = useState(false);
  const [pendingDeliveryData, setPendingDeliveryData] = useState<any>(null);
  
  // Novo estado para controlar o modal de Alertas de Stock Baixo
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [error, setError] = useState<string | null>(null);
    
  const [view, setView] = useState<'estoque' | 'movimentacoes' | 'rotas' | 'entradas_saidas'>('estoque');
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
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const debouncedQ = useDebounce(q, 500);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);
        const firstPageRes = await fetch(`${API_URL}/produtos?_page=1&_limit=${ITEMS_PER_PAGE}`);
        if (!firstPageRes.ok) throw new Error('Falha ao buscar dados iniciais.');
        const firstPageData = await firstPageRes.json();
        setProdutos(firstPageData);
        setLoading(false);

        const [allProdsRes, movsRes, entregasRes] = await Promise.all([
          fetch(`${API_URL}/produtos?_limit=10000`),
          fetch(`${API_URL}/movimentacoes`),
          fetch(`${API_URL}/entregas`)
        ]);

        if (!allProdsRes.ok || !movsRes.ok || !entregasRes.ok)
          throw new Error('Falha ao buscar dados completos.');

        const allProdsData = await allProdsRes.json();
        const movsData = await movsRes.json();
        const entregasData = await entregasRes.json();

        setAllProdutos(allProdsData);
        setMovs(movsData);
        setEntregas(entregasData.map(normalizeEntrega));

      } catch (err: any) {
        console.error('Falha ao buscar dados:', err);
        setError('Não foi possível conectar ao servidor. Verifique o backend.');
      } finally {
        setLoadingAll(false);
      }
    }

    fetchInitialData();
    
    const checkScrollTop = () => {
      if (window.pageYOffset > 400) setShowScroll(true);
      else setShowScroll(false);
    };
    window.addEventListener('scroll', checkScrollTop);
    return () => window.removeEventListener('scroll', checkScrollTop);
  }, []);

  async function addProduto(p: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm' | 'sku'>) {
    try {
      const response = await fetch(`${API_URL}/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      if (!response.ok) throw new Error('Falha ao criar produto');
      const novoProduto = await response.json();
      setAllProdutos((prev) => [novoProduto, ...prev]);
    } catch (err) { console.error(err); }
  }

  async function updateProduto(id: UUID, patch: Partial<Omit<Produto, 'id' | 'sku' | 'criadoEm'>>) {
    try {
      const response = await fetch(`${API_URL}/produtos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error('Falha ao atualizar produto');
      const produtoAtualizado = await response.json();
      setAllProdutos((prev) => prev.map((x) => (x.id === id ? produtoAtualizado : x)));
    } catch (err) { console.error(err); }
  }

  async function deleteProduto(id: UUID) {
    try {
      await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
      setAllProdutos((prev) => prev.filter((p) => p.id !== id));
      setMovs((prev) => prev.filter((m) => m.produtoId !== id));
    } catch (err) { console.error(err); }
  }

  async function togglePrioritario(id: UUID, currentState: boolean) {
    setAllProdutos((prev) => prev.map((p) => (p.id === id ? { ...p, prioritario: !currentState } : p)));
    try {
      const response = await fetch(`${API_URL}/produtos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prioritario: !currentState }),
      });
      if (!response.ok) throw new Error('Falha ao atualizar prioridade no servidor.');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível salvar a alteração de prioridade. Verifique sua conexão.');
      setAllProdutos((prev) => prev.map((p) => p.id === id ? { ...p, prioritario: currentState } : p));
    }
  }

  async function addMov(m: Omit<Movimentacao, 'id' | 'criadoEm'>, custoEntrada?: number) {
    try {
      const payload = { ...m, custoEntrada: custoEntrada };
      const response = await fetch(`${API_URL}/movimentacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Falha ao criar movimentação');
      
      const { movimentacao, produto } = await response.json();
      setMovs((prev) => [movimentacao, ...prev]);
      setAllProdutos((prev) => prev.map((p) => (p.id === produto.id ? produto : p)));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    }
  }

  const handleEntradaSaidaSubmit = async (dados: any) => {
    try {
      setLoading(true);
      const motivoBase = [];
      if (dados.ordemCompra) motivoBase.push(`OC: ${dados.ordemCompra}`);
      if (dados.nomeObra) motivoBase.push(`Obra: ${dados.nomeObra}`);
      const motivoFinal = motivoBase.length > 0 ? motivoBase.join(' | ') : `Movimentação em lote (${dados.tipo})`;

      for (const item of dados.itens) {
        await addMov({
          produtoId: item.produtoId,
          tipo: dados.tipo,
          quantidade: item.quantidade,
          motivo: motivoFinal,
          nomeObra: dados.nomeObra || undefined,
          ordemCompra: dados.ordemCompra || undefined,
          custoUnitarioHistorico: item.valorUnitario
        }, dados.tipo === 'entrada' ? item.valorUnitario : undefined); 
      }
      
      toast.success('Movimentações registradas e preços atualizados com sucesso!');
      setView('estoque'); 
      scrollTop();
    } catch (err) {
      toast.error('Erro ao registrar entradas/saídas.');
    } finally {
      setLoading(false);
    }
  };

  async function updateMov(id: UUID, patch: { quantidade: number; motivo?: string }) {
    try {
      const response = await fetch(`${API_URL}/movimentacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error('Falha ao atualizar movimentação');

      const { movimentacaoAtualizada, produtoAtualizado } = await response.json();
      setMovs((prev) => prev.map((m) => (m.id === id ? movimentacaoAtualizada : m)));
      setAllProdutos((prev) => prev.map((p) => p.id === produtoAtualizado.id ? produtoAtualizado : p));

      const entregasRes = await fetch(`${API_URL}/entregas`);
      const entregasData = await entregasRes.json();
      setEntregas(entregasData.map(normalizeEntrega));
    } catch (err) { console.error('Erro ao atualizar movimentação:', err); }
  }

  async function deleteMov(id: UUID) {
    try {
      const response = await fetch(`${API_URL}/movimentacoes/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Falha ao excluir movimentação');
      const { produtoAtualizado } = await response.json();
        
      setMovs((prev) => prev.filter((m) => m.id !== id));
      setAllProdutos((prev) => prev.map((p) => p.id === produtoAtualizado.id ? produtoAtualizado : p));

      const entregasRes = await fetch(`${API_URL}/entregas`);
      const entregasData = await entregasRes.json();
      setEntregas(entregasData.map(normalizeEntrega));
    } catch (err) { console.error(err); }
  }

  async function updateEntregaFull(id: string, data: any) {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/entregas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Falha ao atualizar entrega');
      }

      const [entregasRes, prodsRes, movsRes] = await Promise.all([
        fetch(`${API_URL}/entregas`),
        fetch(`${API_URL}/produtos?_limit=10000`),
        fetch(`${API_URL}/movimentacoes`)
      ]);

      if (!entregasRes.ok || !prodsRes.ok || !movsRes.ok) {
         throw new Error("Erro ao sincronizar dados após edição.");
      }

      const entregasData = await entregasRes.json();
      const prodsData = await prodsRes.json();
      const movsData = await movsRes.json();

      setEntregas(entregasData.map(normalizeEntrega));
      setAllProdutos(prodsData);
      setMovs(movsData);

      setEditingEntrega(null);
      toast.success('Entrega atualizada e estoque sincronizado com sucesso!');
    } catch (err: any) {
      console.error(err);
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
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        
        const entregasRes = await fetch(`${API_URL}/entregas`);
        const entregasData = await entregasRes.json();
        setEntregas(entregasData.map(normalizeEntrega));

        const prodsRes = await fetch(`${API_URL}/produtos?_limit=10000`);
        const prodsData = await prodsRes.json();
        setAllProdutos(prodsData);

        const movsRes = await fetch(`${API_URL}/movimentacoes`);
        const movsData = await movsRes.json();
        setMovs(movsData);

        toast.success('Agendamento criado com sucesso!');
    } catch (err: any) {
        toast.error(err.message);
    }
  }

  const processDeliverySave = (data: any) => {
    if (editingEntrega) {
      updateEntregaFull(editingEntrega.id, data);
    } else {
      addEntrega(data);
    }
  };

  const handleSaveDelivery = (data: any) => {
    let produto = allProdutos.find(p => p.id === data.produtoId);
    if (!produto && data.itemNome) {
        produto = allProdutos.find(p => p.nome.toLowerCase() === data.itemNome.toLowerCase());
    }
      
    if (produto) {
        let estoqueDisponivel = produto.quantidade;
        if (editingEntrega && (editingEntrega.produtoId === produto.id || editingEntrega.itemNome === produto.nome)) {
             estoqueDisponivel += Number(editingEntrega.itemQuantidade);
        }
        
        const qtdSolicitada = Number(String(data.itemQuantidade).replace(',', '.'));

        if (qtdSolicitada > estoqueDisponivel) {
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
          const res = await fetch(`${API_URL}/entregas/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Erro ao excluir');
          }
          
          const entregasRes = await fetch(`${API_URL}/entregas`);
          const entregasData = await entregasRes.json();
          setEntregas(entregasData.map(normalizeEntrega));

          const prodsRes = await fetch(`${API_URL}/produtos?_limit=10000`);
          setAllProdutos(await prodsRes.json());
          
          const movsRes = await fetch(`${API_URL}/movimentacoes`);
          setMovs(await movsRes.json());

          setEntregaToDeleteId(null);
          toast.success('Entrega excluída com sucesso.');
      } catch (err: any) { 
          console.error(err);
          toast.error(err.message);
      }
  }

  async function updateEntregaStatus(id: string, status: string) {
      try {
          await fetch(`${API_URL}/entregas/${id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status })
          });
          setEntregas(prev => prev.map(e => e.id === id ? { ...e, status } : e));
          toast.success(`Status atualizado para ${status}.`);
      } catch (err) { 
          console.error(err);
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
        await Promise.all(selectedEntregaIds.map(id => 
            fetch(`${API_URL}/entregas/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: bulkTargetStatus })
            })
        ));

        const entregasRes = await fetch(`${API_URL}/entregas`);
        const entregasData = await entregasRes.json();
        setEntregas(entregasData.map(normalizeEntrega));

        setSelectedEntregaIds([]);
        setShowBulkConfirmModal(false);
        toast.success(`Entregas marcadas como ${bulkTargetStatus}.`);
    } catch (err) {
        console.error(err);
        toast.error('Ocorreu um erro ao atualizar os status em massa.');
    } finally {
        setLoading(false);
    }
  };
    
  const handleSelectEntrega = (id: string) => {
    setSelectedEntregaIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredDeliveries = useMemo(() => {
    let data = entregas;
    if (rotaDateFilter) {
        data = data.filter(d => {
            const itemDate = new Date(d.dataHoraSolicitacao).toLocaleDateString('en-CA');
            return itemDate === rotaDateFilter;
        });
    }
    return data.sort((a, b) => 
        new Date(a.dataHoraSolicitacao).getTime() - new Date(b.dataHoraSolicitacao).getTime()
    );
  }, [entregas, rotaDateFilter]);

  const handleSelectAllEntregas = (isChecked: boolean) => {
    if (isChecked) {
        const activeIds = filteredDeliveries.map(e => e.id);
        setSelectedEntregaIds(activeIds);
    } else {
        setSelectedEntregaIds([]);
    }
  };

  const handleGenerateDeliveryReport = () => {
    if (selectedEntregaIds.length === 0) {
      toast.error('Selecione ao menos uma entrega para gerar o relatório.');
      return;
    }

    const selectedDeliveries = entregas
      .filter(d => selectedEntregaIds.includes(d.id))
      .filter(d => !isDelivered(d.status)) 
      .sort((a, b) => new Date(a.dataHoraSolicitacao).getTime() - new Date(b.dataHoraSolicitacao).getTime());

    if (selectedDeliveries.length === 0) {
        toast.error("Não existem itens pendentes selecionados para gerar o relatório. Itens já entregues não são incluídos.");
        return;
    }

    const { jsPDF } = window.jspdf || { jsPDF: (window as any).jspdf.jsPDF };
    const doc = new jsPDF('l', 'mm', 'a4');

    const reportDateObj = selectedDeliveries.length > 0 ? new Date(selectedDeliveries[0].dataHoraSolicitacao) : new Date();
    const reportDate = reportDateObj.toLocaleDateString('pt-BR');

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Programação de Caminhões para Entrega de Materiais', 14, 20);
      
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Relatório do Dia: ${reportDate}`, 14, 28);
    doc.setDrawColor(200);
    doc.line(14, 32, doc.internal.pageSize.getWidth() - 14, 32);

    const tableHead = [['Nº', 'Entregue', 'Hora', 'Local da Obra', 'Material', 'Qtd', 'Un', 'Armazem', 'Responsável', 'Telefone']];
    const tableBody = selectedDeliveries.map((d, index) => [
      index + 1,
      '', 
      new Date(d.dataHoraSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      d.localObra,
      d.itemNome || '-',
      d.itemQuantidade,
      d.itemUnidadeMedida || '-',
      d.localArmazenagem || '-', 
      d.responsavelNome || '',
      formatPhoneNumber(d.responsavelTelefone || '')
    ]);

    (doc as any).autoTable({
      head: tableHead,
      body: tableBody,
      startY: 40,
      theme: 'grid', 
      headStyles: { 
          fillColor: [41, 45, 50], 
          textColor: 255,
          fontStyle: 'bold'
      }, 
      styles: {
          fontSize: 9,
          cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
          doc.setDrawColor(150);
          doc.setLineWidth(0.1);
          const cell = data.cell;
          const squareSize = 4;
          const x = cell.x + (cell.width - squareSize) / 2;
          const y = cell.y + (cell.height - squareSize) / 2;
          doc.rect(x, y, squareSize, squareSize);
        }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
      
    let signatureY = finalY + 35;
    if (signatureY + 20 > pageHeight) {
        doc.addPage();
        signatureY = 40;
    }

    doc.setLineWidth(0.3);
    doc.setDrawColor(0); doc.setTextColor(0); doc.setFontSize(10);

    const leftCenterX = pageWidth / 4;        
    const rightCenterX = (pageWidth / 4) * 3;
    const lineLength = 80; 

    doc.line(leftCenterX - (lineLength/2), signatureY, leftCenterX + (lineLength/2), signatureY);
    doc.text('Assinatura do Motorista', leftCenterX, signatureY + 5, { align: 'center' });
      
    doc.line(rightCenterX - (lineLength/2), signatureY, rightCenterX + (lineLength/2), signatureY);
    doc.text('Assinatura do Solicitante', rightCenterX, signatureY + 5, { align: 'center' });

    doc.save(`Programacao-Diaria-${reportDate.replace(/\//g, '-')}.pdf`);
  };

  const handleReprogramDeliveries = async () => {
    if (selectedEntregaIds.length === 0) return;
    if (!newDeliveryDate) {
      toast.error('Escolha uma nova data.');
      return;
    }

    const validIdsToReprogram = selectedEntregaIds.filter(id => {
        const delivery = entregas.find(e => e.id === id);
        return delivery && !isDelivered(delivery.status);
    });

    if (validIdsToReprogram.length === 0) {
        toast.error("Itens marcados como 'Entregue' não podem ser reprogramados. Por favor, selecione apenas itens pendentes ou altere o status antes.");
        setShowReprogramModal(false);
        return;
    }

    try {
        await Promise.all(validIdsToReprogram.map(id => {
            const entrega = entregas.find(e => e.id === id);
            if (!entrega) return Promise.resolve();
            const timePart = entrega.dataHoraSolicitacao.split('T')[1] || '08:00:00';
            const newDateTime = `${newDeliveryDate}T${timePart}`;
              
            return fetch(`${API_URL}/entregas/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ dataHoraSolicitacao: newDateTime })
            });
        }));
        
        toast.success(`${validIdsToReprogram.length} entrega(s) reprogramada(s) com sucesso!`);
        
        setShowReprogramModal(false);
        setNewDeliveryDate('');
        
        const entregasRes = await fetch(`${API_URL}/entregas`);
        const entregasData = await entregasRes.json();
        setEntregas(entregasData.map(normalizeEntrega));

    } catch (e) { 
        console.error(e);
        toast.error('Erro ao reprogramar entregas.');
    }
  };

  // Cálculo dos produtos abaixo do mínimo para o Alerta Visual
  const produtosAbaixoMinimo = useMemo(() => {
    return allProdutos.filter(p => p.estoqueMinimo != null && p.quantidade <= p.estoqueMinimo);
  }, [allProdutos]);

  const categorias = useMemo(() => Array.from(new Set(allProdutos.map((p) => p.categoria || '').filter(Boolean))), [allProdutos]);
  const locaisArmazenamento = useMemo(() => Array.from(new Set(allProdutos.map((p) => p.localArmazenamento || '').filter(Boolean))), [allProdutos]);

  const filteredProdutos = useMemo(() => {
    if (loadingAll) return produtos;
    let result = allProdutos.filter((p) => {
      const query = debouncedQ.trim().toLowerCase();
      const matchesQuery = query === '' || p.nome.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query) || p.categoria?.toLowerCase().includes(query);
      const matchesCategoria = !categoriaFilter || p.categoria === categoriaFilter;
      const matchesAbaixoMin = !mostrarAbaixoMin || (p.estoqueMinimo != null && p.quantidade <= p.estoqueMinimo);
      const matchesPrioritario = !mostrarPrioritarios || p.prioritario;
      return matchesQuery && matchesCategoria && matchesAbaixoMin && matchesPrioritario;
    });

    if (sortOrder) {
      result = [...result].sort((a, b) => sortOrder === 'asc' ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome));
    }
    return result;
  }, [debouncedQ, categoriaFilter, mostrarAbaixoMin, mostrarPrioritarios, allProdutos, produtos, loadingAll, sortOrder]);

  const paginatedProdutos = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredProdutos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProdutos, page]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleToggleSort = () => {
    setSortOrder(current => {
      if (current === null) return 'asc';
      if (current === 'asc') return 'desc';
      return null;
    });
  };

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
        <div className="alert alert-danger shadow-sm border-0 rounded-3 p-4">
            <h4 className="alert-heading mb-3"><i className="bi bi-exclamation-octagon me-2"></i>Erro de Conexão</h4>
            <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      
      <aside className="sidebar">
        <div className="sidebar-logo-area"><img src={meuLogo} alt="Logo" className="sidebar-logo" /></div>
        <nav className="sidebar-nav">
          <button className={`nav-item-clean ${view === 'estoque' ? 'active' : ''}`} onClick={() => { setView('estoque'); scrollTop(); }}><BoxSeam /> Controle de Estoque</button>
          <button className={`nav-item-clean ${view === 'movimentacoes' ? 'active' : ''}`} onClick={() => { setView('movimentacoes'); scrollTop(); }}><ClipboardData /> Movimentações</button>
          <button className={`nav-item-clean ${view === 'rotas' ? 'active' : ''}`} onClick={() => { setView('rotas'); scrollTop(); }}><Truck /> Rotas & Entregas</button>
          <button className={`nav-item-clean ${view === 'entradas_saidas' ? 'active' : ''}`} onClick={() => { setView('entradas_saidas'); scrollTop(); }}><ArrowLeftRight /> Entrada / Saída</button>
        </nav>
      </aside>

      <div className="mobile-header d-lg-none d-flex justify-content-between align-items-center px-3">
        <img src={meuLogo} alt="Logo" style={{height: '32px'}} />
        <div 
          className="position-relative cursor-pointer" 
          onClick={() => setShowLowStockModal(true)}
          style={{ cursor: 'pointer' }}
        >
          <BellFill size={22} className="text-secondary" />
          {produtosAbaixoMinimo.length > 0 && (
            <Badge pill bg="danger" className="position-absolute top-0 start-100 translate-middle border border-light rounded-circle">
              {produtosAbaixoMinimo.length}
            </Badge>
          )}
        </div>
      </div>

      <main className="main-content">
        <header className="page-header d-none d-lg-flex justify-content-between align-items-center">
            <h1 className="page-title m-0">
                {view === 'estoque' && 'Visão Geral do Estoque'}
                {view === 'movimentacoes' && 'Histórico de Movimentações'}
                {view === 'rotas' && 'Cronograma de Entregas'}
                {view === 'entradas_saidas' && 'Lançamento de Entradas e Saídas'}
            </h1>
            
            <div 
              className="position-relative bg-white p-2 rounded-circle shadow-sm border d-flex align-items-center justify-content-center" 
              onClick={() => setShowLowStockModal(true)}
              style={{ cursor: 'pointer', width: '45px', height: '45px' }}
              title="Alertas de Stock"
            >
              <BellFill size={20} className={produtosAbaixoMinimo.length > 0 ? "text-danger" : "text-secondary"} />
              {produtosAbaixoMinimo.length > 0 && (
                <Badge pill bg="danger" className="position-absolute top-0 start-100 translate-middle border border-light rounded-circle">
                  {produtosAbaixoMinimo.length}
                </Badge>
              )}
            </div>
        </header>

        {view === 'estoque' && (
          <div className="animate-fade-in">
            <div className="card-modern">
              <div className="row gy-3 align-items-end">
                <div className="col-12 col-lg-5">
                  <label className="form-label fw-bold text-muted small text-uppercase">Pesquisar Produto</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
                    <input className="form-control border-start-0 ps-0" placeholder={loadingAll ? 'Carregando...' : 'Buscar por nome, SKU ou categoria...'} value={q} onChange={(e) => setQ(e.target.value)} disabled={loadingAll} />
                    {q && <button className="btn btn-light border" onClick={() => setQ('')}><i className="bi bi-x"></i></button>}
                  </div>
                </div>
                
                <div className="col-12 col-md-4 col-lg-3">
                  <label className="form-label fw-bold text-muted small text-uppercase">Filtrar Categoria</label>
                  <select className="form-select" value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)}>
                    <option value="">Todas</option>
                    {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="col-12 col-md-8 col-lg-4">
                  <div className="d-flex gap-3 align-items-center h-100 pb-2">
                    <div className="form-check form-switch">
                      <input className="form-check-input switch-gradient switch-gradient-primary" type="checkbox" id="abaixoMin" checked={mostrarAbaixoMin} onChange={(e) => setMostrarAbaixoMin(e.target.checked)} />
                      <label className="form-check-label small fw-medium" htmlFor="abaixoMin">Abaixo do mín.</label>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input switch-gradient switch-gradient-primary" type="checkbox" id="prioritarios" checked={mostrarPrioritarios} onChange={(e) => setMostrarPrioritarios(e.target.checked)} />
                      <label className="form-check-label small fw-medium" htmlFor="prioritarios">Prioritários</label>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="my-4 text-muted opacity-25" />

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <ValorTotalEstoque allProdutos={allProdutos} />
                <div className="d-flex gap-2">
                  <Relatorios produtos={allProdutos} categoriaSelecionada={categoriaFilter} />
                  <BotaoNovoProduto onCreate={addProduto} categorias={categorias} locais={locaisArmazenamento} />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2 text-muted">Carregando estoque...</p>
              </div>
            ) : (
              <ProdutosTable produtos={paginatedProdutos} onEdit={updateProduto} onDelete={deleteProduto} onAddMov={addMov} onTogglePrioritario={togglePrioritario} categorias={categorias} locais={locaisArmazenamento} sortOrder={sortOrder} onToggleSort={handleToggleSort} />
            )}

            <div className="mt-4 d-flex justify-content-center">
              {!loading && !loadingAll && <Paginacao totalItems={filteredProdutos.length} itemsPerPage={ITEMS_PER_PAGE} currentPage={page} onPageChange={setPage} />}
            </div>

            <div className="mt-5">
                <h6 className="text-uppercase text-muted fw-bold mb-3 small tracking-wider">Últimas Movimentações</h6>
                <div className="card-modern p-0 overflow-hidden">
                    <div className="p-3"><MovsList movs={movs.slice(0, 5)} produtos={allProdutos} /></div>
                </div>
            </div>
          </div>
        )}

        {view === 'movimentacoes' && (
          <div className="card-modern animate-fade-in">
            <ConsultaMovimentacoes movs={movs} produtos={allProdutos} onDelete={deleteMov} onEdit={updateMov} />
          </div>
        )}

        {view === 'rotas' && (
          <div className="animate-fade-in">
            <div className="row g-4">
              <div className="col-lg-4">
                <div className="card-modern h-180">
                    <h5 className="mb-4 fw-bold text-primary">{editingEntrega ? 'Editar Agendamento' : 'Novo Agendamento'}</h5>
                    <DeliveryForm onSave={handleSaveDelivery} produtosDisponiveis={allProdutos} deliveryToEdit={editingEntrega} onCancelEdit={() => setEditingEntrega(null)} historicoEntregas={entregas} />
                </div>
              </div>

              <div className="col-lg-8">
                <div className="d-flex flex-column gap-3 mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <div className="input-group" style={{ maxWidth: '220px' }}>
                                <span className="input-group-text bg-white border-end-0 text-muted"><CalendarWeek /></span>
                                <input type="date" className="form-control border-start-0 ps-0" value={rotaDateFilter} onChange={(e) => setRotaDateFilter(e.target.value)} />
                                {rotaDateFilter && (
                                    <button className="btn btn-outline-secondary border-start-0" onClick={() => setRotaDateFilter('')} title="Limpar data"><XCircle /></button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-4 border d-flex flex-wrap gap-3 justify-content-between align-items-center shadow-sm">
                        <div className="d-flex align-items-center gap-2">
                             <span className="badge bg-light text-dark border me-2">{selectedEntregaIds.length} selecionados</span>
                             <Button variant="outline-success" size="sm" onClick={() => handleBulkStatusChange('Entregue')} disabled={selectedEntregaIds.length === 0}><CheckCircleFill className="me-1" /> Entregue</Button>
                             <Button variant="outline-warning" size="sm" className="text-dark" onClick={() => handleBulkStatusChange('Pendente')} disabled={selectedEntregaIds.length === 0}><ArrowCounterclockwise className="me-1" /> Pendente</Button>
                        </div>
                        
                        <div className="d-flex gap-2">
                             <Button variant="outline-primary" size="sm" disabled={selectedEntregaIds.length === 0} onClick={() => setShowReprogramModal(true)}><CalendarWeek className="me-2"/> Reprogramar</Button>
                             <Button variant="secondary" size="sm" disabled={selectedEntregaIds.length === 0} onClick={handleGenerateDeliveryReport}><ClipboardData className="me-2"/> PDF</Button>
                        </div>
                    </div>
                </div>

                <div className="card-modern p-0 overflow-hidden">
                    <DeliveryTable deliveries={filteredDeliveries} onDelete={(id) => setEntregaToDeleteId(id)} onEdit={(item: any) => { const ent = normalizeEntrega(item); if(!isDelivered(ent.status)) { setEditingEntrega(ent); scrollTop(); } else { toast.error("Itens entregues não podem ser editados."); } }} onStatusChange={updateEntregaStatus} selectedIds={selectedEntregaIds} onSelectItem={handleSelectEntrega} onSelectAll={handleSelectAllEntregas} />
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'entradas_saidas' && (
          <div className="animate-fade-in">
            <EntradaSaidaForm 
              produtos={allProdutos} 
              onSubmit={handleEntradaSaidaSubmit} 
            />
          </div>
        )}
      </main>

      <nav className="bottom-nav">
          <button className={`bottom-nav-item ${view === 'estoque' ? 'active' : ''}`} onClick={() => { setView('estoque'); scrollTop(); }}><BoxSeam /><span>Estoque</span></button>
          <button className={`bottom-nav-item ${view === 'movimentacoes' ? 'active' : ''}`} onClick={() => { setView('movimentacoes'); scrollTop(); }}><ClipboardData /><span>Movs</span></button>
          <button className={`bottom-nav-item ${view === 'entradas_saidas' ? 'active' : ''}`} onClick={() => { setView('entradas_saidas'); scrollTop(); }}><ArrowLeftRight /><span>Fluxo</span></button>
          <button className={`bottom-nav-item ${view === 'rotas' ? 'active' : ''}`} onClick={() => { setView('rotas'); scrollTop(); }}><Truck /><span>Rotas</span></button>
      </nav>

      {showScroll && (
        <button className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center" onClick={scrollTop} style={{ position: 'fixed', bottom: '90px', right: '20px', width: '45px', height: '45px', zIndex: 1000 }}>
          <i className="bi bi-arrow-up fs-4"></i>
        </button>
      )}

      {/* MODAL DE ALERTAS DE STOCK */}
     {showLowStockModal && (
        <ModalComponent title="Alertas de Stock" onClose={() => setShowLowStockModal(false)}>
           <div className="p-2">
              <h6 className="text-muted mb-4">
                Produtos abaixo da quantidade mínima ({produtosAbaixoMinimo.length}):
              </h6>
              {produtosAbaixoMinimo.length === 0 ? (
                <div className="text-center my-5">
                    <CheckCircleFill size={40} className="text-success mb-3" />
                    <p className="text-muted fw-bold">Stock estabilizado!</p>
                    <p className="small text-muted">Não existem materiais em rutura no momento.</p>
                </div>
              ) : (
                <div className="border rounded-3" style={{ maxHeight: '50vh', overflowY: 'auto', overflowX: 'hidden' }}>
                    <ListGroup variant="flush">
                        {produtosAbaixoMinimo.map(p => (
                            <ListGroup.Item key={p.id} className="d-flex justify-content-between align-items-center py-3">
                                <div>
                                    <div className="fw-bold text-dark">{p.nome}</div>
                                    <div className="small text-muted">SKU: {p.sku} | Loc: {p.localArmazenamento || 'N/A'}</div>
                                </div>
                                <div className="text-end">
                                    <Badge bg="danger" className="mb-1 fs-6 px-2 py-1">
                                        {p.quantidade} {p.unidade}
                                    </Badge>
                                    <div className="small text-muted fw-medium">Mín: {p.estoqueMinimo}</div>
                                </div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </div>
              )}
              <div className="mt-4 text-end">
                 <Button variant="secondary" onClick={() => setShowLowStockModal(false)}>Fechar Notificações</Button>
              </div>
           </div>
        </ModalComponent>
      )}

      {/* MODAL DE REPROGRAMAR ENTREGAS */}
      {showReprogramModal && (
        <ModalComponent title="Reprogramar Entregas" onClose={() => setShowReprogramModal(false)}>
            <div className="p-2">
                <p>Reprogramar <strong>{selectedEntregaIds.length}</strong> entrega(s).</p>
                <Form.Group>
                    <Form.Label>Nova Data</Form.Label>
                    <Form.Control type="date" value={newDeliveryDate} onChange={(e) => setNewDeliveryDate(e.target.value)} className="mb-3" />
                </Form.Group>
                <div className="text-end">
                    <Button variant="secondary" onClick={() => setShowReprogramModal(false)} className="me-2">Cancelar</Button>
                    <Button variant="primary" onClick={handleReprogramDeliveries}>Confirmar</Button>
                </div>
            </div>
        </ModalComponent>
      )}

      {/* MODAL DE MUDANÇA EM MASSA */}
      {showBulkConfirmModal && (
        <ModalComponent title="Confirmar Alteração" onClose={() => setShowBulkConfirmModal(false)}>
           <div className="p-3 text-center">
              <ExclamationTriangleFill className="text-warning mb-3" size={40} />
              <p>Marcar <strong>{selectedEntregaIds.length}</strong> item(ns) como <strong>"{bulkTargetStatus}"</strong>?</p>
              <div className="d-flex justify-content-center gap-2 mt-4">
                 <Button variant="secondary" onClick={() => setShowBulkConfirmModal(false)}>Cancelar</Button>
                 <Button variant="primary" onClick={confirmBulkStatusChange}>Confirmar</Button>
              </div>
           </div>
        </ModalComponent>
      )}

      {/* MODAL DE ESTOQUE INSUFICIENTE */}
      {showStockLimitModal && (
        <ModalComponent title="Estoque Insuficiente" onClose={() => setShowStockLimitModal(false)}>
           <div className="p-3 text-center">
              <ExclamationTriangleFill className="text-warning mb-3" size={40} />
              <p>A quantidade solicitada excede o disponível.</p>
              <p className="text-muted small">Deseja forçar o agendamento?</p>
              <div className="d-flex justify-content-center gap-3 mt-4">
                 <Button variant="secondary" onClick={() => setShowStockLimitModal(false)}>Cancelar</Button>
                 <Button variant="danger" onClick={handleConfirmStockOverride}>Confirmar</Button>
              </div>
           </div>
        </ModalComponent>
      )}

      {/* MODAL DE CONFIRMAR EXCLUSÃO */}
      {entregaToDeleteId && (
        <ModalComponent title="Confirmar Exclusão" onClose={() => setEntregaToDeleteId(null)}>
            <p>Deseja excluir esta entrega? O estoque será devolvido.</p>
            <div className="text-end mt-4">
                <button className="btn btn-secondary me-2" onClick={() => setEntregaToDeleteId(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => confirmDeleteEntrega(entregaToDeleteId!)}>Excluir</button>
            </div>
        </ModalComponent>
      )}

      {/* CONTAINER DOS TOASTS (NOTIFICAÇÕES FLUTUANTES) */}
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