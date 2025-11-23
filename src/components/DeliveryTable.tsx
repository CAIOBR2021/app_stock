import React from 'react';
import { Table, Button, Form } from 'react-bootstrap';
import { PencilSquare, Trash, CheckCircle, Clock, Truck } from 'react-bootstrap-icons';

interface DeliveryTableProps {
  deliveries: any[];
  onDelete: (id: string) => void;
  onEdit: (d: any) => void;
  onStatusChange: (id: string, s: string) => void;
  // Novas props para seleção
  selectedIds: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
}

export const DeliveryTable: React.FC<DeliveryTableProps> = ({ 
  deliveries, 
  onDelete, 
  onEdit, 
  onStatusChange,
  selectedIds,
  onSelectItem,
  onSelectAll
}) => {
  // Verifica se todos os itens visíveis estão selecionados
  const allSelected = deliveries.length > 0 && deliveries.every(d => selectedIds.includes(d.id));

  return (
    <div className="card-modern p-0 overflow-hidden">
      <div className="table-responsive">
        <Table className="table-modern mb-0">
          <thead>
            <tr>
              <th style={{width: '40px'}} className="text-center">
                <Form.Check 
                  type="checkbox" 
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </th>
              <th>Status</th>
              <th>Data</th>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Destino</th>
              <th>Resp.</th>
              <th className="text-end">Ações</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length > 0 ? deliveries.map(d => (
                <tr key={d.id} className={selectedIds.includes(d.id) ? 'table-active' : ''}>
                    <td className="text-center">
                        <Form.Check 
                          type="checkbox" 
                          checked={selectedIds.includes(d.id)}
                          onChange={() => onSelectItem(d.id)}
                        />
                    </td>
                    <td>
                        <span 
                            className={`badge ${d.status === 'Entregue' ? 'bg-success' : 'bg-warning text-dark'}`} 
                            style={{cursor: 'pointer'}}
                            onClick={() => onStatusChange(d.id, d.status === 'Entregue' ? 'Pendente' : 'Entregue')}
                        >
                            {d.status === 'Entregue' ? <CheckCircle className="me-1"/> : <Clock className="me-1"/>}
                            {d.status}
                        </span>
                    </td>
                    <td>
                        {new Date(d.dataHoraSolicitacao).toLocaleDateString()} 
                        <br/>
                        <small className="text-muted">{new Date(d.dataHoraSolicitacao).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                    </td>
                    <td>
                        <div className="fw-bold text-primary">{d.itemNome}</div>
                        <small className="text-muted">{d.sku}</small>
                    </td>
                    <td className="fw-bold">{d.itemQuantidade} {d.itemUnidadeMedida}</td>
                    <td>
                        <div className="d-flex align-items-center">
                            <Truck className="text-secondary me-2" size={14} />
                            {d.localObra}
                        </div>
                    </td>
                    <td>
                        <div>{d.responsavelNome}</div>
                        <small className="text-muted">{d.responsavelTelefone}</small>
                    </td>
                    <td className="text-end">
                        <Button variant="link" className="text-secondary p-0 me-3" onClick={() => onEdit(d)}><PencilSquare/></Button>
                        <Button variant="link" className="text-danger p-0" onClick={() => onDelete(d.id)}><Trash/></Button>
                    </td>
                </tr>
            )) : (
                <tr><td colSpan={8} className="text-center py-5 text-muted">Nenhuma entrega registrada.</td></tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};