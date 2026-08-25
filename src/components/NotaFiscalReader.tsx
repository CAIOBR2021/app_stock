import React, { useState, useRef, useMemo } from 'react';
import type { Produto } from '../types';
import { API_URL, isUnidadeInteira } from '../constants';
import { isCategoriaEPI } from '../utils';

// ── TYPES ────────────────────────────────────────────────────────────────────

type ModoLeitura = 'entrada' | 'saida';

interface ItemExtraido {
  nome: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  produtoIdMatch?: string;
  confianca: number;
  // Saída: o documento marcou o item como "não dar baixa" (ver saidaMaterialService).
  naoDarBaixa?: boolean;
  // Item entra no lote? Nasce false para os itens "não dar baixa".
  incluir: boolean;
  // Conversão de unidade
  quantidadeOriginal?: number;
  unidadeOriginal?: string;
  fatorConversao?: number;
  conversaoAplicada?: boolean;
}

interface NotaFiscalReaderProps {
  produtos: Produto[];
  perfilUsuario?: string;
  onImportar: (dados: {
    tipo: ModoLeitura;
    ordemCompra: string;
    nomeObra: string;
    itens: { produtoId: string; quantidade: number; valorUnitario: number }[];
    dataCompetencia: string;
  }) => void;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

const hojeISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const normalizeUnidade = (u: string): string => {
  const s = u.toLowerCase().trim().replace(/\./g, '');
  const map: Record<string, string> = {
    'm²': 'm²', 'm2': 'm²', 'metros quadrados': 'm²', 'mts2': 'm²', 'metro quadrado': 'm²',
    'm': 'm', 'mt': 'm', 'mts': 'm', 'metro': 'm', 'metros': 'm',
    'un': 'un', 'und': 'un', 'unid': 'un', 'unidade': 'un', 'unidades': 'un', 'pç': 'un', 'pc': 'un', 'pcs': 'un', 'peça': 'un', 'pecas': 'un',
    'cx': 'cx', 'caixa': 'cx', 'caixas': 'cx',
    'kg': 'kg', 'kilo': 'kg', 'kilos': 'kg', 'quilos': 'kg', 'quilo': 'kg',
    'l': 'L', 'lt': 'L', 'lts': 'L', 'litro': 'L', 'litros': 'L',
    'saco': 'saco', 'sacos': 'saco', 'sc': 'saco',
    'rl': 'rolo', 'rolo': 'rolo', 'rolos': 'rolo',
    'par': 'par', 'pares': 'par',
  };
  return map[s] || s;
};

function aplicarConversao(item: ItemExtraido, produto: Produto): ItemExtraido {
  const unidadeDoc = normalizeUnidade(item.unidade);
  const unidadeProd = normalizeUnidade(produto.unidade);

  if (unidadeDoc === unidadeProd) return item;

  const conversao = produto.conversoes?.find(c => normalizeUnidade(c.unidade) === unidadeDoc);
  if (!conversao || conversao.fator <= 0) return item;

  const qtdConvertida = item.quantidade / conversao.fator;
  return {
    ...item,
    quantidadeOriginal: item.quantidade,
    unidadeOriginal: item.unidade,
    quantidade: isUnidadeInteira(produto.unidade)
      ? Math.round(qtdConvertida)
      : Math.round(qtdConvertida * 100) / 100,
    unidade: produto.unidade,
    fatorConversao: conversao.fator,
    conversaoAplicada: true,
  };
}

function findBestMatch(nome: string, produtos: Produto[]): Produto | null {
  const n = normalize(nome);
  const nTokens = n.split(/\s+/).filter(t => t.length > 1);
  let best: Produto | null = null;
  let bestScore = 0;

  for (const p of produtos) {
    const pn = normalize(p.nome);
    if (pn === n) return p;

    const pTokens = pn.split(/\s+/).filter(t => t.length > 1);

    // Score bidirecional: quantos tokens da NF aparecem no produto E vice-versa
    const hitsNF = nTokens.filter(t => pn.includes(t)).length;
    const hitsProd = pTokens.filter(t => n.includes(t)).length;

    const scoreNF = hitsNF / Math.max(nTokens.length, 1);
    const scoreProd = hitsProd / Math.max(pTokens.length, 1);

    // Usa o maior dos dois scores — resolve nomes longos na NF vs curtos no banco
    const score = Math.max(scoreNF, scoreProd);

    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

// ── SVG ICONS ────────────────────────────────────────────────────────────────

const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconFile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconSparkle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
  </svg>
);

const IconLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconImage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// ── STEP INDICATOR ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'Upload' },
    { num: 2, label: 'Análise' },
    { num: 3, label: 'Revisão' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '32px' }}>
      {steps.map((step, idx) => {
        const isActive = currentStep >= step.num;
        const isComplete = currentStep > step.num;
        return (
          <React.Fragment key={step.num}>
            {idx > 0 && (
              <div style={{
                width: '60px', height: '2px',
                background: currentStep > step.num - 1 ? 'linear-gradient(90deg, var(--chat-1), var(--chat-2))' : 'var(--border)',
                transition: 'background 0.3s',
              }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700,
                background: isComplete ? 'linear-gradient(135deg, var(--chat-1), var(--chat-2))' : isActive ? 'linear-gradient(135deg, var(--chat-1), var(--chat-2))' : 'var(--surface-2)',
                color: isActive ? '#fff' : 'var(--text-3)',
                border: isActive ? 'none' : '2px solid var(--border)',
                transition: 'all 0.3s',
                boxShadow: isActive ? '0 4px 12px rgba(102,126,234,.3)' : 'none',
              }}>
                {isComplete ? <IconCheck /> : step.num}
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 600,
                color: isActive ? 'var(--text-1)' : 'var(--text-3)',
                transition: 'color 0.3s',
              }}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── COMPONENT ────────────────────────────────────────────────────────────────

export function NotaFiscalReader({ produtos, perfilUsuario, onImportar }: NotaFiscalReaderProps) {
  const produtosPermitidos = perfilUsuario === 'seguranca'
    ? produtos.filter(p => isCategoriaEPI(p.categoria))
    : produtos;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modo, setModo] = useState<ModoLeitura>('entrada');
  const isSaida = modo === 'saida';

  const [itensExtraidos, setItensExtraidos] = useState<ItemExtraido[]>([]);
  const [numeroNF, setNumeroNF] = useState('');
  const [ordemCompra, setOrdemCompra] = useState('');
  const [nomeObra, setNomeObra] = useState('');
  const [dataCompetencia, setDataCompetencia] = useState(hojeISO());
  const [totalConferencia, setTotalConferencia] = useState<number | null>(null);

  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const itensVinculados = useMemo(
    () => itensExtraidos.filter(i => i.produtoIdMatch && i.incluir),
    [itensExtraidos],
  );
  const itensSemVinculo = useMemo(
    () => itensExtraidos.filter(i => !i.produtoIdMatch && i.incluir).length,
    [itensExtraidos],
  );
  const itensIgnorados = useMemo(
    () => itensExtraidos.filter(i => !i.incluir).length,
    [itensExtraidos],
  );

  // Conferência da saída: o documento informa a quantidade geral somada; se ela
  // não bater com o que a IA extraiu, algum item veio errado ou faltando.
  const somaExtraida = useMemo(
    () => itensExtraidos.reduce((acc, i) => acc + (i.quantidadeOriginal ?? i.quantidade), 0),
    [itensExtraidos],
  );
  const divergenciaConferencia =
    isSaida && totalConferencia !== null && Math.abs(somaExtraida - totalConferencia) > 0.001;

  // O backend recusa data de competência futura; barra antes de gastar a chamada.
  const dataFutura = dataCompetencia > hojeISO();

  // Na saída a obra é obrigatória: ela é o destino físico registrado na baixa.
  const importDesabilitado =
    itensVinculados.length === 0 || dataFutura || (isSaida && !nomeObra.trim());

  const currentStep = itensExtraidos.length > 0 ? 3 : file ? 2 : 1;

  const handleFile = (f: File) => {
    const valid = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    if (!valid.includes(f.type)) {
      setError('Formato não suportado. Use PNG, JPG, WebP ou PDF.');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('Arquivo muito grande (máx. 20MB).');
      return;
    }
    setFile(f);
    setError(null);
    setItensExtraidos([]);
    setTotalConferencia(null);

    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';

      const endpoint = isSaida ? '/saida-material/ler' : '/nota-fiscal/ler';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error();

      if (isSaida) {
        // Cabeçalho do documento de saída: obra de destino e data da baixa.
        if (data.obraDestino) setNomeObra(data.obraDestino);
        if (data.dataSaida) setDataCompetencia(data.dataSaida);
        setTotalConferencia(
          typeof data.totalConferencia === 'number' ? data.totalConferencia : null,
        );
      } else {
        if (data.numeroNF) setNumeroNF(data.numeroNF);
        if (data.ordemCompra) setOrdemCompra(data.ordemCompra);
        if (data.nomeObra) setNomeObra(data.nomeObra);
        if (data.dataEmissao) setDataCompetencia(data.dataEmissao);
      }

      type ItemNF = {
        nome: string;
        quantidade?: number | string;
        unidade?: string;
        valorUnitario?: number | string;
        naoDarBaixa?: boolean;
      };
      const extraidos: ItemExtraido[] = (data.itens || []).map((item: ItemNF) => {
        const match = findBestMatch(item.nome, produtosPermitidos);
        const naoDarBaixa = item.naoDarBaixa === true;
        let parsed: ItemExtraido = {
          nome: item.nome,
          quantidade: Number(item.quantidade) || 0,
          unidade: item.unidade || 'UN',
          valorUnitario: Number(item.valorUnitario) || 0,
          produtoIdMatch: match?.id || undefined,
          confianca: match ? 1 : 0,
          naoDarBaixa,
          incluir: !naoDarBaixa,
        };
        if (match) parsed = aplicarConversao(parsed, match);
        return parsed;
      });

      setItensExtraidos(extraidos);
    } catch {
      setError('Não conseguimos processar o documento. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  const handleVincular = (index: number, produtoId: string) => {
    setItensExtraidos(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const base: ItemExtraido = item.conversaoAplicada
          ? { ...item, quantidade: item.quantidadeOriginal!, unidade: item.unidadeOriginal!, conversaoAplicada: false, quantidadeOriginal: undefined, unidadeOriginal: undefined, fatorConversao: undefined }
          : item;
        const updated = { ...base, produtoIdMatch: produtoId || undefined, confianca: produtoId ? 1 : 0 };
        if (produtoId) {
          const prod = produtosPermitidos.find(p => p.id === produtoId);
          if (prod) return aplicarConversao(updated, prod);
        }
        return updated;
      }),
    );
  };

  const handleRemoveItem = (index: number) => {
    setItensExtraidos(prev => prev.filter((_, i) => i !== index));
  };

  const handleChangeQtd = (index: number, qtd: number) => {
    if (qtd < 0) return;
    setItensExtraidos(prev =>
      prev.map((item, i) => i === index ? { ...item, quantidade: isUnidadeInteira(item.unidade) ? Math.round(qtd) : qtd } : item),
    );
  };

  const handleChangeValor = (index: number, valor: number) => {
    if (valor < 0) return;
    setItensExtraidos(prev =>
      prev.map((item, i) => i === index ? { ...item, valorUnitario: valor } : item),
    );
  };

  const handleToggleIncluir = (index: number) => {
    setItensExtraidos(prev =>
      prev.map((item, i) => i === index ? { ...item, incluir: !item.incluir } : item),
    );
  };

  const limparEstado = () => {
    setFile(null);
    setPreview(null);
    setItensExtraidos([]);
    setNumeroNF('');
    setOrdemCompra('');
    setNomeObra('');
    setTotalConferencia(null);
    setDataCompetencia(hojeISO());
  };

  const handleImportar = () => {
    const itensParaImportar = itensVinculados.map(item => ({
      produtoId: item.produtoIdMatch!,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
    }));

    onImportar({
      tipo: modo,
      ordemCompra: isSaida ? '' : (ordemCompra || (numeroNF ? `NF-${numeroNF}` : '')),
      nomeObra,
      itens: itensParaImportar,
      dataCompetencia,
    });

    limparEstado();
  };

  const handleReset = () => {
    limparEstado();
    setError(null);
  };

  const handleTrocarModo = (novoModo: ModoLeitura) => {
    if (novoModo === modo) return;
    setModo(novoModo);
    handleReset();
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="card-modern" style={{ marginBottom: '20px', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--chat-1), var(--chat-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              boxShadow: '0 4px 14px rgba(102,126,234,.25)',
            }}>
              <IconSparkle />
            </div>
            <div>
              <h5 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-1)' }}>
                Leitura Inteligente de Documento
              </h5>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-3)' }}>
                Extrai e vincula produtos automaticamente
              </p>
            </div>
          </div>
          {itensExtraidos.length > 0 && (
            <button
              className="btn btn-secondary d-flex align-items-center gap-2"
              onClick={handleReset}
              style={{ fontSize: '13px' }}
            >
              <IconX /> Nova Leitura
            </button>
          )}
        </div>

        {/* ── Alternador Entrada / Saída ── */}
        <div style={{
          display: 'inline-flex', gap: '4px', marginTop: '18px',
          padding: '4px', background: 'var(--surface-2)',
          border: '1px solid var(--border)', borderRadius: '10px',
        }}>
          {([
            { id: 'entrada' as const, label: 'Entrada', hint: 'Nota fiscal, ordem de compra' },
            { id: 'saida' as const, label: 'Saída', hint: 'Saída semanal, romaneio' },
          ]).map(opt => {
            const ativo = modo === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleTrocarModo(opt.id)}
                title={opt.hint}
                style={{
                  border: 'none', cursor: 'pointer',
                  padding: '8px 20px', borderRadius: '7px',
                  fontSize: '13px', fontWeight: 700,
                  background: ativo ? 'var(--surface)' : 'transparent',
                  color: ativo ? 'var(--text-1)' : 'var(--text-3)',
                  boxShadow: ativo ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 180ms',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-3)' }}>
          {isSaida
            ? 'Lê documentos de saída semanal: obra de destino, data da baixa, materiais e quantidades.'
            : 'Lê notas fiscais e ordens de compra: fornecedor, itens, quantidades e valores.'}
        </p>
      </div>

      {/* ── Step Indicator ── */}
      <StepIndicator currentStep={currentStep} />

      {/* ── Error ── */}
      {error && (
        <div style={{
          marginBottom: '20px', padding: '14px 18px',
          background: 'var(--danger-light)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius)',
          fontSize: '13.5px', color: 'var(--danger-text)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <IconAlert /> {error}
        </div>
      )}

      {/* ── Step 1 & 2: Upload + Analyze ── */}
      {!itensExtraidos.length && (
        <div className="row g-4">
          {/* Upload Area */}
          <div className={file ? 'col-lg-6' : 'col-12'}>
            <div className="card-modern" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
              <div style={{
                padding: '12px 20px',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                fontSize: '12px', fontWeight: 700, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '.6px',
              }}>
                Arquivo do Documento
              </div>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  padding: file ? '24px' : '60px 32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragging ? 'var(--primary-light)' : 'var(--surface)',
                  transition: 'all 200ms',
                  borderBottom: dragging ? '3px solid var(--primary)' : '3px solid transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: file ? 'auto' : '280px',
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />

                {file ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        style={{
                          maxHeight: '200px', maxWidth: '100%',
                          borderRadius: '10px', border: '1px solid var(--border)',
                          objectFit: 'contain', boxShadow: 'var(--shadow-sm)',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '80px', height: '80px', borderRadius: '16px',
                        background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-3)',
                      }}>
                        <IconFile />
                      </div>
                    )}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', wordBreak: 'break-all' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
                        {(file.size / 1024).toFixed(0)} KB · Clique para trocar
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      width: '80px', height: '80px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(102,126,234,.12), rgba(118,75,162,.12))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--chat-1)', marginBottom: '16px',
                    }}>
                      <IconUpload />
                    </div>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>
                      Arraste o documento aqui
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 20px', maxWidth: '300px' }}>
                      ou clique para selecionar o arquivo do seu computador
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {['PNG', 'JPG', 'WebP', 'PDF'].map(fmt => (
                        <span key={fmt} style={{
                          fontSize: '10.5px', fontWeight: 700, color: 'var(--text-3)',
                          background: 'var(--surface-2)', border: '1px solid var(--border)',
                          padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase',
                          letterSpacing: '.5px',
                        }}>
                          {fmt}
                        </span>
                      ))}
                      <span style={{
                        fontSize: '10.5px', fontWeight: 600, color: 'var(--text-3)',
                        padding: '3px 6px',
                      }}>
                        Máx. 20MB
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Analyze Panel — appears when file is selected */}
          {file && (
            <div className="col-lg-6">
              <div className="card-modern" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
                <div style={{
                  padding: '12px 20px',
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '12px', fontWeight: 700, color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: '.6px',
                }}>
                  Processamento
                </div>
                <div style={{
                  padding: '40px 32px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', height: 'calc(100% - 45px)',
                }}>
                  {loading ? (
                    <>
                      <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(102,126,234,.14), rgba(118,75,162,.14))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '20px',
                      }}>
                        <div className="spinner-border" style={{ color: 'var(--chat-1)', width: '32px', height: '32px' }} role="status" />
                      </div>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>
                        Analisando...
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0, maxWidth: '280px' }}>
                        Extraindo os dados do seu documento. Isso pode levar alguns segundos.
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(102,126,234,.12), rgba(118,75,162,.12))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--chat-1)', marginBottom: '20px',
                      }}>
                        <IconSparkle />
                      </div>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>
                        Pronto para analisar
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 28px', maxWidth: '280px' }}>
                        {isSaida
                          ? 'Irá extrair a obra de destino, a data da saída, os materiais e as quantidades.'
                          : 'Irá extrair número da ordem de compra, itens, quantidades e valores unitários.'}
                      </p>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-secondary" onClick={handleReset} style={{ height: '44px', padding: '0 20px', borderRadius: '10px' }}>
                          Cancelar
                        </button>
                        <button
                          className="btn d-flex align-items-center gap-2"
                          onClick={handleAnalyze}
                          style={{
                            background: 'linear-gradient(135deg, var(--chat-1), var(--chat-2))',
                            border: 'none', color: '#fff', height: '44px', padding: '0 28px',
                            borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                            boxShadow: '0 4px 14px rgba(102,126,234,.3)',
                          }}
                        >
                          <IconSparkle /> Analisar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Results ── */}
      {itensExtraidos.length > 0 && (
        <>
          {/* Cabeçalho da saída — editável, porque obra e data definem a baixa */}
          {/* Cabeçalho editável — a data lida pela IA precisa ficar visível antes
              de virar movimentação, nos dois modos. */}
          <div className="card-modern" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{
              padding: '12px 20px',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
              fontSize: '12px', fontWeight: 700, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '.6px',
            }}>
              {isSaida ? 'Dados da Saída' : 'Dados da Entrada'}
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 320px', minWidth: '220px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '5px', display: 'block' }}>
                  {isSaida ? 'Obra de destino' : 'Obra'}
                </label>
                <input
                  type="text"
                  value={nomeObra}
                  onChange={e => setNomeObra(e.target.value)}
                  placeholder={isSaida ? 'Ex.: PRO ATIVO - JOSELITA' : 'Opcional'}
                  style={{
                    width: '100%', height: '40px',
                    border: `1.5px solid ${!isSaida || nomeObra ? 'var(--border)' : 'var(--danger)'}`,
                    borderRadius: '8px', padding: '0 12px',
                    fontSize: '13.5px', fontWeight: 600, outline: 'none',
                  }}
                />
              </div>
              {!isSaida && (
                <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '5px', display: 'block' }}>
                    Ordem de compra
                  </label>
                  <input
                    type="text"
                    value={ordemCompra}
                    onChange={e => setOrdemCompra(e.target.value)}
                    placeholder="Opcional"
                    style={{
                      width: '100%', height: '40px',
                      border: '1.5px solid var(--border)', borderRadius: '8px',
                      padding: '0 12px', fontSize: '13.5px', fontWeight: 600, outline: 'none',
                    }}
                  />
                </div>
              )}
              <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '5px', display: 'block' }}>
                  {isSaida ? 'Data da saída' : 'Data de competência'}
                </label>
                <input
                  type="date"
                  value={dataCompetencia}
                  max={hojeISO()}
                  onChange={e => setDataCompetencia(e.target.value)}
                  style={{
                    width: '100%', height: '40px',
                    border: `1.5px solid ${dataFutura ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '0 12px', fontSize: '13.5px', fontWeight: 600,
                    fontFamily: '"DM Mono", monospace', outline: 'none',
                  }}
                />
              </div>
            </div>
            {isSaida && !nomeObra && (
              <div style={{
                padding: '10px 20px', background: 'var(--danger-light)', borderTop: '1px solid var(--danger-border)',
                fontSize: '12.5px', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <IconAlert /> Não identificamos a obra de destino no documento — preencha antes de importar.
              </div>
            )}
            {dataFutura && (
              <div style={{
                padding: '10px 20px', background: 'var(--danger-light)', borderTop: '1px solid var(--danger-border)',
                fontSize: '12.5px', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <IconAlert /> Data no futuro — corrija antes de importar. O saldo é atualizado no ato do lançamento, então uma data futura tira o registro dos relatórios por período.
              </div>
            )}
            {!dataFutura && dataCompetencia < hojeISO() && (
              <div style={{
                padding: '10px 20px', background: 'var(--info-light)', borderTop: '1px solid var(--info-border)',
                fontSize: '12.5px', color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <IconAlert />
                {isSaida
                  ? <span>Saída retroativa: o sistema vai conferir o saldo de cada produto <strong>na data informada</strong>, não o saldo de hoje.</span>
                  : <span>Entrada retroativa: será registrada com a data acima, e não com a data de hoje.</span>}
              </div>
            )}
          </div>

          {!isSaida && numeroNF && (
            <div className="row g-3" style={{ marginBottom: '20px' }}>
              {[
                { label: 'Documento', value: numeroNF, color: 'var(--info)', bg: 'var(--info-light)', border: 'var(--info-border)' },
              ].filter(c => c.value).map((card, idx) => (
                <div className="col-6 col-lg-3" key={idx}>
                  <div style={{
                    background: card.bg, border: `1.5px solid ${card.border}`,
                    borderRadius: 'var(--radius)', padding: '14px 18px',
                  }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: card.color, opacity: 0.7, marginBottom: '4px' }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: card.color, wordBreak: 'break-all' }}>
                      {card.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Conferência contra o total impresso no documento */}
          {divergenciaConferencia && (
            <div style={{
              marginBottom: '20px', padding: '14px 18px',
              background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
              borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--primary-text)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <IconAlert />
              Conferência: o documento informa {totalConferencia} unidade(s) no total, mas foram extraídas {somaExtraida}. Revise os itens antes de importar.
            </div>
          )}

          {/* Summary Bar */}
          <div className="card-modern" style={{ padding: '14px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'var(--success)',
                  }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                    {itensVinculados.length} vinculado(s)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: itensSemVinculo > 0 ? 'var(--danger)' : 'var(--border)',
                  }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                    {itensSemVinculo} sem vínculo
                  </span>
                </div>
                {itensIgnorados > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-text)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                      {itensIgnorados} ignorado(s)
                    </span>
                  </div>
                )}
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                  {itensExtraidos.length} itens extraídos no total
                </span>
              </div>
              <div style={{
                height: '6px', width: '120px', background: 'var(--surface-2)',
                borderRadius: '999px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: '999px',
                  background: 'var(--success)',
                  width: `${(itensVinculados.length / Math.max(itensExtraidos.length - itensIgnorados, 1)) * 100}%`,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="card-modern" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 20px',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
              fontSize: '12px', fontWeight: 700, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '.6px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <IconImage /> Itens Extraídos
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {itensExtraidos.map((item, idx) => (
                <div key={idx} style={{
                  padding: '16px 20px',
                  borderBottom: idx < itensExtraidos.length - 1 ? '1px solid var(--border)' : 'none',
                  background: item.produtoIdMatch && item.incluir ? 'var(--row-success)' : 'transparent',
                  opacity: item.incluir ? 1 : 0.55,
                  transition: 'background 200ms, opacity 200ms',
                }}>
                  {/* Linha 1: Nome do item + botão remover */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <div style={{
                          width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                          background: item.produtoIdMatch ? 'var(--success)' : 'var(--danger)',
                          boxShadow: item.produtoIdMatch ? '0 0 6px rgba(47,158,68,.4)' : '0 0 6px rgba(229,62,62,.3)',
                        }} />
                        <span style={{
                          fontWeight: 600, fontSize: '13.5px', color: 'var(--text-1)',
                          textDecoration: item.incluir ? 'none' : 'line-through',
                        }}>
                          {item.nome}
                        </span>
                        {item.naoDarBaixa && (
                          <span style={{
                            fontSize: '10px', fontWeight: 700, color: 'var(--primary-text)',
                            background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
                            padding: '2px 8px', borderRadius: '6px', flexShrink: 0,
                            textTransform: 'uppercase', letterSpacing: '.3px',
                          }}>
                            Não dar baixa
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '4px', paddingLeft: '15px' }}>
                        {item.quantidade} {item.unidade}
                        {!isSaida && ` · R$ ${item.valorUnitario.toFixed(2)}`}
                      </div>
                      {item.naoDarBaixa && (
                        <label style={{
                          marginTop: '6px', marginLeft: '15px', display: 'inline-flex',
                          alignItems: 'center', gap: '6px', cursor: 'pointer',
                          fontSize: '11.5px', color: 'var(--text-3)', fontWeight: 600,
                        }}>
                          <input
                            type="checkbox"
                            checked={item.incluir}
                            onChange={() => handleToggleIncluir(idx)}
                            style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                          />
                          Dar baixa mesmo assim
                        </label>
                      )}
                      {item.conversaoAplicada && (
                        <div style={{
                          marginTop: '6px', paddingLeft: '15px', display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          <span style={{
                            fontSize: '10.5px', fontWeight: 600, color: 'var(--info)',
                            background: 'var(--info-light)', border: '1px solid var(--info-border)',
                            padding: '2px 8px', borderRadius: '6px',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                            Convertido: {item.quantidadeOriginal} {item.unidadeOriginal} → {item.quantidade} {item.unidade}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                            (1 {item.unidade} = {item.fatorConversao} {item.unidadeOriginal})
                          </span>
                        </div>
                      )}
                    </div>
                    {item.produtoIdMatch ? (
                      <span style={{
                        color: 'var(--success)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'var(--success-light)', flexShrink: 0,
                      }} title="Vinculado">
                        <IconLink />
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-3)', padding: '4px', flexShrink: 0,
                          width: '28px', height: '28px', borderRadius: '50%',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 150ms',
                        }}
                        title="Remover item"
                        onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--danger-light)'; (e.target as HTMLElement).style.color = 'var(--danger)'; }}
                        onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none'; (e.target as HTMLElement).style.color = 'var(--text-3)'; }}
                      >
                        <IconTrash />
                      </button>
                    )}
                  </div>

                  {/* Linha 2: Select + Qtd + Valor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Select produto */}
                    <div style={{ flex: '1 1 280px', minWidth: '200px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '4px', display: 'block' }}>
                        Vincular ao Produto
                      </label>
                      <select
                        style={{
                          width: '100%',
                          fontSize: '12.5px', height: '36px',
                          padding: '0 28px 0 10px',
                          border: `1.5px solid ${item.produtoIdMatch ? 'var(--success)' : 'var(--border)'}`,
                          borderRadius: '8px',
                          background: item.produtoIdMatch
                            ? 'var(--row-success)'
                            : 'var(--surface)',
                          color: item.produtoIdMatch ? 'var(--text-1)' : 'var(--text-3)',
                          fontWeight: item.produtoIdMatch ? 600 : 400,
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 8px center',
                          transition: 'border-color 200ms, background 200ms',
                          outline: 'none',
                        }}
                        value={item.produtoIdMatch || ''}
                        onChange={e => handleVincular(idx, e.target.value)}
                        onFocus={e => { e.target.style.borderColor = 'var(--chat-1)'; e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,.12)'; }}
                        onBlur={e => { e.target.style.borderColor = item.produtoIdMatch ? 'var(--success)' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                      >
                        <option value="">Selecionar produto...</option>
                        {produtosPermitidos.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nome} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantidade */}
                    <div style={{ flex: '0 0 100px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '4px', display: 'block' }}>
                        Qtd.
                      </label>
                      <input
                        type="number" min="0" step={isUnidadeInteira(item.unidade) ? 1 : 'any'}
                        value={item.quantidade}
                        onChange={e => handleChangeQtd(idx, Number(e.target.value))}
                        style={{
                          width: '100%', height: '36px',
                          border: '1.5px solid var(--border)', borderRadius: '8px',
                          padding: '0 8px', fontSize: '13px', textAlign: 'center',
                          fontFamily: '"DM Mono", monospace',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Valor Unitário — só na entrada; na saída o custo vem do estoque */}
                    <div style={{ flex: '0 0 130px', display: isSaida ? 'none' : 'block' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '4px', display: 'block' }}>
                        Valor Unit.
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        <span style={{
                          background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                          borderRight: 'none', borderRadius: '8px 0 0 8px',
                          padding: '0 8px', height: '36px', display: 'flex', alignItems: 'center',
                          fontSize: '11px', color: 'var(--text-3)', fontWeight: 600,
                        }}>
                          R$
                        </span>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.valorUnitario === 0 ? '' : item.valorUnitario}
                          onChange={e => handleChangeValor(idx, Number(e.target.value))}
                          style={{
                            width: '100%', height: '36px',
                            border: '1.5px solid var(--border)', borderLeft: 'none',
                            borderRadius: '0 8px 8px 0', padding: '0 8px',
                            fontSize: '13px', fontFamily: '"DM Mono", monospace',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning for unlinked items */}
          {itensSemVinculo > 0 && (
            <div style={{
              marginTop: '16px', padding: '14px 18px',
              background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
              borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--primary-text)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <IconAlert />
              {itensSemVinculo} item(ns) sem vínculo — vincule a um produto cadastrado ou remova para importar.
            </div>
          )}

          {/* Import Action */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end',
            marginTop: '24px', paddingTop: '20px',
            borderTop: '1px solid var(--border)',
          }}>
            <button
              className="btn d-flex align-items-center gap-2"
              onClick={handleImportar}
              disabled={importDesabilitado}
              style={{
                height: '48px', padding: '0 32px', fontSize: '15px', fontWeight: 700,
                borderRadius: '12px', background: 'var(--success)', border: 'none',
                color: 'var(--on-success)',
                opacity: importDesabilitado ? 0.4 : 1,
                cursor: importDesabilitado ? 'not-allowed' : 'pointer',
                boxShadow: importDesabilitado ? 'none' : '0 4px 14px rgba(47,158,68,.25)',
              }}
            >
              <IconCheck />
              Importar {itensVinculados.length} item(ns) como {isSaida ? 'Saída' : 'Entrada'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── UTIL ─────────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
