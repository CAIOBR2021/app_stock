import React, { useState, useEffect, useMemo } from 'react';
import { Form, Row, Col, Button, Modal } from 'react-bootstrap';
import { CalendarEventFill, Save, XCircle, Gear, Trash3Fill } from 'react-bootstrap-icons';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import type { StylesConfig } from 'react-select';

interface DeliveryFormProps {
  onSave: (data: any) => void;
  onCancelEdit?: () => void;
  deliveryToEdit?: any;
  produtosDisponiveis: any[];
  historicoEntregas?: any[];
}

const customFormStyles = `
  .modern-modal .modal-content {
    border-radius: 20px;
    border: none;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  }
  .history-item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8fafc;
    border: 1px solid #edf2f7;
    border-radius: 12px;
    margin-bottom: 8px;
    transition: background 0.2s;
  }
  .history-item-row:hover {
    background: #f1f5f9;
  }
  .history-item-text {
    font-weight: 500;
    color: #334155;
    font-size: 0.95rem;
  }
  .form-actions-container {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #f1f5f9;
  }
`;

export function DeliveryForm({
  onSave,
  produtosDisponiveis,
  onCancelEdit,
  deliveryToEdit,
  historicoEntregas = [],
}: DeliveryFormProps) {
  const today = new Date();
  const todayStr =
    today.getFullYear() +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0');

  const [formData, setFormData] = useState({
    localArmazenagem: '',
    localObra: '',
    produtoId: '',
    itemNome: '',
    itemQuantidade: 1,
    responsavelNome: '',
    responsavelTelefone: '',
  });

  const [data, setData] = useState(todayStr);
  const [hora, setHora] = useState('08:00');
  const [selectedOption, setSelectedOption] = useState<any>(null);

  const [showManageModal, setShowManageModal] = useState(false);
  const [manageField, setManageField] = useState<'origens' | 'destinos' | 'responsaveis' | null>(null);
  const [hiddenOptions, setHiddenOptions] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('deliveryHiddenOptions');
    return saved ? JSON.parse(saved) : { origens: [], destinos: [], responsaveis: [] };
  });

  useEffect(() => {
    localStorage.setItem('deliveryHiddenOptions', JSON.stringify(hiddenOptions));
  }, [hiddenOptions]);

  const handleRemoveOption = (field: 'origens' | 'destinos' | 'responsaveis', value: string) => {
    setHiddenOptions((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), value],
    }));
  };

  const handleClearAllOptions = (field: 'origens' | 'destinos' | 'responsaveis') => {
    if (window.confirm('Deseja limpar todo o histórico visível deste campo?')) {
      const currentVisible = sugestoes[field];
      setHiddenOptions((prev) => ({
        ...prev,
        [field]: [...(prev[field] || []), ...currentVisible],
      }));
    }
  };

  const formatPhone = (value: string) => {
    if (!value) return '';
    let v = value.replace(/\D/g, '');
    v = v.substring(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
    return v;
  };

  const sugestoes = useMemo(() => {
    const origens = new Set<string>(['Almoxarifado Central', 'Pátio 04', 'Galpão Externo']);
    const destinos = new Set<string>();
    const responsaveis = new Set<string>();
    const telefones = new Set<string>();
    const mapaTelefonePorNome: Record<string, string> = {};

    historicoEntregas?.forEach((entrega) => {
      if (entrega.localArmazenagem) origens.add(entrega.localArmazenagem);
      if (entrega.localObra) destinos.add(entrega.localObra);
      if (entrega.responsavelNome) {
        responsaveis.add(entrega.responsavelNome);
        if (entrega.responsavelTelefone) {
          const telFormatado = formatPhone(entrega.responsavelTelefone);
          mapaTelefonePorNome[entrega.responsavelNome.toLowerCase()] = telFormatado;
          telefones.add(telFormatado);
        }
      }
    });

    return {
      origens: Array.from(origens).filter(o => !hiddenOptions.origens?.includes(o)),
      destinos: Array.from(destinos).filter(d => !hiddenOptions.destinos?.includes(d)),
      responsaveis: Array.from(responsaveis).filter(r => !hiddenOptions.responsaveis?.includes(r)),
      telefones: Array.from(telefones),
      mapaTelefonePorNome,
    };
  }, [historicoEntregas, hiddenOptions]);

  const options = useMemo(() => {
    return produtosDisponiveis.map((p) => ({
      value: p.id,
      label: `${p.nome} (Saldo: ${p.quantidade} ${p.unidade} | SKU: ${p.sku})`,
      nomeProduto: p.nome,
      unidade: p.unidade,
      quantidade: p.quantidade,
    }));
  }, [produtosDisponiveis]);

  const customStyles: StylesConfig = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: '#fff',
      borderColor: state.isFocused ? '#86b7fe' : '#dee2e6',
      minHeight: '38px',
      borderRadius: '0.375rem',
      boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
      '&:hover': { borderColor: state.isFocused ? '#86b7fe' : '#dee2e6' },
    }),
    menu: (provided) => ({ ...provided, zIndex: 9999 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 })
  };

  useEffect(() => {
    if (deliveryToEdit) {
      const dataObj = new Date(deliveryToEdit.dataHoraSolicitacao);
      setData(`${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, '0')}-${String(dataObj.getDate()).padStart(2, '0')}`);
      setHora(`${String(dataObj.getHours()).padStart(2, '0')}:${String(dataObj.getMinutes()).padStart(2, '0')}`);
      setFormData({
        localArmazenagem: deliveryToEdit.localArmazenagem || '',
        localObra: deliveryToEdit.localObra || '',
        produtoId: deliveryToEdit.produtoId,
        itemNome: deliveryToEdit.itemNome || '',
        itemQuantidade: deliveryToEdit.itemQuantidade,
        responsavelNome: deliveryToEdit.responsavelNome || '',
        responsavelTelefone: formatPhone(deliveryToEdit.responsavelTelefone || ''),
      });
      const foundOption = options.find((opt) => opt.value === deliveryToEdit.produtoId);
      setSelectedOption(foundOption || null);
    }
  }, [deliveryToEdit, options]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.produtoId || !selectedOption) {
      alert('Por favor, selecione um produto da lista.');
      return;
    }
    const dataLocal = new Date(`${data}T${hora}:00`);
    onSave({
      ...formData,
      produtoId: selectedOption.value,
      itemNome: selectedOption.nomeProduto,
      dataHoraSolicitacao: dataLocal.toISOString(),
    });
    if (!deliveryToEdit) {
      setFormData({ localArmazenagem: '', localObra: '', produtoId: '', itemNome: '', itemQuantidade: 1, responsavelNome: '', responsavelTelefone: '' });
      setSelectedOption(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<any>, field: string) => {
    let valor = e.target.value;
    if (field === 'responsavelTelefone') valor = formatPhone(valor);
    setFormData({ ...formData, [field]: valor });
  };

  const handleResponsavelChange = (e: any) => {
    const nomeDigitado = e.target.value || '';
    
    if (nomeDigitado.trim() === '') {
      setFormData({
        ...formData,
        responsavelNome: '',
        responsavelTelefone: '',
      });
      return;
    }

    const telefoneEncontrado = sugestoes.mapaTelefonePorNome[nomeDigitado.toLowerCase()];
    setFormData({
      ...formData,
      responsavelNome: nomeDigitado,
      responsavelTelefone: telefoneEncontrado || formData.responsavelTelefone,
    });
  };

  const openManage = (field: 'origens' | 'destinos' | 'responsaveis') => {
    setManageField(field);
    setShowManageModal(true);
  };

  const origensOptions = sugestoes.origens.map(o => ({ value: o, label: o }));
  const destinosOptions = sugestoes.destinos.map(d => ({ value: d, label: d }));
  const responsaveisOptions = sugestoes.responsaveis.map(r => ({ value: r, label: r }));
  const telefonesOptions = sugestoes.telefones.map(t => ({ value: t, label: t }));

  return (
    <>
      <style>{customFormStyles}</style>
      
      <Form onSubmit={handleSubmit} className="p-4 border rounded bg-white shadow-sm d-flex flex-column h-100">
        
        <h5 className="mb-4 border-bottom pb-2 text-primary d-flex align-items-center fw-bold">
          <CalendarEventFill className="me-2" />
          {deliveryToEdit ? 'Editar Entrega' : 'Nova Entrega'}
        </h5>

        <Row className="g-3 mb-3">
          <Col xs={6}>
            <Form.Label className="text-muted small fw-bold mb-1">Data</Form.Label>
            <Form.Control type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Col>
          <Col xs={6}>
            <Form.Label className="text-muted small fw-bold mb-1">Hora</Form.Label>
            <Form.Control type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
          </Col>
        </Row>

        <Row className="g-3 mb-3">
          <Col xs={12}>
            <Form.Label className="text-muted small fw-bold mb-1">Produto *</Form.Label>
            <Select
              value={selectedOption}
              onChange={(opt: any) => {
                setSelectedOption(opt);
                setFormData({ ...formData, produtoId: opt?.value || '', itemNome: opt?.nomeProduto || '' });
              }}
              options={options}
              placeholder="Selecione o Produto..."
              isClearable
              styles={customStyles}
              menuPortalTarget={document.body}
            />
          </Col>
          
          <Col xs={12}>
            <Form.Label className="text-muted small fw-bold mb-1">Quantidade *</Form.Label>
            <Form.Control
              type="number"
              min="0.01"
              step="0.01"
              value={formData.itemQuantidade}
              onChange={(e) => setFormData({ ...formData, itemQuantidade: Number(e.target.value) })}
              required
            />
          </Col>
        </Row>

        <Row className="g-3 mb-3">
          <Col xs={12}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <Form.Label className="text-muted small fw-bold mb-0">Origem (Armazém) *</Form.Label>
              <button type="button" className="btn-icon-subtle p-1 text-muted border-0 bg-transparent" onClick={() => openManage('origens')} title="Gerenciar histórico">
                <Gear size={15} className="text-secondary" />
              </button>
            </div>
            <CreatableSelect
              isClearable
              options={origensOptions}
              value={formData.localArmazenagem ? { value: formData.localArmazenagem, label: formData.localArmazenagem } : null}
              onChange={(newValue: any) => handleInputChange({ target: { value: newValue?.value || '' } } as any, 'localArmazenagem')}
              placeholder="Selecione ou digite..."
              formatCreateLabel={(inputValue: string) => `Usar "${inputValue}"`}
              styles={customStyles}
              menuPortalTarget={document.body}
            />
          </Col>
          
          <Col xs={12}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <Form.Label className="text-muted small fw-bold mb-0">Destino (Obra) *</Form.Label>
              <button type="button" className="btn-icon-subtle p-1 text-muted border-0 bg-transparent" onClick={() => openManage('destinos')} title="Gerenciar histórico">
                <Gear size={15} className="text-secondary" />
              </button>
            </div>
            <CreatableSelect
              isClearable
              options={destinosOptions}
              value={formData.localObra ? { value: formData.localObra, label: formData.localObra } : null}
              onChange={(newValue: any) => handleInputChange({ target: { value: newValue?.value || '' } } as any, 'localObra')}
              placeholder="Ex: Bloco A"
              formatCreateLabel={(inputValue: string) => `Usar "${inputValue}"`}
              styles={customStyles}
              menuPortalTarget={document.body}
            />
          </Col>
        </Row>

        <Row className="g-3 mb-3">
          <Col xs={12}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <Form.Label className="text-muted small fw-bold mb-0">Responsável</Form.Label>
              <button type="button" className="btn-icon-subtle p-1 text-muted border-0 bg-transparent" onClick={() => openManage('responsaveis')} title="Gerenciar histórico">
                <Gear size={15} className="text-secondary" />
              </button>
            </div>
            <CreatableSelect
              isClearable
              options={responsaveisOptions}
              value={formData.responsavelNome ? { value: formData.responsavelNome, label: formData.responsavelNome } : null}
              onChange={(newValue: any) => handleResponsavelChange({ target: { value: newValue?.value || '' } } as any)}
              placeholder="Nome de quem recebe"
              formatCreateLabel={(inputValue: string) => `Usar "${inputValue}"`}
              styles={customStyles}
              menuPortalTarget={document.body}
            />
          </Col>
          
          <Col xs={12}>
            <Form.Label className="text-muted small fw-bold mb-1">Telefone</Form.Label>
            <CreatableSelect
               isClearable
               options={telefonesOptions}
               value={formData.responsavelTelefone ? { value: formData.responsavelTelefone, label: formData.responsavelTelefone } : null}
               onChange={(newValue: any) => handleInputChange({ target: { value: newValue?.value || '' } } as any, 'responsavelTelefone')}
               placeholder="(00) 00000-0000"
               formatCreateLabel={(inputValue: string) => `Usar "${inputValue}"`}
               styles={customStyles}
               menuPortalTarget={document.body}
            />
          </Col>
        </Row>

        <div className="form-actions-container d-flex flex-column gap-2 mt-auto">
          <Button 
            type="submit" 
            variant="primary" 
            className="w-100 py-2 fw-bold shadow-sm"
          >
            <Save className="me-2" /> {deliveryToEdit ? 'Salvar Alterações' : 'Agendar Entrega'}
          </Button>
          
          {deliveryToEdit && (
            <Button 
              variant="outline-secondary" 
              onClick={onCancelEdit} 
              className="w-100 py-2"
            >
              <XCircle className="me-2" /> Cancelar
            </Button>
          )}
        </div>
      </Form>

      <Modal 
        show={showManageModal} 
        onHide={() => setShowManageModal(false)} 
        centered 
        className="modern-modal"
      >
        <Modal.Header closeButton className="border-0 px-4 pt-4">
          <Modal.Title className="fw-bold">Gerenciar Histórico</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 pb-2">
          <p className="text-muted small mb-3">
            Remova itens que você não deseja mais que apareçam como sugestão neste campo.
          </p>
          <div style={{ maxHeight: '45vh', overflowY: 'auto' }} className="pe-1">
            {manageField && sugestoes[manageField].length > 0 ? (
              sugestoes[manageField].map((item, idx) => (
                <div key={idx} className="history-item-row">
                  <span className="history-item-text">{item}</span>
                  <Button 
                    variant="link" 
                    className="text-danger p-0"
                    onClick={() => handleRemoveOption(manageField!, item)}
                  >
                    <Trash3Fill size={18} />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-5">
                <div className="text-muted opacity-50 mb-2">
                   <Gear size={40} className="text-secondary" />
                </div>
                <p className="text-muted small">Nenhum item encontrado no histórico.</p>
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 px-4 pb-4 justify-content-between">
          <Button 
            variant="link" 
            className="text-danger text-decoration-none fw-bold p-0" 
            onClick={() => handleClearAllOptions(manageField!)}
          >
            Limpar tudo
          </Button>
          <Button variant="primary" onClick={() => setShowManageModal(false)} className="px-4 rounded-pill fw-bold">
            Concluído
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}