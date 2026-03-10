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
  /* Garante que o container de botões não quebre o layout */
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
      minHeight: '58px',
      height: '58px',
      borderRadius: '0.375rem',
      boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
      '&:hover': { borderColor: state.isFocused ? '#86b7fe' : '#dee2e6' },
    }),
    valueContainer: (provided) => ({
      ...provided,
      height: '58px',
      padding: '0 12px',
      alignContent: 'center',
    }),
    input: (provided) => ({ ...provided, margin: '0', padding: '0' }),
    menu: (provided) => ({ ...provided, zIndex: 9999 }),
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

  const handleResponsavelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nomeDigitado = e.target.value;
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

  return (
    <>
      <style>{customFormStyles}</style>
      
      {/* Removido o h-100 fixo para evitar que os botões "sumam" em telas menores ou com zoom */}
      <Form onSubmit={handleSubmit} className="p-4 border rounded bg-white shadow-sm d-flex flex-column h-100">
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

        <Row className="g-3 mb-3">
          <Col md={8}>
            <Select
              value={selectedOption}
              onChange={(opt) => {
                setSelectedOption(opt);
                setFormData({ ...formData, produtoId: opt?.value || '', itemNome: opt?.nomeProduto || '' });
              }}
              options={options}
              placeholder="Selecione o Produto..."
              isClearable
              styles={customStyles}
            />
          </Col>
          <Col md={4}>
            <FloatingLabel label="Quantidade">
              <Form.Control
                type="number"
                min="0.01"
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
              <FloatingLabel label="Origem (Armazém)" className="flex-grow-1">
                <Form.Control
                  value={formData.localArmazenagem}
                  onChange={(e) => handleInputChange(e, 'localArmazenagem')}
                  required
                  list="origens-list"
                  placeholder="Selecione..."
                  autoComplete="off"
                />
                <datalist id="origens-list">
                  {sugestoes.origens.map((o, i) => <option key={i} value={o} />)}
                </datalist>
              </FloatingLabel>
              <button type="button" className="btn-manage-discreet" onClick={() => openManage('origens')} title="Gerenciar histórico">
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
                  required
                  list="destinos-list"
                  placeholder="Ex: Bloco A"
                  autoComplete="off"
                />
                <datalist id="destinos-list">
                  {sugestoes.destinos.map((d, i) => <option key={i} value={d} />)}
                </datalist>
              </FloatingLabel>
              <button type="button" className="btn-manage-discreet" onClick={() => openManage('destinos')} title="Gerenciar histórico">
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
                  onChange={handleResponsavelChange}
                  list="responsaveis-list"
                  placeholder="Nome"
                  autoComplete="off"
                />
                <datalist id="responsaveis-list">
                  {sugestoes.responsaveis.map((r, i) => <option key={i} value={r} />)}
                </datalist>
              </FloatingLabel>
              <button type="button" className="btn-manage-discreet" onClick={() => openManage('responsaveis')} title="Gerenciar histórico">
                <GearFill size={18} />
              </button>
            </div>
          </Col>
          <Col md={6}>
            <FloatingLabel label="Telefone">
              <Form.Control
                value={formData.responsavelTelefone}
                onChange={(e) => handleInputChange(e, 'responsavelTelefone')}
                list="telefones-list"
                placeholder="(27) ..."
                autoComplete="off"
                maxLength={15}
              />
              <datalist id="telefones-list">
                {sugestoes.telefones.map((t, i) => <option key={i} value={t} />)}
              </datalist>
            </FloatingLabel>
          </Col>
        </Row>

        {/* Seção de Ações Refatorada para ser resiliente ao tamanho da tela */}
        <div className="form-actions-container d-flex flex-column flex-sm-row justify-content-end gap-2 mt-auto">
          {onCancelEdit && (
            <Button 
              variant="outline-secondary" 
              onClick={onCancelEdit} 
              className="px-4 py-2 order-2 order-sm-1"
            >
              <XCircle className="me-2" /> Cancelar
            </Button>
          )}
          <Button 
            type="submit" 
            variant="primary" 
            className="px-4 py-2 fw-bold order-1 order-sm-2 shadow-sm"
          >
            <Save className="me-2" /> {deliveryToEdit ? 'Salvar Alterações' : 'Agendar Entrega'}
          </Button>
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
                   <GearFill size={40} />
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