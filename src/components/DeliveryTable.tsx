import { PencilSquare, Trash } from 'react-bootstrap-icons';
import { Form } from 'react-bootstrap';

interface Delivery {
    id: string;
    dataHoraSolicitacao: string;
    localArmazenagem: string; 
    localObra: string;
    itemNome?: string;
    itemQuantidade: number;
    itemUnidadeMedida?: string;
    responsavelNome?: string;
    responsavelTelefone?: string;
    status: string;
}

interface DeliveryTableProps {
    deliveries: Delivery[];
    onDelete: (id: string) => void;
    onEdit: (delivery: Delivery) => void;
    onStatusChange: (id: string, status: string) => void;
    selectedIds: string[];
    onSelectItem: (id: string) => void;
    onSelectAll: (checked: boolean) => void;
}

export function DeliveryTable({ deliveries, onDelete, onEdit, onStatusChange, selectedIds, onSelectItem, onSelectAll }: DeliveryTableProps) {
    
    // Converte ISO UTC para hora local do navegador (ex: 11:00 UTC -> 08:00 BRT)
    const formatTime = (isoString: string) => {
        if (!isoString) return '--:--';
        return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    // Converte ISO UTC para data local
    const formatDate = (isoString: string) => {
        if (!isoString) return '--/--';
        return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const formatPhone = (val?: string) => {
        if(!val) return '-';
        return val.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3").replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    };

    const sortedDeliveries = [...deliveries].sort((a, b) => 
        new Date(b.dataHoraSolicitacao).getTime() - new Date(a.dataHoraSolicitacao).getTime()
    );

    const allSelected = deliveries.length > 0 && selectedIds.length === deliveries.length;

    return (
        <div className="table-responsive bg-white rounded shadow-sm">
            <table className="table table-hover align-middle mb-0">
                <thead className="bg-light">
                    <tr>
                        <th style={{width: '40px'}} className="text-center">
                            <Form.Check 
                                type="checkbox" 
                                checked={allSelected}
                                onChange={(e) => onSelectAll(e.target.checked)}
                            />
                        </th>
                        <th>Data</th>
                        <th>Hora</th>
                        <th>Obra / Destino</th>
                        <th>Produto</th>
                        <th>Resp. / Tel</th>
                        <th>Status</th>
                        <th className="text-end">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedDeliveries.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="text-center py-4 text-muted">
                                Nenhuma entrega agendada.
                            </td>
                        </tr>
                    ) : (
                        sortedDeliveries.map(delivery => (
                            <tr key={delivery.id} className={selectedIds.includes(delivery.id) ? 'table-active' : ''}>
                                <td className="text-center">
                                    <Form.Check 
                                        type="checkbox" 
                                        checked={selectedIds.includes(delivery.id)}
                                        onChange={() => onSelectItem(delivery.id)}
                                    />
                                </td>
                                <td>{formatDate(delivery.dataHoraSolicitacao)}</td>
                                <td className="fw-bold text-primary">{formatTime(delivery.dataHoraSolicitacao)}</td>
                                <td>
                                    <div className="fw-bold">{delivery.localObra}</div>
                                    <small className="text-muted">{delivery.localArmazenagem}</small>
                                </td>
                                <td>
                                    <div>{delivery.itemNome}</div>
                                    <small className="text-muted badge bg-light text-dark border">
                                        {delivery.itemQuantidade} {delivery.itemUnidadeMedida}
                                    </small>
                                </td>
                                <td>
                                    <div className="small">{delivery.responsavelNome || '-'}</div>
                                    <div className="small text-muted">{formatPhone(delivery.responsavelTelefone)}</div>
                                </td>
                                <td>
                                    <select 
                                        className={`form-select form-select-sm border-0 fw-bold ${
                                            delivery.status === 'Entregue' ? 'text-success' : 
                                            delivery.status === 'Pendente' ? 'text-warning' : 'text-secondary'
                                        }`}
                                        style={{width: '110px', backgroundColor: 'transparent'}}
                                        value={delivery.status}
                                        onChange={(e) => onStatusChange(delivery.id, e.target.value)}
                                    >
                                        <option value="Pendente">Pendente</option>
                                        <option value="Em Rota">Em Rota</option>
                                        <option value="Entregue">Entregue</option>
                                        <option value="Cancelado">Cancelado</option>
                                    </select>
                                </td>
                                <td className="text-end">
                                    <button 
                                        className="btn btn-sm btn-link text-decoration-none"
                                        onClick={() => onEdit(delivery)}
                                        title="Editar"
                                    >
                                        <PencilSquare />
                                    </button>
                                    <button 
                                        className="btn btn-sm btn-link text-danger text-decoration-none"
                                        onClick={() => onDelete(delivery.id)}
                                        title="Excluir"
                                    >
                                        <Trash />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}