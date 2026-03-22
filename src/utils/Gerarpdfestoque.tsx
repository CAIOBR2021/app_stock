// src/utils/gerarPdfEstoque.ts
//
// Utilitário isolado de geração de PDF de estoque.
// Não importa nada do React — pode ser chamado de qualquer lugar.
//
// Dependências externas (carregadas via <script> no index.html):
//   - jsPDF   → window.jspdf.jsPDF
//   - jsPDF-AutoTable → side-effect plugin, já registrado em jsPDF

import type { Produto } from '../types';
import { sanitizePdfString } from './pdf';

// ── TIPOS PÚBLICOS ────────────────────────────────────────────────────────────

export type TipoRelatorio = 'completo' | 'critico' | 'prioritarios';

export interface RelatorioFiltros {
  tipo: TipoRelatorio;
  /** String vazia  = todas as categorias */
  categoria: string;
}

export interface GerarPdfResult {
  ok: boolean;
  /** Mensagem amigável quando ok === false (ex: "Nenhum produto encontrado") */
  mensagem?: string;
}

// ── CONSTANTES INTERNAS ───────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoRelatorio, string> = {
  completo:     'Estoque Completo',
  critico:      'Abaixo do Mínimo (Crítico)',
  prioritarios: 'Prioritários',
};

// Paleta interna — tuplas para jsPDF (r, g, b)
type RGB = [number, number, number];

const C = {
  navy:   [26,  34,  56]  as RGB,
  amber:  [245, 166, 35]  as RGB,
  white:  [255, 255, 255] as RGB,
  light:  [244, 246, 249] as RGB,
  border: [218, 224, 232] as RGB,
  text1:  [44,  62,  80]  as RGB,
  text3:  [127, 140, 141] as RGB,
  red:    [192, 57,  43]  as RGB,
  yellow: [230, 126, 34]  as RGB,
  green:  [47,  158, 68]  as RGB,
  redBg:  [255, 235, 232] as RGB,
  yelBg:  [255, 251, 235] as RGB,
  grnBg:  [235, 251, 238] as RGB,
} as const;

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Resolve jsPDF do global injetado pelo index.html. */
function resolveJsPDF(): typeof import('jspdf').jsPDF {
  const w = window as any;
  const ctor = w?.jspdf?.jsPDF ?? w?.jspdf?.default ?? w?.jsPDF;
  if (!ctor) throw new Error('jsPDF não encontrado. Verifique se o script está carregado no index.html.');
  return ctor;
}

/** Formata data em pt-BR por extenso. */
function ptBRDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Formata hora HH:MM. */
function ptBRTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Calcula o percentual de estoque em relação ao mínimo (0–999). */
function calcPct(p: Produto): number {
  if (!p.estoqueMinimo || p.estoqueMinimo === 0) return 999;
  return Math.round((p.quantidade / p.estoqueMinimo) * 100);
}

/** Badge de status do produto. */
function calcStatus(p: Produto): 'OK' | 'ATENÇÃO' | 'URGENTE' | '—' {
  if (!p.estoqueMinimo) return '—';
  if (p.quantidade === 0) return 'URGENTE';
  if (p.quantidade <= p.estoqueMinimo) return 'ATENÇÃO';
  return 'OK';
}

// ── FILTRO ────────────────────────────────────────────────────────────────────

/**
 * Aplica os filtros do modal sobre a lista completa de produtos.
 * Retorna a sub-lista que entrará no PDF.
 */
export function aplicarFiltros(
  todos: Produto[],
  filtros: RelatorioFiltros,
): Produto[] {
  let lista = filtros.categoria
    ? todos.filter((p) => p.categoria === filtros.categoria)
    : [...todos];

  if (filtros.tipo === 'critico') {
    lista = lista.filter(
      (p) => p.estoqueMinimo !== undefined && p.quantidade <= p.estoqueMinimo,
    );
  } else if (filtros.tipo === 'prioritarios') {
    lista = lista.filter((p) => p.prioritario);
  }

  return lista;
}

// ── GERADOR PRINCIPAL ─────────────────────────────────────────────────────────

