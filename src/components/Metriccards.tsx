import type { Produto } from '../types';

interface MetricCardsProps {
  allProdutos: Produto[];
}

export function MetricCards({ allProdutos }: MetricCardsProps) {
  const total = allProdutos.length;

  const abaixoMinimo = allProdutos.filter(
    (p) => p.estoqueMinimo != null && p.quantidade <= p.estoqueMinimo && p.quantidade > 0,
  ).length;

  const criticos = allProdutos.filter(
    (p) => p.estoqueMinimo != null && p.quantidade === 0,
  ).length;

  const emDia = allProdutos.filter(
    (p) => p.estoqueMinimo == null || p.quantidade > p.estoqueMinimo,
  ).length;

  return (
    <div className="metric-cards-row">
      {/* Total de Itens */}
      <div className="metric-card metric-card--total">
        <div>
          <div className="metric-card-label">Total de Itens</div>
          <div className="metric-card-value">{total}</div>
          <div className="metric-card-sub">SKUs cadastrados</div>
        </div>
        <div className="metric-card-icon">
          <i className="bi bi-box-seam"></i>
        </div>
      </div>

      {/* Abaixo do Mínimo */}
      <div className="metric-card metric-card--warning">
        <div>
          <div className="metric-card-label">Abaixo do Mínimo</div>
          <div className="metric-card-value">{abaixoMinimo}</div>
          <div className="metric-card-sub">Requer atenção</div>
        </div>
        <div className="metric-card-icon">
          <i className="bi bi-exclamation-triangle"></i>
        </div>
      </div>

      {/* Críticos */}
      <div className="metric-card metric-card--critical">
        <div>
          <div className="metric-card-label">Críticos</div>
          <div className="metric-card-value">{criticos}</div>
          <div className="metric-card-sub">Estoque zerado/urgente</div>
        </div>
        <div className="metric-card-icon">
          <i className="bi bi-x-circle"></i>
        </div>
      </div>

      {/* Em Dia */}
      <div className="metric-card metric-card--ok">
        <div>
          <div className="metric-card-label">Em Dia</div>
          <div className="metric-card-value">{emDia}</div>
          <div className="metric-card-sub">Estoque normalizado</div>
        </div>
        <div className="metric-card-icon">
          <i className="bi bi-check-circle"></i>
        </div>
      </div>
    </div>
  );
}

/** Barra visual de nível de estoque */
export function StockLevelBar({ produto }: { produto: Produto }) {
  if (produto.estoqueMinimo == null || produto.estoqueMinimo === 0) {
    return (
      <div className="d-flex align-items-center gap-2">
        <span className="stock-dot stock-dot--green"></span>
        <div className="stock-level-bar">
          <div className="stock-level-bar-fill stock-level-bar-fill--green" style={{ width: '100%' }}></div>
        </div>
      </div>
    );
  }

  const ratio = produto.quantidade / produto.estoqueMinimo;
  const pct = Math.min(ratio * 100, 100);

  let colorClass: string;
  let dotClass: string;

  if (produto.quantidade === 0) {
    colorClass = 'stock-level-bar-fill--red';
    dotClass = 'stock-dot--red';
  } else if (ratio <= 1) {
    colorClass = ratio < 0.5 ? 'stock-level-bar-fill--red' : 'stock-level-bar-fill--yellow';
    dotClass = ratio < 0.5 ? 'stock-dot--red' : 'stock-dot--yellow';
  } else {
    colorClass = 'stock-level-bar-fill--green';
    dotClass = 'stock-dot--green';
  }

  return (
    <div className="d-flex align-items-center gap-2">
      <span className={`stock-dot ${dotClass}`}></span>
      <div className="stock-level-bar">
        <div className={`stock-level-bar-fill ${colorClass}`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
}