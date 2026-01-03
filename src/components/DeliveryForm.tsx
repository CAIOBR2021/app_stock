import React, { useState, useEffect, useMemo } from 'react';
import { Form, Row, Col, Button, FloatingLabel } from 'react-bootstrap';
import { CalendarEventFill, Save, XCircle } from 'react-bootstrap-icons';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';

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
      nomeProduto: p.nome, 
      unidade: p.unidade,
      quantidade: p.quantidade
    }));
  }, [produtosDisponiveis]);

  // --- ESTILOS CUSTOMIZADOS PARA O REACT-SELECT ---
  // Isso faz o componente ficar idêntico aos inputs do Bootstrap (FloatingLabel)
  const customStyles: StylesConfig = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: '#fff',
      borderColor: state.isFocused ? '#86b7fe' : '#dee2e6', // Cor da borda do Bootstrap
      minHeight: '58px', // Mesma altura do FloatingLabel
      height: '58px',
      borderRadius: '0.375rem',
      boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', // Glow azul do Bootstrap
      '&:hover': {
        borderColor: state.isFocused ? '#86b7fe' : '#dee2e6'
      }
    }),
    valueContainer: (provided) => ({
      ...provided,
      height: '58px',
      padding: '0 12px',
      alignContent: 'center'
    }),
    input: (provided) => ({
      ...provided,
      margin: '0',
      padding: '0'
    }),
    singleValue: (provided) => ({
        ...provided,
        color: '#212529', // Cor de texto padrão do Bootstrap
    }),
    menu: (provided) => ({
        ...provided,
        zIndex: 9999, // Garante que o menu abra por cima de tudo
        boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', // Sombra do Bootstrap
        borderRadius: '0.375rem',
        marginTop: '2px'
    }),
    placeholder: (provided) => ({
        ...provided,
        color: '#6c757d', // Cor de placeholder do Bootstrap
    })
  };

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

        const foundOption = options.find(opt => opt.value === deliveryToEdit.produtoId);
        setSelectedOption(foundOption || null);
    }
  }, [deliveryToEdit, options]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.produtoId || !selectedOption) {
        alert("Por favor, selecione um produto da lista.");
        return;
    }

    if (selectedOption.quantidade < formData.itemQuantidade) {
       if(!window.confirm(`Atenção: A quantidade solicitada (${formData.itemQuantidade}) é maior que o saldo atual (${selectedOption.quantidade}). Deseja continuar e deixar o estoque negativo?`)) {
           return;
       }
    }
    
    onSave({
        ...formData,
        produtoId: selectedOption.value,
        itemNome: selectedOption.nomeProduto,
        dataHoraSolicitacao: `${data}T${hora}:00`
    });
    
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
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, field: string) => {
      setFormData({ ...formData, [field]: e.target.value });
  };

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
            {/* Removemos o FloatingLabel daqui pois o React-Select não suporta bem.
               Em vez disso, usamos um layout que simula o visual, mas com um label fixo pequeno acima 
               ou apenas o placeholder inteligente.
            */}
            <div style={{ position: 'relative' }}>
                <Form.Label className="d-none">Produto</Form.Label> {/* Apenas para acessibilidade */}
                <Select
                    value={selectedOption}
                    onChange={handleSelectChange}
                    options={options}
                    placeholder="Selecione o Produto..."
                    isClearable
                    required
                    noOptionsMessage={() => "Nenhum produto encontrado"}
                    styles={customStyles} // APLICAÇÃO DOS ESTILOS
                    aria-label="Produto"
                />
                {/* Dica visual pequena se quiser imitar o label flutuante (opcional) */}
                {!selectedOption && (
                   <span style={{
                       position: 'absolute',
                       left: '12px',
                       top: '50%',
                       transform: 'translateY(-50%)',
                       color: '#6c757d',
                       pointerEvents: 'none',
                       fontSize: '1rem',
                       zIndex: 1
                   }}>
                   </span>
                )}
            </div>
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