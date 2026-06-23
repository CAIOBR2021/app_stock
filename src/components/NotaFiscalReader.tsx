import React, { useState, useRef, useMemo } from 'react';
import type { Produto } from '../types';
import { API_URL, isUnidadeInteira } from '../constants';

// ── TYPES ────────────────────────────────────────────────────────────────────

interface ItemExtraido {
  nome: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  produtoIdMatch?: string;
  confianca: number;
  // Conversão de unidade
  quantidadeOriginal?: number;
  unidadeOriginal?: string;
  fatorConversao?: number;
  conversaoAplicada?: boolean;
}

interface NotaFiscalReaderProps {
  produtos: Produto[];
  onImportar: (dados: {
    tipo: 'entrada';
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
  let best: Produto | null = null;
  let bestScore = 0;

  for (const p of produtos) {
    const pn = normalize(p.nome);
    if (pn === n) return p;

    const tokens = n.split(/\s+/);
    const hits = tokens.filter(t => pn.includes(t)).length;
    const score = hits / Math.max(tokens.length, 1);

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
                background: currentStep > step.num - 1 ? 'linear-gradient(90deg, #667eea, #764ba2)' : 'var(--border)',
                transition: 'background 0.3s',
              }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700,
                background: isComplete ? 'linear-gradient(135deg, #667eea, #764ba2)' : isActive ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'var(--surface-2)',
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

export function NotaFiscalReader({ produtos, onImportar }: NotaFiscalReaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [itensExtraidos, setItensExtraidos] = useState<ItemExtraido[]>([]);
  const [numeroNF, setNumeroNF] = useState('');
  const [ordemCompra, setOrdemCompra] = useState('');
  const [nomeObra, setNomeObra] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [dataCompetencia, setDataCompetencia] = useState(hojeISO());

  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const itensVinculados = useMemo(
    () => itensExtraidos.filter(i => i.produtoIdMatch),
    [itensExtraidos],
  );

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

      const response = await fetch(`${API_URL}/nota-fiscal/ler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error();

      if (data.numeroNF) setNumeroNF(data.numeroNF);
      if (data.ordemCompra) setOrdemCompra(data.ordemCompra);
      if (data.nomeObra) setNomeObra(data.nomeObra);
      if (data.fornecedor) setFornecedor(data.fornecedor);
      if (data.dataEmissao) setDataCompetencia(data.dataEmissao);

      const extraidos: ItemExtraido[] = (data.itens || []).map((item: any) => {
        const match = findBestMatch(item.nome, produtos);
        let parsed: ItemExtraido = {
          nome: item.nome,
          quantidade: Number(item.quantidade) || 0,
          unidade: item.unidade || 'UN',
          valorUnitario: Number(item.valorUnitario) || 0,
          produtoIdMatch: match?.id || undefined,
          confianca: match ? 1 : 0,
        };
        if (match) parsed = aplicarConversao(parsed, match);
        return parsed;
      });

      setItensExtraidos(extraidos);
    } catch (err: any) {
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
          const prod = produtos.find(p => p.id === produtoId);
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

  const handleImportar = () => {
    const itensParaImportar = itensVinculados.map(item => ({
      produtoId: item.produtoIdMatch!,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
    }));

    onImportar({
      tipo: 'entrada',
      ordemCompra: ordemCompra || (numeroNF ? `NF-${numeroNF}` : ''),
      nomeObra: '',
      itens: itensParaImportar,
      dataCompetencia: hojeISO(),
    });

    setFile(null);
    setPreview(null);
    setItensExtraidos([]);
    setNumeroNF('');
    setOrdemCompra('');
    setNomeObra('');
    setFornecedor('');
    setDataCompetencia(hojeISO());
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setItensExtraidos([]);
    setNumeroNF('');
    setOrdemCompra('');
    setNomeObra('');
    setFornecedor('');
    setError(null);
    setDataCompetencia(hojeISO());
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="card-modern" style={{ marginBottom: '20px', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
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
      </div>

      {/* ── Step Indicator ── */}
      <StepIndicator currentStep={currentStep} />

      {/* ── Error ── */}
      {error && (
        <div style={{
          marginBottom: '20px', padding: '14px 18px',
          background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 'var(--radius)',
          fontSize: '13.5px', color: '#991B1B',
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
                  background: dragging ? 'var(--primary-light)' : '#fff',
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
                      background: 'linear-gradient(135deg, rgba(102,126,234,.08), rgba(118,75,162,.08))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#667eea', marginBottom: '16px',
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
                        background: 'linear-gradient(135deg, rgba(102,126,234,.1), rgba(118,75,162,.1))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '20px',
                      }}>
                        <div className="spinner-border" style={{ color: '#667eea', width: '32px', height: '32px' }} role="status" />
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
                        background: 'linear-gradient(135deg, rgba(102,126,234,.08), rgba(118,75,162,.08))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#667eea', marginBottom: '20px',
                      }}>
                        <IconSparkle />
                      </div>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>
                        Pronto para analisar
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 28px', maxWidth: '280px' }}>
                        Irá extrair número da ordem de compra, itens, quantidades e valores unitários.
                      </p>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-secondary" onClick={handleReset} style={{ height: '44px', padding: '0 20px', borderRadius: '10px' }}>
                          Cancelar
                        </button>
                        <button
                          className="btn d-flex align-items-center gap-2"
                          onClick={handleAnalyze}
                          style={{
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
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
          {/* NF Info Cards */}
          <div className="row g-3" style={{ marginBottom: '20px' }}>
            {[
              { label: 'Documento', value: numeroNF, color: '#1971C2', bg: '#EBF4FF', border: '#BFD7FF' },
              { label: 'Ordem de Compra', value: ordemCompra, color: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
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
                    background: itensExtraidos.length - itensVinculados.length > 0 ? 'var(--danger)' : 'var(--border)',
                  }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                    {itensExtraidos.length - itensVinculados.length} sem vínculo
                  </span>
                </div>
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
                  width: `${(itensVinculados.length / itensExtraidos.length) * 100}%`,
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
                  background: item.produtoIdMatch ? 'rgba(47,158,68,.02)' : 'transparent',
                  transition: 'background 200ms',
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
                        }}>
                          {item.nome}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '4px', paddingLeft: '15px' }}>
                        {item.quantidade} {item.unidade} · R$ {item.valorUnitario.toFixed(2)}
                      </div>
                      {item.conversaoAplicada && (
                        <div style={{
                          marginTop: '6px', paddingLeft: '15px', display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          <span style={{
                            fontSize: '10.5px', fontWeight: 600, color: '#1971C2',
                            background: '#EBF4FF', border: '1px solid #BFD7FF',
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
                            ? 'rgba(47,158,68,.04)'
                            : 'var(--surface-1, #fff)',
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
                        onFocus={e => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,.12)'; }}
                        onBlur={e => { e.target.style.borderColor = item.produtoIdMatch ? 'var(--success)' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                      >
                        <option value="">Selecionar produto...</option>
                        {produtos.map(p => (
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

                    {/* Valor Unitário */}
                    <div style={{ flex: '0 0 130px' }}>
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
          {itensExtraidos.some(i => !i.produtoIdMatch) && (
            <div style={{
              marginTop: '16px', padding: '14px 18px',
              background: '#FEF3DC', border: '1px solid #FAD898',
              borderRadius: 'var(--radius)', fontSize: '13px', color: '#9A5A00',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <IconAlert />
              {itensExtraidos.filter(i => !i.produtoIdMatch).length} item(ns) sem vínculo — vincule a um produto cadastrado ou remova para importar.
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
              disabled={itensVinculados.length === 0}
              style={{
                height: '48px', padding: '0 32px', fontSize: '15px', fontWeight: 700,
                borderRadius: '12px', background: 'var(--success)', border: 'none',
                color: '#fff',
                opacity: itensVinculados.length === 0 ? 0.4 : 1,
                cursor: itensVinculados.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: itensVinculados.length > 0 ? '0 4px 14px rgba(47,158,68,.25)' : 'none',
              }}
            >
              <IconCheck />
              Importar {itensVinculados.length} item(ns) como Entrada
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
