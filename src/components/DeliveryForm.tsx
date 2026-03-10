import React, { useState, useEffect, useMemo } from 'react';
import { Form, Row, Col, Button, FloatingLabel, Modal } from 'react-bootstrap';
import { CalendarEventFill, Save, XCircle, GearFill, Trash3Fill } from 'react-bootstrap-icons';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';

interface DeliveryFormProps {
  onSave: (data: any) => void;
  onCancelEdit?: () => void;
  deliveryToEdit?: any;
  produtosDisponiveis: any[];
  historicoEntregas?: any[];
}

const customFormStyles = `
  .btn-manage-discreet {
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 0 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    border-radius: 8px;
    height: 50px;
  }
  .btn-manage-discreet:hover {
    color: #0d6efd;
    background-color: #f1f5f9;
  }
  .form-actions-wrapper {
    margin-top: 25px;
    padding-top: 20px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  .modern-modal .modal-content { 
    border-radius: 20px; 
    border: none; 
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  }
  .history-item-row {
    display: flex; 
    justify-content: space-between; 
    align-items: center;
    padding: 10px 15px; 
    background: #f8fafc; 
    border: 1px solid #edf2f7;
    border-radius: 12px; 
    margin-bottom: 8px;
  }
  .history-item-text {
    font-weight: 500;
    color: #334155;
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
  const todayStr = today.toISOString().split('T')[0];

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

  const formatPhone = (value: string) => {
    if (!value) return '';
    let v = value.replace(/\D/g, '').substring(0, 11);
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
          const tel = formatPhone(entrega.responsavelTelefone);
          mapaTelefonePorNome[entrega.responsavelNome.toLowerCase()] = tel;
          telefones.add(tel);
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
      label: `${p.nome} (Saldo: ${p.quantidade} ${p.unidade})`,
      nomeProduto: p.nome,
    }));
  }, [produtosDisponiveis]);

  const customStyles: StylesConfig = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '50px',
      borderRadius: '0.375rem',
      borderColor: state.isFocused ? '#86b7fe' : '#dee2e6',
      boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
    }),
    menu: (provided) => ({ ...provided, zIndex: 9999 }),
  };

  useEffect(() => {
    if (deliveryToEdit) {
      const dataObj = new Date(deliveryToEdit.dataHoraSolicitacao);
      setData(dataObj.toISOString().split('T')[0]);
      setHora(dataObj.toTimeString().substring(0, 5));
      setFormData({
        localArmazenagem: deliveryToEdit.localArmazenagem || '',
        localObra: deliveryToEdit.localObra || '',
        produtoId: deliveryToEdit.produtoId,
        itemNome: deliveryToEdit.itemNome || '',
        itemQuantidade: deliveryToEdit.itemQuantidade,
        responsavelNome: deliveryToEdit.responsavelNome || '',
        responsavelTelefone: formatPhone(deliveryToEdit.responsavelTelefone || ''),
      });
      setSelectedOption(options.find(opt => opt.value === deliveryToEdit.produtoId) || null);
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
      dataHoraSolicitacao: dataLocal.toISOString() 
    });
    if (!deliveryToEdit) {
      setFormData({ localArmazenagem: '', localObra: '', produtoId: '', itemNome: '', itemQuantidade: 1, responsavelNome: '', responsavelTelefone: '' });
      setSelectedOption(null);
    }
  };

  const handleRemoveOption = (field: 'origens' | 'destinos' | 'responsaveis', value: string) => {
    setHiddenOptions(prev => ({ ...prev, [field]: [...(prev[field] || []), value] }));
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

  return (
    <>
      <style>{customFormStyles}</style>
      <Form onSubmit={handleSubmit} className="p-4 border rounded bg-white shadow-sm">
        <h5 className="mb-4 border-bottom pb-2 text-primary d-flex align-items-center fw-bold">
          <CalendarEventFill className="me-2" />
          {deliveryToEdit ? 'Editar Agendamento' : 'Novo Agendamento'}
        </h5>

        <Row className="g-3 mb-3">
          <Col md={6}>
            <FloatingLabel label="Data">
              <Form.Control type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </FloatingLabel>
          </Col>
          <Col md={6}>
            <FloatingLabel label="Hora">
              <Form.Control type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
            </FloatingLabel>
          </Col>
        </Row>

        <div className="mb-3">
          <Select
            value={selectedOption}
            onChange={(opt: any) => { 
              setSelectedOption(opt); 
              setFormData({ ...formData, produtoId: opt?.value || '', itemNome: opt?.nomeProduto || '' }); 
            }}
            options={options}
            placeholder="Selecione o produto..."
            isClearable
            styles={customStyles}
          />
        </div>

        <Row className="g-3 mb-3">
          <Col xs={12}>
            <FloatingLabel label="Quantidade">
              <Form.Control 
                type="number" 
                step="0.01" 
                value={formData.itemQuantidade} 
                onChange={(e) => setFormData({ ...formData, itemQuantidade: Number(e.target.value) })} 
                required 
              />
            </FloatingLabel>
          </Col>
        </Row>

        <Row className="g-3 mb-3">
          <Col md={6}>
            <div className="d-flex align-items-center">
              <FloatingLabel label="Origem" className="flex-grow-1">
                <Form.Control 
                  value={formData.localArmazenagem} 
                  onChange={(e) => setFormData({...formData, localArmazenagem: e.target.value})} 
                  list="origens-list" 
                  autoComplete="off"
                  required 
                />
              </FloatingLabel>
              <button type="button" className="btn-manage-discreet" onClick={() => {setManageField('origens'); setShowManageModal(true);}}>
                <GearFill size={18} />
              </button>
            </div>
          </Col>
          <Col md={6}>
            <div className="d-flex align-items-center">
              <FloatingLabel label="Destino" className="flex-grow-1">
                <Form.Control 
                  value={formData.localObra} 
                  onChange={(e) => setFormData({...formData, localObra: e.target.value})} 
                  list="destinos-list" 
                  autoComplete="off"
                  required 
                />
              </FloatingLabel>
              <button type="button" className="btn-manage-discreet" onClick={() => {setManageField('destinos'); setShowManageModal(true);}}>
                <GearFill size={18} />
              </button>
            </div>
          </Col>
        </Row>

        <Row className="g-3 mb-3">
          <Col md={6}>
            <div className="d-flex align-items-center">
              <FloatingLabel label="Responsável" className="flex-grow-1">
                <Form.Control 
                  value={formData.responsavelNome} 
                  onChange={(e) => {
                    const nomeDigitado = e.target.value;
                    const telefoneEncontrado = sugestoes.mapaTelefonePorNome[nomeDigitado.toLowerCase()];
                    setFormData({
                      ...formData,
                      responsavelNome: nomeDigitado,
                      responsavelTelefone: telefoneEncontrado || formData.responsavelTelefone,
                    });
                  }} 
                  list="responsaveis-list" 
                  autoComplete="off"
                />
              </FloatingLabel>
              <button type="button" className="btn-manage-discreet" onClick={() => {setManageField('responsaveis'); setShowManageModal(true);}}>
                <GearFill size={18} />
              </button>
            </div>
          </Col>
          <Col md={6}>
            <FloatingLabel label="Telefone">
              <Form.Control 
                value={formData.responsavelTelefone} 
                onChange={(e) => setFormData({...formData, responsavelTelefone: formatPhone(e.target.value)})} 
                maxLength={15} 
                placeholder="(00) 00000-0000"
              />
            </FloatingLabel>
          </Col>
        </Row>

        <div className="form-actions-wrapper">
          {onCancelEdit && (
            <Button variant="outline-secondary" onClick={onCancelEdit} className="px-4">
              <XCircle className="me-2" /> Sair
            </Button>
          )}
          <Button type="submit" variant="primary" className="px-4 fw-bold shadow-sm">
            <Save className="me-2" /> {deliveryToEdit ? 'Salvar' : 'Agendar'}
          </Button>
        </div>
      </Form>

      <datalist id="origens-list">{sugestoes.origens.map((o, i) => <option key={i} value={o} />)}</datalist>
      <datalist id="destinos-list">{sugestoes.destinos.map((d, i) => <option key={i} value={d} />)}</datalist>
      <datalist id="responsaveis-list">{sugestoes.responsaveis.map((r, i) => <option key={i} value={r} />)}</datalist>

      <Modal show={showManageModal} onHide={() => setShowManageModal(false)} centered className="modern-modal">
        <Modal.Header closeButton className="border-0 px-4 pt-4">
          <Modal.Title className="fw-bold">Gerenciar Histórico</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4">
          <p className="text-muted small mb-3">Remova itens que não devem mais aparecer como sugestão.</p>
          <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {manageField && sugestoes[manageField].length > 0 ? (
              sugestoes[manageField].map((item, idx) => (
                <div key={idx} className="history-item-row">
                  <span className="history-item-text">{item}</span>
                  <Button variant="link" className="text-danger p-0" onClick={() => handleRemoveOption(manageField, item)}>
                    <Trash3Fill size={18} />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted">Nenhum item encontrado.</div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 px-4 pb-4 justify-content-between">
          <Button variant="link" className="text-danger text-decoration-none fw-bold p-0" onClick={() => manageField && handleClearAllOptions(manageField)}>
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