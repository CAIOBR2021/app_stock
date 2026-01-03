import type { Entrega } from '../App';
import { Form } from 'react-bootstrap';
import { Trash, PencilSquare, Clock, GeoAlt, BoxSeam } from 'react-bootstrap-icons';

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

  // Filtra apenas os itens que PODEM ser selecionados (não entregues)
  // Isto serve para o checkbox "Selecionar Todos"
  const selectableDeliveries = deliveries.filter(d => d.status !== 'Entregue');
  
  // Verifica se todos os itens SELECIONÁVEIS estão selecionados
  const isAllSelected = selectableDeliveries.length > 0 && 
                        selectableDeliveries.every(d => selectedIds.includes(d.id));

  return (
    <div className="table-responsive shadow-sm rounded border-0 bg-white">
      <table className="table table-hover align-middle mb-0">
        <thead className="bg-light">
          <tr>
            <th style={{ width: '50px' }} className="text-center py-3">
              <Form.Check 
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                disabled={selectableDeliveries.length === 0}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th className="py-3 text-muted fw-bold text-uppercase small">Data/Hora</th>
            <th className="py-3 text-muted fw-bold text-uppercase small">Local / Obra</th>
            <th className="py-3 text-muted fw-bold text-uppercase small">Produto</th>
            <th className="py-3 text-muted fw-bold text-uppercase small text-center">Qtd.</th>
            <th className="py-3 text-muted fw-bold text-uppercase small text-center">Status</th>
            <th className="py-3 text-muted fw-bold text-uppercase small text-end">Ações</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-5 text-muted">
                <div className="d-flex flex-column align-items-center">
                    <BoxSeam size={32} className="mb-2 opacity-50"/>
                    <span>Nenhuma entrega programada.</span>
                </div>
              </td>
            </tr>
          ) : (
            deliveries.map((delivery) => {
              const isDelivered = delivery.status === 'Entregue';
              
              return (
                <tr key={delivery.id} className={isDelivered ? 'table-secondary opacity-75' : ''}>
                  <td className="text-center">
                    <Form.Check 
                      type="checkbox"
                      checked={selectedIds.includes(delivery.id)}
                      onChange={() => onSelectItem(delivery.id)}
                      disabled={isDelivered} // BLOQUEIA SE JÁ FOI ENTREGUE
                      style={{ cursor: isDelivered ? 'not-allowed' : 'pointer' }}
                    />
                  </td>
                  <td>
                    <div className="d-flex flex-column">
                      <span className={`fw-bold ${isDelivered ? 'text-decoration-line-through' : 'text-dark'}`}>
                        {new Date(delivery.dataHoraSolicitacao).toLocaleDateString('pt-BR')}
                      </span>
                      <small className="text-muted d-flex align-items-center gap-1">
                        <Clock size={10}/>
                        {new Date(delivery.dataHoraSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex flex-column">
                        <span className={`fw-medium ${isDelivered ? 'text-decoration-line-through' : ''}`}>
                            {delivery.localObra}
                        </span>
                        <small className="text-muted d-flex align-items-center gap-1 text-truncate" style={{maxWidth: '180px'}}>
                            <GeoAlt size={10}/>
                            {delivery.localArmazenagem || delivery.localArmazenamento}
                        </small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex flex-column">
                      <span className={`fw-medium ${isDelivered ? 'text-decoration-line-through' : ''}`}>
                          {delivery.itemNome || 'Produto Indefinido'}
                      </span>
                      <small className="text-muted text-uppercase" style={{fontSize: '0.7rem'}}>
                        SKU: {delivery.sku}
                      </small>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`badge ${isDelivered ? 'bg-secondary' : 'bg-light text-dark border'}`}>
                      {delivery.itemQuantidade} {delivery.itemUnidadeMedida}
                    </span>
                  </td>
                  <td className="text-center">
                    <select 
                        className={`form-select form-select-sm border-0 shadow-none fw-bold text-center ${
                            isDelivered ? 'text-success' : 'text-warning'
                        }`}
                        style={{width: 'auto', margin: '0 auto', background: 'transparent', cursor: 'pointer'}}
                        value={delivery.status}
                        onChange={(e) => onStatusChange(delivery.id, e.target.value)}
                    >
                        <option value="Pendente">Pendente</option>
                        <option value="Entregue">Entregue</option>
                    </select>
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-2">
                        {/* Botão Editar (Desabilita se entregue) */}
                        <button 
                            className="btn btn-icon text-primary" 
                            onClick={() => onEdit(delivery)}
                            disabled={isDelivered}
                            title={isDelivered ? "Item já entregue" : "Editar Entrega"}
                        >
                            <PencilSquare size={16} />
                        </button>
                        
                        {/* Botão Excluir */}
                        <button 
                            className="btn btn-icon text-danger" 
                            onClick={() => onDelete(delivery.id)}
                            title="Excluir Entrega"
                        >
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