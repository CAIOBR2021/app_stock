import React, { useState, useEffect, useMemo } from 'react';
import { Form, Row, Col, Button, FloatingLabel, Modal } from 'react-bootstrap';
import {
  CalendarEventFill,
  Save,
  XCircle,
  GearFill,
  Trash3Fill,
} from 'react-bootstrap-icons';
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
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    border-radius: 8px;
    height: 58px;
  }
  .btn-manage-discreet:hover {
    color: #0d6efd;
    background-color: #f1f5f9;
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
    padding-top: 1.5rem;
    border-top: 1px solid #f1f5f9;
  }
  .select-container-label {
    font-size: 0.85rem;
    color: #6c757d;
    margin-bottom: 4px;
    display: block;
    padding-left: 4px;
  }
`;

export function DeliveryForm({
  onSave,
  produtosDisponiveis,
  onCancelEdit,
  deliveryToEdit,
  historicoEntregas = [],
}: DeliveryFormProps) {
  
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    localArmazenagem: '',
    localObra: '',
    produtoId: '',
    itemNome: '',
    itemQuantidade: 1,
    responsavelNome: '',
    responsavelTelefone: '',
  });

  const [data, setData] = useState(getTodayStr());
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
      minHeight: '58px',
      borderRadius: '0.375rem',
      boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
      '&:hover': { borderColor: state.isFocused ? '#86b7fe' : '#dee2e6' },
    }),
    valueContainer: (provided) => ({ ...provided, padding: '0 12px' }),
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
      const foundOption = options.find(opt => opt.value === deliveryToEdit.produtoId);
      setSelectedOption(foundOption || null);
    }
  }, [deliveryToEdit, options]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) {
      alert('Por favor, selecione um produto.');
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
      setFormData({
        localArmazenagem: '', localObra: '', produtoId: '',
        itemNome: '', itemQuantidade: 1, responsavelNome: '', responsavelTelefone: '',
      });
      setSelectedOption(null);
      setData(getTodayStr());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<any>, field: string) => {
    let valor = e.target.value;
    if (field === 'responsavelTelefone') valor = formatPhone(valor);
    setFormData({ ...formData, [field]: valor });
  };

  return (
    <>
      <style>{customFormStyles}</style>
      <Form onSubmit={handleSubmit} className="p-4 border rounded bg-white shadow-sm d-flex flex-column h-auto">
        <h5 className="mb-4 border-bottom pb-2 text-primary d-flex align-items-center fw-bold">
          <CalendarEventFill className="me-2" />
          {deliveryToEdit ? 'Editar Entrega' : 'Agendar Nova Entrega'}
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

        <Row className="g-3 mb-3 align-items-end">
          <Col md={8}>
            <label className="select-container-label">Produto</label>
            <Select
              value={selectedOption}
              onChange={(opt) => {
                setSelectedOption(opt);
                setFormData({ ...formData, produtoId: opt?.value || '', itemNome: opt?.nomeProduto || '' });
              }}
              options={options}
              placeholder="Pesquisar..."
              isClearable
              styles={customStyles}
              menuPortalTarget={document.body}
            />
          </Col>
          <Col md={4}>
            <FloatingLabel label="Quantidade">
              <Form.Control
                type="number" min="0.01" step="0.01"
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
              <FloatingLabel label="Origem (Armazém)" className="flex-grow-1">
                <Form.Control
                  value={formData.localArmazenagem}
                  onChange={(e) => handleInputChange(e, 'localArmazenagem')}
                  required list="origens-list" autoComplete="off"
                />
                <datalist id="origens-list">
                  {sugestoes.origens.map((o, i) => <option key={i} value={o} />)}
                </datalist>
              </FloatingLabel>
              <button type="button" className="btn-manage-discreet" onClick={() => {setManageField('origens'); setShowManageModal(true)}}>
                <GearFill size={18} />
              </button>
            </div>
          </Col>
          <Col md={6}>
            <div className="d-flex align-items-center">
              <FloatingLabel label="Destino (Obra/Local)" className="flex-grow-1">
                <Form.Control
                  value={formData.localObra}
                  onChange={(e) => handleInputChange(e, 'localObra')}
                  required list="destinos-list" autoComplete="off"
                />
                <datalist id="destinos-list">
                  {sugestoes.destinos.map((d, i) => <option key={i} value={d} />)}
                </datalist>
              </FloatingLabel>
              <button type="button" className="btn-manage-discreet" onClick={() => {setManageField('destinos'); setShowManageModal(true)}}>
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
                    const val = e.target.value;
                    const tel = sugestoes.mapaTelefonePorNome[val.toLowerCase()];
                    setFormData({ ...formData, responsavelNome: val, responsavelTelefone: tel || formData.responsavelTelefone });
                  }}
                  list="responsaveis-list" autoComplete="off"
                />
                <datalist id="responsaveis-list">
                  {sugestoes.responsaveis.map((r, i) => <option key={i} value={r} />)}
                </datalist>
              </FloatingLabel>
              <button type="button" className="btn-manage-discreet" onClick={() => {setManageField('responsaveis'); setShowManageModal(true)}}>
                <GearFill size={18} />
              </button>
            </div>
          </Col>
          <Col md={6}>
            <FloatingLabel label="Telefone">
              <Form.Control
                value={formData.responsavelTelefone}
                onChange={(e) => handleInputChange(e, 'responsavelTelefone')}
                list="telefones-list" autoComplete="off" maxLength={15}
              />
              <datalist id="telefones-list">
                {sugestoes.telefones.map((t, i) => <option key={i} value={t} />)}
              </datalist>
            </FloatingLabel>
          </Col>
        </Row>

        <div className="form-actions-container d-flex flex-column flex-sm-row justify-content-end gap-2 mt-3">
          {onCancelEdit && (
            <Button variant="outline-secondary" onClick={onCancelEdit} className="px-4 py-2 order-2 order-sm-1">
              <XCircle className="me-2" /> Cancelar
            </Button>
          )}
          <Button type="submit" variant="primary" className="px-4 py-2 fw-bold order-1 order-sm-2 shadow-sm">
            <Save className="me-2" /> {deliveryToEdit ? 'Salvar Alterações' : 'Confirmar Agendamento'}
          </Button>
        </div>
      </Form>

      <Modal show={showManageModal} onHide={() => setShowManageModal(false)} centered className="modern-modal">
        <Modal.Header closeButton className="border-0 px-4 pt-4">
          <Modal.Title className="fw-bold">Gerenciar Histórico</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 pb-2">
          <p className="text-muted small mb-3">Remova itens que não deseja mais ver como sugestão.</p>
          <div style={{ maxHeight: '45vh', overflowY: 'auto' }} className="pe-1">
            {manageField && sugestoes[manageField].length > 0 ? (
              sugestoes[manageField].map((item, idx) => (
                <div key={idx} className="history-item-row">
                  <span className="history-item-text">{item}</span>
                  <Button variant="link" className="text-danger p-0" 
                    onClick={() => setHiddenOptions(prev => ({ ...prev, [manageField]: [...(prev[manageField] || []), item] }))}>
                    <Trash3Fill size={18} />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-5">
                <p className="text-muted small">Nenhum item histórico encontrado.</p>
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 px-4 pb-4 justify-content-between">
          <Button variant="link" className="text-danger text-decoration-none fw-bold p-0" 
            onClick={() => { if(window.confirm('Limpar tudo?')) setHiddenOptions(prev => ({ ...prev, [manageField!]: [...(prev[manageField!] || []), ...sugestoes[manageField!]] }))}}>
            Limpar tudo
          </Button>
          <Button variant="primary" onClick={() => setShowManageModal(false)} className="px-4 rounded-pill fw-bold">Concluído</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}