/**
 * Gera e faz download de um PDF de estoque com base nos filtros fornecidos.
 *
 * @example
 * const result = gerarPdfEstoque(allProdutos, { tipo: 'critico', categoria: 'Ferragens' });
 * if (!result.ok) toast.error(result.mensagem);
 */
export function gerarPdfEstoque(
  todos: Produto[],
  filtros: RelatorioFiltros,
): GerarPdfResult {
  // ── 1. Filtrar ────────────────────────────────────────────────────────────
  const lista = aplicarFiltros(todos, filtros);

  if (lista.length === 0) {
    const scope = filtros.categoria ? `na categoria "${filtros.categoria}"` : '';
    return {
      ok: false,
      mensagem: `Nenhum produto encontrado para "${TIPO_LABELS[filtros.tipo]}"${scope ? ' ' + scope : ''}.`,
    };
  }

  // ── 2. Instanciar jsPDF ───────────────────────────────────────────────────
  let doc: any;
  try {
    const JsPDF = resolveJsPDF();
    doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  } catch (err: any) {
    return { ok: false, mensagem: err.message };
  }

  const pageW: number = doc.internal.pageSize.getWidth();
  const pageH: number = doc.internal.pageSize.getHeight();
  const ML = 14, MR = 14;
  const CW = pageW - ML - MR;

  // ── 3. Datas ──────────────────────────────────────────────────────────────
  const now         = new Date();
  const dataEmissao = ptBRDate(now);
  const horaEmissao = ptBRTime(now);
  const validade    = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const dataValidade = ptBRDate(validade);

  // ── 4. Cabeçalho ──────────────────────────────────────────────────────────
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setFillColor(...C.amber);
  doc.roundedRect(ML, 5, 18, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.white);
  doc.text('P', ML + 9, 17.5, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(...C.white);
  doc.text('Portal de Suprimentos', ML + 22, 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 195, 225);
  doc.text(`Emitido em: ${dataEmissao} às ${horaEmissao}`, pageW - MR, 13, { align: 'right' });
  doc.text(`Válido até: ${dataValidade}`, pageW - MR, 20, { align: 'right' });

  // ── 5. Título ─────────────────────────────────────────────────────────────
  let y = 38;

  const tituloTipo = TIPO_LABELS[filtros.tipo];
  const tituloCategoria = filtros.categoria
    ? ` — ${sanitizePdfString(filtros.categoria)}`
    : '';
  const titulo = `Relatório de Estoque: ${tituloTipo}${tituloCategoria}`;

  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text(titulo, ML, y);
  y += 4;

  doc.setFillColor(...C.amber);
  doc.rect(ML, y, 40, 1.5, 'F');
  y += 8;

  // ── 6. Sumário executivo ──────────────────────────────────────────────────
  const urgentes   = lista.filter((p) => p.quantidade === 0).length;
  const atencao    = lista.filter(
    (p) => p.estoqueMinimo && p.quantidade > 0 && p.quantidade <= p.estoqueMinimo,
  ).length;
  const ok         = lista.filter(
    (p) => !p.estoqueMinimo || p.quantidade > p.estoqueMinimo,
  ).length;

  const resumo = buildResumo(filtros, lista.length, urgentes, dataValidade);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const resumoLines: string[] = doc.splitTextToSize(resumo, CW - 12);
  const resumoLineH = 5;
  const boxH = 8 + 5 + resumoLines.length * resumoLineH + 5;

  doc.setFillColor(...C.light);
  doc.setDrawColor(...C.border);
  doc.roundedRect(ML, y, CW, boxH, 3, 3, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text3);
  doc.text('SUMÁRIO EXECUTIVO', ML + 5, y + 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text1);
  doc.text(resumoLines, ML + 5, y + 14);
  y += boxH + 6;

  // ── 7. KPIs ───────────────────────────────────────────────────────────────
  const kpiGap = 5;
  const kpiW   = (CW - kpiGap * 2) / 3;
  const kpiH   = 26;

  const kpis: Array<{ label: string; value: string; color: RGB }> = [
    { label: 'TOTAL NO RELATÓRIO', value: String(lista.length), color: C.navy   },
    { label: 'ESTOQUE ZERADO',     value: String(urgentes),     color: C.red    },
    { label: 'EM DIA',             value: String(ok),           color: C.green  },
  ];

  // Para relatório crítico, substitui o terceiro KPI por "ATENÇÃO"
  if (filtros.tipo === 'critico') {
    kpis[2] = { label: 'ABAIXO DO MÍNIMO', value: String(atencao), color: C.yellow };
  }

  kpis.forEach(({ label, value, color }, i) => {
    const kx = ML + i * (kpiW + kpiGap);
    doc.setFillColor(...color);
    doc.roundedRect(kx, y, kpiW, kpiH, 3, 3, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(label, kx + kpiW / 2, y + 8, { align: 'center' });
    doc.setFontSize(20);
    doc.text(value, kx + kpiW / 2, y + 20, { align: 'center' });
  });
  y += kpiH + 10;

  // ── 8. Legenda ────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text3);
  doc.text('LEGENDA:', ML, y);

  const legendas: Array<{ cor: RGB; texto: string }> = [
    { cor: C.red,    texto: 'Zerado — compra urgente'              },
    { cor: C.yellow, texto: 'Abaixo do mínimo — programar reposição' },
    { cor: C.green,  texto: 'Em dia'                               },
  ];

  let lx = ML + 22;
  legendas.forEach(({ cor, texto }) => {
    doc.setFillColor(...cor);
    doc.roundedRect(lx, y - 4, 3, 3.5, 0.5, 0.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.text1);
    doc.text(texto, lx + 5, y);
    lx += doc.getTextWidth(texto) + 14;
  });
  y += 8;

  // ── 9. Título da seção ────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.setFillColor(...C.amber);
  doc.rect(ML, y, 3, 6, 'F');
  doc.text('DETALHAMENTO POR ITEM', ML + 6, y + 5);
  y += 10;

  // ── 10. Tabela ────────────────────────────────────────────────────────────
  const colSku      = 22;
  const colCat      = 32;
  const colEstoque  = 28;
  const colMin      = 28;
  const colRepor    = 30;
  const colPct      = 16;
  const colStatus   = 36;
  const colProduto  = CW - (colSku + colCat + colEstoque + colMin + colRepor + colPct + colStatus);

  const tableBody = lista.map((item) => {
    const pct    = calcPct(item);
    const status = calcStatus(item);
    const qtdRepor =
      item.estoqueMinimo && item.quantidade < item.estoqueMinimo
        ? item.estoqueMinimo - item.quantidade
        : 0;

    return [
      sanitizePdfString(item.sku),
      sanitizePdfString(item.nome),
      sanitizePdfString(item.categoria || '—'),
      `${item.quantidade} ${item.unidade}`,
      item.estoqueMinimo ? `${item.estoqueMinimo} ${item.unidade}` : '—',
      qtdRepor > 0 ? `${qtdRepor} ${item.unidade}` : '—',
      pct === 999 ? '—' : `${pct}%`,
      status,
    ];
  });

  (doc as any).autoTable({
    startY: y,
    margin: { left: ML, right: MR },
    tableWidth: CW,
    head: [['SKU', 'Produto', 'Categoria', 'Estoque\nAtual', 'Nível\nCrítico', 'Qtd.\nNecessária', '%', 'Status']],
    body: tableBody,
    headStyles: {
      fillColor: C.navy, textColor: C.white,
      fontStyle: 'bold', fontSize: 8,
      cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
      halign: 'center', minCellHeight: 12,
    },
    bodyStyles: {
      fontSize: 8.5, textColor: C.text1,
      cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
    },
    columnStyles: {
      0: { cellWidth: colSku,     fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: colProduto, overflow: 'linebreak', halign: 'left' },
      2: { cellWidth: colCat,     halign: 'center', overflow: 'linebreak' },
      3: { cellWidth: colEstoque, halign: 'center' },
      4: { cellWidth: colMin,     halign: 'center' },
      5: { cellWidth: colRepor,   halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: colPct,     halign: 'center' },
      7: { cellWidth: colStatus,  halign: 'center', fontStyle: 'bold', fontSize: 8 },
    },
    alternateRowStyles: { fillColor: C.light },
    styles: { lineColor: C.border, lineWidth: 0.2, valign: 'middle' },
    didParseCell: (data: any) => {
      if (data.section !== 'body') return;
      const row = data.row.raw as string[];
      const status = row[7];

      if (status === 'URGENTE') {
        data.cell.styles.fillColor = C.redBg;
        if (data.column.index === 7) {
          data.cell.styles.textColor = C.red;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = C.text1;
        }
      } else if (status === 'ATENÇÃO') {
        data.cell.styles.fillColor = C.yelBg;
        if (data.column.index === 7) {
          data.cell.styles.textColor = C.yellow;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = C.text1;
        }
      } else if (status === 'OK') {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? C.white : C.light;
        if (data.column.index === 7) {
          data.cell.styles.textColor = C.green;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = C.text1;
        }
      } else {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? C.white : C.light;
        data.cell.styles.textColor = C.text3;
      }
    },
  });

  // ── 11. Linhas de assinatura ──────────────────────────────────────────────
  const finalY   = (doc as any).lastAutoTable?.finalY ?? pageH - 40;
  const sigY     = Math.min(finalY + 18, pageH - 35);
  const sigLineW = CW * 0.38;

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.line(ML, sigY, ML + sigLineW, sigY);
  doc.line(pageW - MR - sigLineW, sigY, pageW - MR, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text3);
  doc.text('Aprovação — Gestor de Suprimentos', ML + sigLineW / 2, sigY + 5, { align: 'center' });
  doc.text('Aprovação — Diretoria', pageW - MR - sigLineW / 2, sigY + 5, { align: 'center' });

  // ── 12. Rodapé em todas as páginas ───────────────────────────────────────
  const totalPages: number = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...C.navy);
    doc.rect(0, pageH - 14, pageW, 14, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 195, 225);
    doc.text('Portal de Suprimentos — Documento Confidencial — Uso Interno', ML, pageH - 6);
    doc.setTextColor(...C.amber);
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${i} de ${totalPages}`, pageW - MR, pageH - 6, { align: 'right' });
  }

  // ── 13. Download ──────────────────────────────────────────────────────────
  const slug      = filtros.categoria
    ? filtros.categoria.toLowerCase().replace(/\s+/g, '-')
    : 'geral';
  const tipoSlug  = filtros.tipo;
  const dateSlug  = now.toISOString().slice(0, 10);

  doc.save(`relatorio-${tipoSlug}-${slug}-${dateSlug}.pdf`);

  return { ok: true };
}

// ── HELPER INTERNO: texto do sumário ─────────────────────────────────────────

function buildResumo(
  filtros: RelatorioFiltros,
  total: number,
  urgentes: number,
  dataValidade: string,
): string {
  const scope = filtros.categoria ? ` na categoria "${sanitizePdfString(filtros.categoria)}"` : '';

  const base: Record<TipoRelatorio, string> = {
    completo:
      `Este relatório lista ${total} produto(s) cadastrado(s) no sistema${scope}. ` +
      (urgentes > 0
        ? `${urgentes} item(ns) com estoque zerado requerem compra emergencial. `
        : 'Nenhum item com estoque zerado no momento. ') +
      `Recomenda-se revisão periódica até ${dataValidade}.`,

    critico:
      `Este relatório identifica ${total} item(ns) abaixo do nível crítico de operação${scope}. ` +
      (urgentes > 0
        ? `${urgentes} item(ns) com estoque zerado requerem compra emergencial. `
        : '') +
      `Recomenda-se emissão de ordem de compra até ${dataValidade} para evitar paralisação operacional.`,

    prioritarios:
      `Este relatório lista ${total} produto(s) marcado(s) como prioritário(s)${scope}. ` +
      (urgentes > 0
        ? `${urgentes} item(ns) com estoque zerado requerem atenção imediata. `
        : '') +
      `Verifique o status de cada item e acione os fornecedores responsáveis até ${dataValidade}.`,
  };

  return base[filtros.tipo];
}