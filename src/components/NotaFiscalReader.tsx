import React, { useState, useRef, useMemo } from 'react';
import type { Produto } from '../types';
import { API_URL } from '../constants';

// ── TYPES ────────────────────────────────────────────────────────────────────

interface ItemExtraido {
  nome: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  produtoIdMatch?: string;
  confianca: number;
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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconFile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
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
      if (!response.ok) throw new Error(data.error || `Erro no servidor (${response.status})`);

      if (data.numeroNF) setNumeroNF(data.numeroNF);
      if (data.ordemCompra) setOrdemCompra(data.ordemCompra);
      if (data.nomeObra) setNomeObra(data.nomeObra);
      if (data.fornecedor) setFornecedor(data.fornecedor);
      if (data.dataEmissao) setDataCompetencia(data.dataEmissao);

      const extraidos: ItemExtraido[] = (data.itens || []).map((item: any) => {
        const match = findBestMatch(item.nome, produtos);
        return {
          nome: item.nome,
          quantidade: Number(item.quantidade) || 0,
          unidade: item.unidade || 'UN',
          valorUnitario: Number(item.valorUnitario) || 0,
          produtoIdMatch: match?.id || undefined,
          confianca: match ? 1 : 0,
        };
      });

      setItensExtraidos(extraidos);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar nota fiscal.');
    } finally {
      setLoading(false);
    }
  };

  const handleVincular = (index: number, produtoId: string) => {
    setItensExtraidos(prev =>
      prev.map((item, i) => i === index ? { ...item, produtoIdMatch: produtoId || undefined, confianca: produtoId ? 1 : 0 } : item),
    );
  };

  const handleRemoveItem = (index: number) => {
    setItensExtraidos(prev => prev.filter((_, i) => i !== index));
  };

  const handleChangeQtd = (index: number, qtd: number) => {
    if (qtd < 0) return;
    setItensExtraidos(prev =>
      prev.map((item, i) => i === index ? { ...item, quantidade: qtd } : item),
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
      nomeObra: nomeObra || fornecedor || '',
      itens: itensParaImportar,
      dataCompetencia,
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
    <div className="card-modern">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <IconSparkle />
        </div>
        <div>
          <h5 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>
            Leitura de Nota Fiscal
          </h5>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)' }}>
            OCR + IA (Gemini) — Extrai produtos automaticamente
          </p>
        </div>
      </div>

      {/* ── Upload Area ── */}
      {!itensExtraidos.length && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: '12px',
            padding: file ? '16px' : '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'var(--primary-light)' : 'var(--surface-2)',
            transition: 'all 150ms',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  style={{ maxHeight: '120px', maxWidth: '200px', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'contain' }}
                />
              )}
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-1)' }}>
                  <IconFile /> {file.name}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '4px' }}>
                  {(file.size / 1024).toFixed(0)} KB · Clique para trocar
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ color: 'var(--text-3)', marginBottom: '12px' }}><IconUpload /></div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', margin: '0 0 4px' }}>
                Arraste a nota fiscal aqui
              </p>
              <p style={{ fontSize: '12.5px', color: 'var(--text-3)', margin: 0 }}>
                ou clique para selecionar — PNG, JPG, WebP ou PDF (máx. 20MB)
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ marginTop: '12px', padding: '10px 14px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlert /> {error}
        </div>
      )}

      {/* ── Analyze Button ── */}
      {file && !itensExtraidos.length && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
          <button className="btn btn-secondary" onClick={handleReset}>Cancelar</button>
          <button
            className="btn d-flex align-items-center gap-2"
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none', color: '#fff', height: '42px', padding: '0 24px',
              borderRadius: '999px', fontSize: '14px', fontWeight: 700,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" />
                Analisando com IA...
              </>
            ) : (
              <><IconSparkle /> Analisar Nota Fiscal</>
            )}
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {itensExtraidos.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          {/* NF Info */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {numeroNF && (
              <span style={{ fontSize: '12px', fontWeight: 700, background: '#EBF4FF', color: '#1971C2', padding: '4px 12px', borderRadius: '999px', border: '1px solid #BFD7FF' }}>
                NF: {numeroNF}
              </span>
            )}
            {ordemCompra && (
              <span style={{ fontSize: '12px', fontWeight: 700, background: '#F0FDF4', color: '#166534', padding: '4px 12px', borderRadius: '999px', border: '1px solid #BBF7D0' }}>
                OC: {ordemCompra}
              </span>
            )}
            {nomeObra && (
              <span style={{ fontSize: '12px', fontWeight: 700, background: '#FEF3DC', color: '#9A5A00', padding: '4px 12px', borderRadius: '999px', border: '1px solid #FAD898' }}>
                Obra: {nomeObra}
              </span>
            )}
            {fornecedor && (
              <span style={{ fontSize: '12px', fontWeight: 700, background: 'var(--surface-2)', color: 'var(--text-2)', padding: '4px 12px', borderRadius: '999px', border: '1px solid var(--border)' }}>
                Fornecedor: {fornecedor}
              </span>
            )}
            <span style={{ fontSize: '12px', fontWeight: 700, background: 'var(--success-light)', color: 'var(--success)', padding: '4px 12px', borderRadius: '999px', border: '1px solid var(--success)' }}>
              {itensExtraidos.length} itens encontrados
            </span>
          </div>

          {/* Items Table */}
          <div style={{ border: '1.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--surface-2)', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ flex: 2 }}>Item da NF</span>
              <span style={{ width: '200px' }}>Vincular ao Produto</span>
              <span style={{ width: '80px', textAlign: 'center' }}>Qtd.</span>
              <span style={{ width: '100px', textAlign: 'center' }}>Valor Unit.</span>
              <span style={{ width: '40px' }} />
            </div>

            {itensExtraidos.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 16px',
                  borderTop: '1px solid var(--border)', flexWrap: 'wrap',
                  background: item.produtoIdMatch ? 'rgba(47,158,68,.03)' : 'rgba(229,62,62,.03)',
                }}
              >
                <div style={{ flex: 2, minWidth: '150px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{item.nome}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                    {item.quantidade} {item.unidade} · R$ {item.valorUnitario.toFixed(2)}
                  </div>
                </div>

                <div style={{ width: '200px' }}>
                  <select
                    className="form-select"
                    style={{ fontSize: '12px', height: '32px', padding: '0 8px' }}
                    value={item.produtoIdMatch || ''}
                    onChange={e => handleVincular(idx, e.target.value)}
                  >
                    <option value="">— Não vincular —</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ width: '80px' }}>
                  <input
                    type="number" min="0" step="any"
                    value={item.quantidade}
                    onChange={e => handleChangeQtd(idx, Number(e.target.value))}
                    style={{ width: '100%', height: '32px', border: '1.5px solid var(--border)', borderRadius: '6px', padding: '0 8px', fontSize: '12px', textAlign: 'center', fontFamily: 'DM Mono, monospace' }}
                  />
                </div>

                <div style={{ width: '100px', display: 'flex', alignItems: 'center', gap: 0 }}>
                  <span style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRight: 'none', borderRadius: '6px 0 0 6px', padding: '0 6px', height: '32px', display: 'flex', alignItems: 'center', fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
                    R$
                  </span>
                  <input
                    type="number" min="0" step="0.01"
                    value={item.valorUnitario === 0 ? '' : item.valorUnitario}
                    onChange={e => handleChangeValor(idx, Number(e.target.value))}
                    style={{ width: '100%', height: '32px', border: '1.5px solid var(--border)', borderLeft: 'none', borderRadius: '0 6px 6px 0', padding: '0 6px', fontSize: '12px', fontFamily: 'DM Mono, monospace' }}
                  />
                </div>

                <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                  {item.produtoIdMatch ? (
                    <span style={{ color: 'var(--success)' }} title="Vinculado"><IconLink /></span>
                  ) : (
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px' }}
                      title="Remover item"
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Warning for unlinked items */}
          {itensExtraidos.some(i => !i.produtoIdMatch) && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#FEF3DC', border: '1px solid #FAD898', borderRadius: '8px', fontSize: '12.5px', color: '#9A5A00', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconAlert />
              {itensExtraidos.filter(i => !i.produtoIdMatch).length} item(ns) sem vínculo — vincule a um produto cadastrado ou remova para importar.
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <button className="btn btn-secondary d-flex align-items-center gap-2" onClick={handleReset}>
              <IconX /> Nova Leitura
            </button>

            <button
              className="btn d-flex align-items-center gap-2"
              onClick={handleImportar}
              disabled={itensVinculados.length === 0}
              style={{
                height: '44px', padding: '0 28px', fontSize: '14px', fontWeight: 700,
                borderRadius: '999px', background: 'var(--success)', border: 'none',
                color: '#fff',
                opacity: itensVinculados.length === 0 ? 0.5 : 1,
                cursor: itensVinculados.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <IconCheck />
              Importar {itensVinculados.length} item(ns) como Entrada
            </button>
          </div>
        </div>
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
