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

  // Função auxiliar robusta para verificar status
  const isDelivered = (status: string | undefined) => {
    return status?.trim().toLowerCase() === 'entregue';
  };

  // Filtra itens selecionáveis (ignora entregues)
  const selectableDeliveries = deliveries.filter(d => !isDelivered(d.status));
  const isAllSelected = selectableDeliveries.length > 0 && 
                        selectableDeliveries.every(d => selectedIds.includes(d.id));

  return (
    <div className="table-responsive shadow-sm rounded bg-white">
      {/* Estilo para garantir ocultação na impressão do navegador */}
      <style>
        {`
          @media print {
            .print-hidden { display: none !important; }
          }
        `}
      </style>

      <table className="table table-hover table-sm align-middle mb-0">
        <thead className="table-light">
          <tr>
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
              <td colSpan={8} className="text-center py-4 text-muted">
                Nenhuma entrega programada.
              </td>
            </tr>
          ) : (
            deliveries.map((delivery) => {
              const delivered = isDelivered(delivery.status);
              
              // Se estiver entregue:
              // - print-hidden: some na impressão
              // - d-print-none: classe bootstrap auxiliar
              // - opacity-50: visual desabilitado na tela
              const rowClass = delivered 
                ? 'bg-light text-muted opacity-50 d-print-none print-hidden' 
                : '';

              return (
                <tr key={delivery.id} className={rowClass}>
                  <td className="text-center">
                    <Form.Check 
                      type="checkbox"
                      checked={selectedIds.includes(delivery.id)}
                      onChange={() => onSelectItem(delivery.id)}
                      disabled={delivered} 
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
                    <span className={`badge ${delivered ? 'bg-secondary' : 'bg-light text-dark border'}`}>
                      {delivery.itemQuantidade} {delivery.itemUnidadeMedida}
                    </span>
                  </td>

                  <td className="text-center" style={{ width: '130px' }}>
                    <select 
                        className={`form-select form-select-sm border-0 shadow-none fw-bold text-center ${
                            delivered ? 'text-success' : 'text-warning'
                        }`}
                        style={{ 
                          width: 'auto', 
                          margin: '0 auto', 
                          backgroundColor: 'transparent', 
                          cursor: delivered ? 'default' : 'pointer',
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
                    <div className="d-flex justify-content-end gap-1">
                        {/* Se estiver entregue, o botão de editar NÃO é renderizado */}
                        {!delivered && (
                          <button 
                              className="btn btn-sm btn-link text-decoration-none p-0" 
                              onClick={() => onEdit(delivery)}
                              title="Editar"
                          >
                              <PencilSquare size={16} />
                          </button>
                        )}
                        
                        {/* Se preferir bloquear o excluir também, envolva com !delivered && (...) */}
                        <button 
                            className="btn btn-sm btn-link text-danger text-decoration-none p-0" 
                            onClick={() => onDelete(delivery.id)}
                            title="Excluir"
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