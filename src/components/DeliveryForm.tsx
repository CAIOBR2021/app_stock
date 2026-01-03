import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Button, FloatingLabel } from 'react-bootstrap';
import { CalendarEventFill, Save, XCircle } from 'react-bootstrap-icons';

interface DeliveryFormProps {
  onSave: (data: any) => void;
  onCancelEdit?: () => void;
  deliveryToEdit?: any;
  produtosDisponiveis: any[];
}

export function DeliveryForm({ onSave, produtosDisponiveis, onCancelEdit, deliveryToEdit }: DeliveryFormProps) {
  const [formData, setFormData] = useState({
    localArmazenagem: '', localObra: '', produtoId: '', itemNome: '', itemQuantidade: 1, responsavelNome: '', responsavelTelefone: ''
  });
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('08:00');

  useEffect(() => {
    if (deliveryToEdit) {
        const [datePart, timePart] = deliveryToEdit.dataHoraSolicitacao.split('T');
        setData(datePart); setHora(timePart.substring(0, 5));
        setFormData({
            localArmazenagem: deliveryToEdit.localArmazenagem, localObra: deliveryToEdit.localObra,
            produtoId: deliveryToEdit.produtoId, itemNome: deliveryToEdit.itemNome,
            itemQuantidade: deliveryToEdit.itemQuantidade, responsavelNome: deliveryToEdit.responsavelNome || '',
            responsavelTelefone: deliveryToEdit.responsavelTelefone || ''
        });
    }
  }, [deliveryToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let prodId = formData.produtoId;
    if (!prodId) {
        const prod = produtosDisponiveis.find(p => p.nome === formData.itemNome);
        if (prod) prodId = prod.id;
    }
    if (!prodId) { alert("Selecione um produto válido."); return; }
    onSave({ ...formData, produtoId: prodId, dataHoraSolicitacao: `${data}T${hora}:00` });
    if (!deliveryToEdit) setFormData({ localArmazenagem: '', localObra: '', produtoId: '', itemNome: '', itemQuantidade: 1, responsavelNome: '', responsavelTelefone: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, field: string) => {
      setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <Form onSubmit={handleSubmit} className="card-modern border-0 h-100">
      <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
        <div className="bg-primary bg-opacity-10 p-2 rounded me-3 text-primary"><CalendarEventFill size={20} /></div>
        <div><h5 className="fw-bold m-0 text-dark">{deliveryToEdit ? 'Editar Entrega' : 'Nova Entrega'}</h5><small className="text-muted">Dados Logísticos</small></div>
      </div>
      
      <Row className="g-2 mb-3">
        <Col md={6}><FloatingLabel label="Data"><Form.Control type="date" value={data} onChange={(e: any) => setData(e.target.value)} required /></FloatingLabel></Col>
        <Col md={6}><FloatingLabel label="Hora"><Form.Control type="time" value={hora} onChange={(e: any) => setHora(e.target.value)} required /></FloatingLabel></Col>
      </Row>

      <Row className="g-2 mb-3">
        <Col md={8}>
            <FloatingLabel label="Produto">
                <Form.Control type="text" list="produtos-list" value={formData.itemNome} onChange={(e: any) => { const nome = e.target.value; const prod = produtosDisponiveis.find(p => p.nome === nome); setFormData({...formData, itemNome: nome, produtoId: prod ? prod.id : '' }); }} placeholder="Buscar..." required autoComplete="off"/>
                <datalist id="produtos-list">{produtosDisponiveis.map(p => (<option key={p.id} value={p.nome}>Saldo: {p.quantidade} {p.unidade} | SKU: {p.sku}</option>))}</datalist>
            </FloatingLabel>
        </Col>
        <Col md={4}><FloatingLabel label="Qtd."><Form.Control type="number" min="0.01" step="0.01" value={formData.itemQuantidade} onChange={(e: any) => setFormData({...formData, itemQuantidade: Number(e.target.value)})} required /></FloatingLabel></Col>
      </Row>

      <Row className="g-2 mb-3">
          <Col md={6}><FloatingLabel label="Origem"><Form.Control value={formData.localArmazenagem} onChange={(e: any) => handleInputChange(e, 'localArmazenagem')} required list="origens-list" /><datalist id="origens-list"><option value="Almoxarifado Central" /><option value="Pátio 04" /></datalist></FloatingLabel></Col>
          <Col md={6}><FloatingLabel label="Destino"><Form.Control value={formData.localObra} onChange={(e: any) => handleInputChange(e, 'localObra')} required /></FloatingLabel></Col>
      </Row>

      <Row className="g-2 mb-3">
          <Col md={6}><FloatingLabel label="Responsável"><Form.Control value={formData.responsavelNome} onChange={(e: any) => handleInputChange(e, 'responsavelNome')} /></FloatingLabel></Col>
          <Col md={6}><FloatingLabel label="Telefone"><Form.Control value={formData.responsavelTelefone} onChange={(e: any) => handleInputChange(e, 'responsavelTelefone')} /></FloatingLabel></Col>
      </Row>

      <div className="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
        {onCancelEdit && <Button variant="outline-secondary" onClick={onCancelEdit}><XCircle className="me-1"/> Cancelar</Button>}
        <Button type="submit" variant="primary" className="px-4"><Save className="me-2"/> {deliveryToEdit ? 'Salvar' : 'Agendar'}</Button>
      </div>
    </Form>
  );
}