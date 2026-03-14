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

// ── TYPES ─────────────────────────────────────────────────────────────────────

interface DeliveryTableProps {
  deliveries: Entrega[];
  onDelete: (id: string) => void;
  onEdit: (entrega: Entrega) => void;
  onStatusChange: (id: string, status: string) => void;
  selectedIds: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: (isChecked: boolean) => void;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export function DeliveryTable({
  deliveries,
  onDelete,
  onEdit,
  onStatusChange,
  selectedIds,
  onSelectItem,
  onSelectAll,
}: DeliveryTableProps) {

  const isDelivered = (status: string | undefined) =>
    status?.trim().toLowerCase() === 'entregue';

  const isAllSelected =
    deliveries.length > 0 && deliveries.every(d => selectedIds.includes(d.id));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ marginBottom: 0 }}>
        <thead>
          <tr>
            {/* Checkbox selecionar todos */}
            <th style={{ width: '40px', textAlign: 'center', padding: '12px 16px' }}>
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={e => onSelectAll(e.target.checked)}
                disabled={deliveries.length === 0}
                style={{ accentColor: 'var(--primary)', width: '15px', height: '15px', cursor: 'pointer' }}
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
          {deliveries.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)', fontSize: '13.5px' }}>
                Nenhuma entrega encontrada para os filtros atuais.
              </td>
            </tr>
          ) : (
            deliveries.map(delivery => {
              const delivered = isDelivered(delivery.status);

              return (
                <tr
                  key={delivery.id}
                  style={{ background: delivered ? 'var(--surface-2)' : 'transparent', opacity: delivered ? .75 : 1 }}
                >
                  {/* Checkbox */}
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(delivery.id)}
                      onChange={() => onSelectItem(delivery.id)}
                      style={{ accentColor: 'var(--primary)', width: '15px', height: '15px', cursor: 'pointer' }}
                    />
                  </td>

                  {/* Data */}
                  <td style={{ fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap' }}>
                    {new Date(delivery.dataHoraSolicitacao).toLocaleDateString('pt-BR')}
                  </td>

                  {/* Hora */}
                  <td style={{ fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {new Date(delivery.dataHoraSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>

                  {/* Local */}
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '13.5px' }}>{delivery.localObra}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '1px' }}>
                      {delivery.localArmazenagem || (delivery as any).localArmazenamento || '—'}
                    </div>
                  </td>

                  {/* Produto */}
                  <td>
                    <div style={{ fontSize: '13.5px' }}>{delivery.itemNome || 'Produto não encontrado'}</div>
                    {delivery.sku && (
                      <div className="sku" style={{ fontSize: '11px', marginTop: '1px' }}>{delivery.sku}</div>
                    )}
                  </td>

                  {/* Quantidade */}
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className="badge"
                      style={{
                        background: delivered ? 'var(--surface-3)' : 'var(--surface-2)',
                        color: delivered ? 'var(--text-3)' : 'var(--text-1)',
                        border: '1px solid var(--border)',
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '11.5px',
                      }}
                    >
                      {delivery.itemQuantidade} {delivery.itemUnidadeMedida}
                    </span>
                  </td>

                  {/* Status — clicável */}
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className="status-badge"
                      onClick={() => onStatusChange(delivery.id, delivered ? 'Pendente' : 'Entregue')}
                      title={delivered ? 'Clique para marcar como Pendente' : 'Clique para marcar como Entregue'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '.3px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        background: delivered ? 'var(--success-light)' : 'var(--warning-light)',
                        color:      delivered ? 'var(--success)'       : 'var(--primary-dark)',
                        border: `1px solid ${delivered ? '#A3E6B5' : '#FAD898'}`,
                      }}
                    >
                      <IconClock />
                      {delivered ? 'ENTREGUE' : 'PENDENTE'}
                    </span>
                  </td>

                  {/* Ações */}
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
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
    </div>
  );
}