import React, { useState, useEffect, useMemo } from 'react';
import { Form, Row, Col, Button, FloatingLabel } from 'react-bootstrap';
import { CalendarEventFill, Save, XCircle } from 'react-bootstrap-icons';
import Select from 'react-select';

// Interface para as propriedades recebidas
interface DeliveryFormProps {
  onSave: (data: any) => void;
  onCancelEdit?: () => void;
  deliveryToEdit?: any;
  produtosDisponiveis: any[];
}

export function DeliveryForm({ onSave, produtosDisponiveis, onCancelEdit, deliveryToEdit }: DeliveryFormProps) {
  // Estado do formulário
  const [formData, setFormData] = useState({
    localArmazenagem: '',
    localObra: '',
    produtoId: '',
    itemNome: '',
    itemQuantidade: 1,
    responsavelNome: '',
    responsavelTelefone: ''
  });
  
  // Estados para data e hora
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('08:00');

  // Estado para controlar a seleção do React-Select
  const [selectedOption, setSelectedOption] = useState<any>(null);

  // Prepara as opções para o React-Select baseado na lista de produtos
  const options = useMemo(() => {
    return produtosDisponiveis.map(p => ({
      value: p.id,
      label: `${p.nome} (Saldo: ${p.quantidade} ${p.unidade} | SKU: ${p.sku})`,
      nomeProduto: p.nome, // Guardamos o nome puro para salvar no histórico se precisar
      unidade: p.unidade,
      quantidade: p.quantidade
    }));
  }, [produtosDisponiveis]);

  // Carrega os dados se for edição
  useEffect(() => {
    if (deliveryToEdit) {
        const [datePart, timePart] = deliveryToEdit.dataHoraSolicitacao.split('T');
        setData(datePart);
        setHora(timePart ? timePart.substring(0, 5) : '08:00');
        
        setFormData({
            localArmazenagem: deliveryToEdit.localArmazenagem || '',
            localObra: deliveryToEdit.localObra || '',
            produtoId: deliveryToEdit.produtoId,
            itemNome: deliveryToEdit.itemNome || '',
            itemQuantidade: deliveryToEdit.itemQuantidade,
            responsavelNome: deliveryToEdit.responsavelNome || '',
            responsavelTelefone: deliveryToEdit.responsavelTelefone || ''
        });

        // Encontra e define a opção selecionada no Select
        const foundOption = options.find(opt => opt.value === deliveryToEdit.produtoId);
        setSelectedOption(foundOption || null);
    }
  }, [deliveryToEdit, options]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação: Garante que um produto foi selecionado via Select
    if (!formData.produtoId || !selectedOption) {
        alert("Por favor, selecione um produto da lista.");
        return;
    }

    // Validação extra de estoque (opcional, mas recomendada)
    if (selectedOption.quantidade < formData.itemQuantidade) {
       if(!window.confirm(`Atenção: A quantidade solicitada (${formData.itemQuantidade}) é maior que o saldo atual (${selectedOption.quantidade}). Deseja continuar e deixar o estoque negativo?`)) {
           return;
       }
    }
    
    onSave({
        ...formData,
        produtoId: selectedOption.value, // Garante que o ID vem do objeto selecionado
        itemNome: selectedOption.nomeProduto,
        dataHoraSolicitacao: `${data}T${hora}:00`
    });
    
    // Limpa o formulário se for uma nova entrega
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
        setSelectedOption(null);
        // Mantém a data atual por conveniência
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, field: string) => {
      setFormData({ ...formData, [field]: e.target.value });
  };

  // Manipulador de mudança específico para o React-Select
  const handleSelectChange = (option: any) => {
      setSelectedOption(option);
      if (option) {
          setFormData({
              ...formData,
              produtoId: option.value,
              itemNome: option.nomeProduto
          });
      } else {
          setFormData({
              ...formData,
              produtoId: '',
              itemNome: ''
          });
      }
  };

  return (
    <Form onSubmit={handleSubmit} className="p-4 border rounded bg-white shadow-sm h-100 d-flex flex-column">
      <h5 className="mb-3 border-bottom pb-2 text-primary d-flex align-items-center">
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
            <Form.Group>
                <Form.Label className="small text-muted mb-1">Produto</Form.Label>
                <Select
                    value={selectedOption}
                    onChange={handleSelectChange}
                    options={options}
                    placeholder="Selecione ou digite o produto..."
                    isClearable
                    required
                    noOptionsMessage={() => "Nenhum produto encontrado"}
                    styles={{
                        control: (base) => ({
                            ...base,
                            borderColor: '#dee2e6', // Combina com as bordas do Bootstrap
                            minHeight: '58px', // Altura similar ao FloatingLabel
                        })
                    }}
                />
            </Form.Group>
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
                    placeholder="Selecione..."
                />
                <datalist id="origens-list">
                    <option value="Almoxarifado Central" />
                    <option value="Pátio 04" />
                    <option value="Galpão Externo" />
                </datalist>
            </FloatingLabel>
          </Col>
          <Col md={6}>
            <FloatingLabel label="Destino (Obra/Local)">
                <Form.Control 
                    value={formData.localObra} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'localObra')} 
                    required 
                    placeholder="Ex: Bloco A"
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
                    placeholder="Nome de quem retirou"
                />
            </FloatingLabel>
          </Col>
          <Col md={6}>
            <FloatingLabel label="Telefone">
                <Form.Control 
                    value={formData.responsavelTelefone} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'responsavelTelefone')} 
                    placeholder="(XX) XXXXX-XXXX"
                />
            </FloatingLabel>
          </Col>
      </Row>

      <div className="d-flex justify-content-end gap-2 mt-auto pt-3">
        {onCancelEdit && (
            <Button variant="outline-secondary" onClick={onCancelEdit}>
                <XCircle className="me-1"/> Cancelar
            </Button>
        )}
        <Button type="submit" variant="primary">
            <Save className="me-1"/> {deliveryToEdit ? 'Salvar Alterações' : 'Agendar Entrega'}
        </Button>
      </div>
    </Form>
  );
}