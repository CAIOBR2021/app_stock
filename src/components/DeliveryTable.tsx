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

  // Filtra itens não entregues para o "Selecionar Todos"
  const selectableDeliveries = deliveries.filter(d => d.status !== 'Entregue');
  const isAllSelected = selectableDeliveries.length > 0 && 
                        selectableDeliveries.every(d => selectedIds.includes(d.id));

  return (
    <div className="table-responsive shadow-sm rounded bg-white">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th style={{ width: '40px' }} className="text-center py-3">
              <Form.Check 
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                disabled={selectableDeliveries.length === 0}
              />
            </th>
            <th className="py-3 text-secondary text-uppercase small fw-bold">Data / Hora</th>
            <th className="py-3 text-secondary text-uppercase small fw-bold">Local / Obra</th>
            <th className="py-3 text-secondary text-uppercase small fw-bold">Produto</th>
            <th className="py-3 text-secondary text-uppercase small fw-bold text-center">Qtd.</th>
            <th className="py-3 text-secondary text-uppercase small fw-bold text-center">Status</th>
            <th className="py-3 text-secondary text-uppercase small fw-bold text-end">Ações</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-5 text-muted">
                Nenhuma entrega programada.
              </td>
            </tr>
          ) : (
            deliveries.map((delivery) => {
              const isDelivered = delivery.status === 'Entregue';
              
              // Estilo para linha entregue (mais claro e texto cinza)
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
                  {/* Data e Hora lado a lado ou levemente separadas, mas simples */}
                  <td>
                    <span className="fw-medium">
                        {new Date(delivery.dataHoraSolicitacao).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="ms-2 text-muted small">
                        {new Date(delivery.dataHoraSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex flex-column">
                        <span className="fw-medium">{delivery.localObra}</span>
                        <small className="text-muted">{delivery.localArmazenagem || delivery.localArmazenamento}</small>
                    </div>
                  </td>
                  <td>
                    <span>{delivery.itemNome || 'Produto Indefinido'}</span>
                    {delivery.sku && <span className="text-muted ms-1 small">({delivery.sku})</span>}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${isDelivered ? 'bg-secondary' : 'bg-light text-dark border'}`}>
                      {delivery.itemQuantidade} {delivery.itemUnidadeMedida}
                    </span>
                  </td>
                  <td className="text-center">
                    <select 
                        className={`form-select form-select-sm border-0 fw-bold text-center ${
                            isDelivered ? 'text-success' : 'text-warning'
                        }`}
                        style={{width: 'auto', margin: '0 auto', backgroundColor: 'transparent', cursor: 'pointer'}}
                        value={delivery.status}
                        onChange={(e) => onStatusChange(delivery.id, e.target.value)}
                    >
                        <option value="Pendente">Pendente</option>
                        <option value="Entregue">Entregue</option>
                    </select>
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-2">
                        <button 
                            className="btn btn-sm text-primary p-0 border-0" 
                            onClick={() => onEdit(delivery)}
                            disabled={isDelivered}
                            style={{ opacity: isDelivered ? 0.5 : 1 }}
                            title="Editar"
                        >
                            <PencilSquare size={18} />
                        </button>
                        
                        <button 
                            className="btn btn-sm text-danger p-0 border-0" 
                            onClick={() => onDelete(delivery.id)}
                            title="Excluir"
                        >
                            <Trash size={18} />
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