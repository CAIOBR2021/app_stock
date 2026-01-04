import type { Entrega } from '../App';
import { Form } from 'react-bootstrap';
import { Trash, PencilSquare } from 'react-bootstrap-icons';

interface DeliveryTableProps {
  deliveries: Entrega[];
  onDelete: (id: string) => void;
  onEdit: (entrega: Entrega) => void;
  onStatusChange: (id: string, status: string) => void;
  selectedIds: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: (isChecked: boolean) => void;
}

export function DeliveryTable({
  deliveries,
  onDelete,
  onEdit,
  onStatusChange,
  selectedIds,
  onSelectItem,
  onSelectAll
}: DeliveryTableProps) {

  const selectableDeliveries = deliveries.filter(d => d.status !== 'Entregue');
  const isAllSelected = selectableDeliveries.length > 0 && 
                        selectableDeliveries.every(d => selectedIds.includes(d.id));

  return (
    <div className="table-responsive shadow-sm rounded bg-white">
      {/* Classe table-sm adicionada para reduzir padding das células */}
      <table className="table table-hover table-sm align-middle mb-0">
        <thead className="table-light">
          <tr>
            {/* Padding vertical reduzido de py-3 para py-2 */}
            <th style={{ width: '40px' }} className="text-center py-2">
              <Form.Check 
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                disabled={selectableDeliveries.length === 0}
              />
            </th>
            <th className="py-2 text-secondary text-uppercase small fw-bold">Data</th>
            <th className="py-2 text-secondary text-uppercase small fw-bold">Hora</th>
            <th className="py-2 text-secondary text-uppercase small fw-bold">Local / Obra</th>
            <th className="py-2 text-secondary text-uppercase small fw-bold">Produto</th>
            <th className="py-2 text-secondary text-uppercase small fw-bold text-center">Qtd.</th>
            <th className="py-2 text-secondary text-uppercase small fw-bold text-center">Status</th>
            <th className="py-2 text-secondary text-uppercase small fw-bold text-end">Ações</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.length === 0 ? (
            <tr>
              {/* Espaçamento reduzido de py-5 para py-4 */}
              <td colSpan={8} className="text-center py-4 text-muted">
                Nenhuma entrega programada.
              </td>
            </tr>
          ) : (
            deliveries.map((delivery) => {
              const isDelivered = delivery.status === 'Entregue';
              const rowClass = isDelivered ? 'bg-light text-muted' : '';

              return (
                <tr key={delivery.id} className={rowClass}>
                  <td className="text-center">
                    <Form.Check 
                      type="checkbox"
                      checked={selectedIds.includes(delivery.id)}
                      onChange={() => onSelectItem(delivery.id)}
                      disabled={isDelivered}
                    />
                  </td>
                  
                  <td className="fw-medium">
                    {new Date(delivery.dataHoraSolicitacao).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    {new Date(delivery.dataHoraSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>

                  <td>
                    <div className="fw-medium">{delivery.localObra}</div>
                    <small className="text-muted" style={{ fontSize: '0.85em' }}>
                        {delivery.localArmazenagem || delivery.localArmazenamento || '-'}
                    </small>
                  </td>

                  <td>
                    <span>{delivery.itemNome || 'Produto não encontrado'}</span>
                    {delivery.sku && <div className="text-muted small" style={{ fontSize: '0.75em' }}>{delivery.sku}</div>}
                  </td>

                  <td className="text-center">
                    <span className={`badge ${isDelivered ? 'bg-secondary' : 'bg-light text-dark border'}`}>
                      {delivery.itemQuantidade} {delivery.itemUnidadeMedida}
                    </span>
                  </td>

                  {/* Largura levemente ajustada para 130px */}
                  <td className="text-center" style={{ width: '130px' }}>
                    <select 
                        className={`form-select form-select-sm border-0 shadow-none fw-bold text-center ${
                            isDelivered ? 'text-success' : 'text-warning'
                        }`}
                        // Paddings zerados no style inline para evitar altura excessiva
                        style={{ 
                          width: 'auto', 
                          margin: '0 auto', 
                          backgroundColor: 'transparent', 
                          cursor: 'pointer',
                          paddingTop: 0,
                          paddingBottom: 0
                        }}
                        value={delivery.status}
                        onChange={(e) => onStatusChange(delivery.id, e.target.value)}
                    >
                        <option value="Pendente" className="text-dark">Pendente</option>
                        <option value="Entregue" className="text-dark">Entregue</option>
                    </select>
                  </td>

                  <td className="text-end">
                    {/* Gap reduzido para 1 */}
                    <div className="d-flex justify-content-end gap-1">
                        <button 
                            className="btn btn-sm btn-link text-decoration-none p-0" 
                            onClick={() => onEdit(delivery)}
                            disabled={isDelivered}
                            style={{ opacity: isDelivered ? 0.5 : 1 }}
                            title="Editar"
                        >
                            {/* Ícone reduzido para 16px */}
                            <PencilSquare size={16} />
                        </button>
                        
                        <button 
                            className="btn btn-sm btn-link text-danger text-decoration-none p-0" 
                            onClick={() => onDelete(delivery.id)}
                            title="Excluir"
                        >
                            {/* Ícone reduzido para 16px */}
                            <Trash size={16} />
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