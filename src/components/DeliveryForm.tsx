import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Button, FloatingLabel } from 'react-bootstrap';
import { CalendarEventFill, Save, XCircle } from 'react-bootstrap-icons';
// Se tiver problemas com importação de tipos do App, defina localmente ou importe se exportado
// import type { Entrega } from '../App'; 

interface DeliveryFormProps {
  onSave: (data: any) => void;
  onCancelEdit?: () => void;
  deliveryToEdit?: any;
  produtosDisponiveis: any[];
}

export function DeliveryForm({ onSave, produtosDisponiveis, onCancelEdit, deliveryToEdit }: DeliveryFormProps) {
  const [formData, setFormData] = useState({
    localArmazenagem: '',
    localObra: '',
    produtoId: '',
    itemNome: '',
    itemQuantidade: 1,
    responsavelNome: '',
    responsavelTelefone: ''
  });
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('08:00');

  useEffect(() => {
    if (deliveryToEdit) {
        const [datePart, timePart] = deliveryToEdit.dataHoraSolicitacao.split('T');
        setData(datePart);
        setHora(timePart.substring(0, 5));
        setFormData({
            localArmazenagem: deliveryToEdit.localArmazenagem,
            localObra: deliveryToEdit.localObra,
            produtoId: deliveryToEdit.produtoId,
            itemNome: deliveryToEdit.itemNome,
            itemQuantidade: deliveryToEdit.itemQuantidade,
            responsavelNome: deliveryToEdit.responsavelNome || '',
            responsavelTelefone: deliveryToEdit.responsavelTelefone || ''
        });
    }
  }, [deliveryToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let prodId = formData.produtoId;
    
    // Tenta encontrar pelo nome caso o usuario tenha digitado
    if (!prodId) {
        const prod = produtosDisponiveis.find(p => p.nome === formData.itemNome);
        if (prod) {
            prodId = prod.id;
        }
    }

    // Validação
    if (!prodId) {
        alert("Por favor, selecione um produto válido da lista de estoque.");
        return;
    }
    
    onSave({
        ...formData,
        produtoId: prodId,
        dataHoraSolicitacao: `${data}T${hora}:00`
    });
    
    // Limpa form se não for edição
    if (!deliveryToEdit) {
        setFormData({ 
            localArmazenagem: '',
            localObra: '',
            produtoId: '',
            itemNome: '',
            itemQuantidade: 1,
            responsavelNome: '',
            responsavelTelefone: ''
        });
    }
  };

  // Tipagem explícita para resolver o erro "Parameter 'e' implicitly has an 'any' type"
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, field: string) => {
      setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <Form onSubmit={handleSubmit} className="p-4 border rounded bg-white shadow-sm">
      <h5 className="mb-3 border-bottom pb-2 text-primary">
        <CalendarEventFill className="me-2" />
        {deliveryToEdit ? 'Editar Entrega' : 'Agendar Nova Entrega'}
      </h5>
      
      <Row className="g-2 mb-3">
        <Col md={6}>
            <FloatingLabel label="Data">
                <Form.Control 
                    type="date" 
                    value={data} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData(e.target.value)} 
                    required 
                />
            </FloatingLabel>
        </Col>
        <Col md={6}>
            <FloatingLabel label="Hora">
                <Form.Control 
                    type="time" 
                    value={hora} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHora(e.target.value)} 
                    required 
                />
            </FloatingLabel>
        </Col>
      </Row>

      <Row className="g-2 mb-3">
        <Col md={8}>
            <FloatingLabel label="Produto (Busca no Estoque)">
                <Form.Control 
                    type="text" 
                    list="produtos-list" 
                    value={formData.itemNome}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const nome = e.target.value;
                        const prod = produtosDisponiveis.find(p => p.nome === nome);
                        setFormData({
                            ...formData, 
                            itemNome: nome, 
                            produtoId: prod ? prod.id : '' 
                        });
                    }}
                    placeholder="Digite para buscar..." 
                    required
                    autoComplete="off"
                />
                <datalist id="produtos-list">
                    {produtosDisponiveis.map(p => (
                        <option key={p.id} value={p.nome}>
                            Saldo: {p.quantidade} {p.unidade} | SKU: {p.sku}
                        </option>
                    ))}
                </datalist>
            </FloatingLabel>
        </Col>
        <Col md={4}>
            <FloatingLabel label="Quantidade">
                <Form.Control 
                    type="number" 
                    min="0.01" 
                    step="0.01"
                    value={formData.itemQuantidade} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, itemQuantidade: Number(e.target.value)})}
                    required
                />
            </FloatingLabel>
        </Col>
      </Row>

      <Row className="g-2 mb-3">
          <Col md={6}>
            <FloatingLabel label="Origem (Armazém)">
                <Form.Control 
                    value={formData.localArmazenagem} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'localArmazenagem')} 
                    required 
                    list="origens-list"
                />
                <datalist id="origens-list">
                    <option value="Almoxarifado Central" />
                    <option value="Pátio 04" />
                </datalist>
            </FloatingLabel>
          </Col>
          <Col md={6}>
            <FloatingLabel label="Destino (Obra/Local)">
                <Form.Control 
                    value={formData.localObra} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'localObra')} 
                    required 
                />
            </FloatingLabel>
          </Col>
      </Row>

      <Row className="g-2 mb-3">
          <Col md={6}>
            <FloatingLabel label="Responsável">
                <Form.Control 
                    value={formData.responsavelNome} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'responsavelNome')} 
                />
            </FloatingLabel>
          </Col>
          <Col md={6}>
            <FloatingLabel label="Telefone">
                <Form.Control 
                    value={formData.responsavelTelefone} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'responsavelTelefone')} 
                />
            </FloatingLabel>
          </Col>
      </Row>

      <div className="d-flex justify-content-end gap-2">
        {onCancelEdit && (
            <Button variant="outline-secondary" onClick={onCancelEdit}>
                <XCircle className="me-1"/> Cancelar
            </Button>
        )}
        <Button type="submit" variant="primary">
            <Save className="me-1"/> {deliveryToEdit ? 'Salvar Alterações' : 'Agendar'}
        </Button>
      </div>
    </Form>
  );
}