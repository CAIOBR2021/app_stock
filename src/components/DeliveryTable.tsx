import { useState, useMemo } from 'react';
import type { Entrega } from '../types';

// ── SVG ICONS ─────────────────────────────────────────────────────────────────

const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11" style={{ marginBottom: '1px' }}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

// ── STATIC STYLES ────────────────────────────────────────────────────────────

const checkboxStyle = { accentColor: 'var(--primary)', width: '15px', height: '15px', cursor: 'pointer' } as const;
const dateStyle = { fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap' } as const;
const timeStyle = { fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' } as const;
const localNameStyle = { fontWeight: 500, fontSize: '13.5px' } as const;
const localSubStyle = { fontSize: '11.5px', color: 'var(--text-3)', marginTop: '1px' } as const;
const productNameStyle = { fontSize: '13.5px' } as const;
const skuStyle = { fontSize: '11px', marginTop: '1px' } as const;
const actionsWrapStyle = { display: 'flex', justifyContent: 'flex-end', gap: '4px' } as const;

const deliveredRowStyle = { background: 'var(--surface-2)', opacity: .75 } as const;
const normalRowStyle = { background: 'transparent', opacity: 1 } as const;

const deliveredBadgeStyle = {
  background: 'var(--surface-3)', color: 'var(--text-3)',
  border: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: '11.5px',
} as const;
const normalBadgeStyle = {
  background: 'var(--surface-2)', color: 'var(--text-1)',
  border: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: '11.5px',
} as const;

const deliveredStatusStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px',
  borderRadius: '999px', fontSize: '11px', fontWeight: 700, letterSpacing: '.3px',
  cursor: 'pointer', userSelect: 'none',
  background: 'var(--success-light)', color: 'var(--success)', border: '1px solid #A3E6B5',
} as const;
const pendingStatusStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px',
  borderRadius: '999px', fontSize: '11px', fontWeight: 700, letterSpacing: '.3px',
  cursor: 'pointer', userSelect: 'none',
  background: 'var(--warning-light)', color: 'var(--primary-dark)', border: '1px solid #FAD898',
} as const;

// ── TYPES ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

interface DeliveryTableProps {
  deliveries: Entrega[];
  onDelete: (id: string) => void;
  onEdit: (entrega: Entrega) => void;
  onStatusChange: (id: string, status: string) => void;
  selectedIdSet: Set<string>;
  onSelectItem: (id: string) => void;
  onSelectAll: (isChecked: boolean) => void;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export function DeliveryTable({
  deliveries,
  onDelete,
  onEdit,
  onStatusChange,
  selectedIdSet,
  onSelectItem,
  onSelectAll,
}: DeliveryTableProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(deliveries.length / PAGE_SIZE);
  const paginatedDeliveries = useMemo(
    () => deliveries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [deliveries, page],
  );

  const isDelivered = (status: string | undefined) =>
    status?.trim().toLowerCase() === 'entregue';

  const isAllSelected =
    paginatedDeliveries.length > 0 && paginatedDeliveries.every(d => selectedIdSet.has(d.id));

  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  if (safePage !== page) setPage(safePage);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ marginBottom: 0 }}>
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center', padding: '12px 16px' }}>
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={e => onSelectAll(e.target.checked)}
                disabled={paginatedDeliveries.length === 0}
                style={checkboxStyle}
              />
            </th>
            <th>Data</th>
            <th>Hora</th>
            <th>Local / Obra</th>
            <th>Produto</th>
            <th style={{ textAlign: 'center' }}>Qtd.</th>
            <th style={{ textAlign: 'center', width: '130px' }}>Status</th>
            <th style={{ textAlign: 'right' }}>Ações</th>
          </tr>
        </thead>

        <tbody>
          {paginatedDeliveries.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)', fontSize: '13.5px' }}>
                Nenhuma entrega encontrada para os filtros atuais.
              </td>
            </tr>
          ) : (
            paginatedDeliveries.map(delivery => {
              const delivered = isDelivered(delivery.status);

              return (
                <tr key={delivery.id} style={delivered ? deliveredRowStyle : normalRowStyle}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIdSet.has(delivery.id)}
                      onChange={() => onSelectItem(delivery.id)}
                      style={checkboxStyle}
                    />
                  </td>

                  <td style={dateStyle}>
                    {new Date(delivery.dataHoraSolicitacao).toLocaleDateString('pt-BR')}
                  </td>

                  <td style={timeStyle}>
                    {new Date(delivery.dataHoraSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>

                  <td>
                    <div style={localNameStyle}>{delivery.localObra}</div>
                    <div style={localSubStyle}>
                      {delivery.localArmazenagem || delivery.localArmazenamento || '—'}
                    </div>
                  </td>

                  <td>
                    <div style={productNameStyle}>{delivery.itemNome || 'Produto não encontrado'}</div>
                    {delivery.sku && (
                      <div className="sku" style={skuStyle}>{delivery.sku}</div>
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span className="badge" style={delivered ? deliveredBadgeStyle : normalBadgeStyle}>
                      {delivery.itemQuantidade} {delivery.itemUnidadeMedida}
                    </span>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span
                      className="status-badge"
                      onClick={() => onStatusChange(delivery.id, delivered ? 'Pendente' : 'Entregue')}
                      title={delivered ? 'Clique para marcar como Pendente' : 'Clique para marcar como Entregue'}
                      style={delivered ? deliveredStatusStyle : pendingStatusStyle}
                    >
                      <IconClock />
                      {delivered ? 'ENTREGUE' : 'PENDENTE'}
                    </span>
                  </td>

                  <td>
                    <div style={actionsWrapStyle}>
                      <button
                        className="act-btn"
                        onClick={() => !delivered && onEdit(delivery)}
                        disabled={delivered}
                        title="Editar"
                        style={{ opacity: delivered ? .3 : 1 }}
                      >
                        <IconEdit />
                      </button>
                      <button
                        className="act-btn del"
                        onClick={() => onDelete(delivery.id)}
                        title="Excluir"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
          <button
            className="btn btn-sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text-2)' }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>
            {page + 1} / {totalPages}
          </span>
          <button
            className="btn btn-sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text-2)' }}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
