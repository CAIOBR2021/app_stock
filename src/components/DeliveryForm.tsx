import React, { useState, useEffect, useMemo } from 'react';
import { Form, Row, Col, Button, FloatingLabel, Modal } from 'react-bootstrap';
import { CalendarEventFill, Save, XCircle, GearFill, Trash } from 'react-bootstrap-icons';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';

interface DeliveryFormProps {
  onSave: (data: any) => void;
  onCancelEdit?: () => void;
  deliveryToEdit?: any;
  produtosDisponiveis: any[];
  historicoEntregas?: any[];
}

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

  // --- GERENCIAMENTO DE HISTÓRICO (ENGRENAGEM) ---
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
    if (window.confirm(`Remover "${value}" das sugestões?`)) {
      setHiddenOptions((prev) => ({
        ...prev,
        [field]: [...(prev[field] || []), value],
      }));
    }
  };

  const handleClearAllOptions = (field: 'origens' | 'destinos' | 'responsaveis') => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de sugestões deste campo?')) {
      const currentVisible = sugestoes[field];
      setHiddenOptions((prev) => ({
        ...prev,
        [field]: [...(prev[field] || []), ...currentVisible],
      }));
    }
  };

  // --- MÁSCARA DE TELEFONE ---
  const formatPhone = (value: string) => {
    if (!value) return '';
    let v = value.replace(/\D/g, '');
    v = v.substring(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
    return v;
  };

  // --- PREPARAÇÃO DE DATALISTS (FILTRADO) ---
  const sugestoes = useMemo(() => {
    const origens = new Set<string>(['Almoxarifado Central', 'Pátio 04', 'Galpão Externo']); // Padrões
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
      const yyyy = dataObj.getFullYear();
      const mm = String(dataObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dataObj.getDate()).padStart(2, '0');
      const hh = String(dataObj.getHours()).padStart(2, '0');
      const min = String(dataObj.getMinutes()).padStart(2, '0');

      setData(`${yyyy}-${mm}-${dd}`);
      setHora(`${hh}:${min}`);

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
    const dataHoraIso = dataLocal.toISOString();

    onSave({
      ...formData,
      produtoId: selectedOption.value,
      itemNome: selectedOption.nomeProduto,
      dataHoraSolicitacao: dataHoraIso,
    });

    if (!deliveryToEdit) {
      setFormData({
        localArmazenagem: '',
        localObra: '',
        produtoId: '',
        itemNome: '',
        itemQuantidade: 1,
        responsavelNome: '',
        responsavelTelefone: '',
      });
      setSelectedOption(null);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    field: string,
  ) => {
    let valor = e.target.value;
    if (field === 'responsavelTelefone') valor = formatPhone(valor);
    setFormData({ ...formData, [field]: valor });
  };

  const handleResponsavelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nomeDigitado = e.target.value;
    let telefoneSugerido = formData.responsavelTelefone;
    const telefoneEncontrado = sugestoes.mapaTelefonePorNome[nomeDigitado.toLowerCase()];
    if (telefoneEncontrado) telefoneSugerido = telefoneEncontrado;

    setFormData({
      ...formData,
      responsavelNome: nomeDigitado,
      responsavelTelefone: telefoneSugerido,
    });
  };

  const handleSelectChange = (option: any) => {
    setSelectedOption(option);
    if (option) {
      setFormData({
        ...formData,
        produtoId: option.value,
        itemNome: option.nomeProduto,
      });
    } else {
      setFormData({ ...formData, produtoId: '', itemNome: '' });
    }
  };

  return (
    <>
      <Form
        onSubmit={handleSubmit}
        className="p-4 border rounded bg-white shadow-sm h-100 d-flex flex-column"
      >
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
                onChange={(e) => setData(e.target.value)}
                required
              />
            </FloatingLabel>
          </Col>
          <Col md={6}>
            <FloatingLabel label="Hora">
              <Form.Control
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
              />
            </FloatingLabel>
          </Col>
        </Row>

        <Row className="g-2 mb-3">
          <Col md={8}>
            <div style={{ position: 'relative' }}>
              <Form.Label className="d-none">Produto</Form.Label>
              <Select
                value={selectedOption}
                onChange={handleSelectChange}
                options={options}
                placeholder="Selecione o Produto..."
                isClearable
                required
                noOptionsMessage={() => 'Nenhum produto encontrado'}
                styles={customStyles}
              />
            </div>
          </Col>
          <Col md={4}>
            <FloatingLabel label="Quantidade">
              <Form.Control
                type="number"
                min="0.01"
                step="0.01"
                value={formData.itemQuantidade}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    itemQuantidade: Number(e.target.value),
                  })
                }
                required
              />
            </FloatingLabel>
          </Col>
        </Row>

        <Row className="g-2 mb-3">
          <Col md={6}>
            <div className="d-flex gap-2">
              <div className="flex-grow-1">
                <FloatingLabel label="Origem (Armazém)">
                  <Form.Control
                    value={formData.localArmazenagem}
                    onChange={(e) => handleInputChange(e, 'localArmazenagem')}
                    required
                    list="origens-list"
                    placeholder="Selecione..."
                    autoComplete="off"
                  />
                  <datalist id="origens-list">
                    {sugestoes.origens.map((o, i) => (
                      <option key={i} value={o} />
                    ))}
                  </datalist>
                </FloatingLabel>
              </div>
              <Button 
                variant="outline-secondary" 
                onClick={() => { setManageField('origens'); setShowManageModal(true); }}
                style={{ width: '58px' }}
                title="Gerenciar histórico de origens"
              >
                <GearFill />
              </Button>
            </div>
          </Col>
          
          <Col md={6}>
            <div className="d-flex gap-2">
              <div className="flex-grow-1">
                <FloatingLabel label="Destino (Obra/Local)">
                  <Form.Control
                    value={formData.localObra}
                    onChange={(e) => handleInputChange(e, 'localObra')}
                    required
                    list="destinos-list"
                    placeholder="Ex: Bloco A"
                    autoComplete="off"
                  />
                  <datalist id="destinos-list">
                    {sugestoes.destinos.map((d, i) => (
                      <option key={i} value={d} />
                    ))}
                  </datalist>
                </FloatingLabel>
              </div>
              <Button 
                variant="outline-secondary" 
                onClick={() => { setManageField('destinos'); setShowManageModal(true); }}
                style={{ width: '58px' }}
                title="Gerenciar histórico de destinos"
              >
                <GearFill />
              </Button>
            </div>
          </Col>
        </Row>

        <Row className="g-2 mb-3">
          <Col md={6}>
            <div className="d-flex gap-2">
              <div className="flex-grow-1">
                <FloatingLabel label="Responsável">
                  <Form.Control
                    value={formData.responsavelNome}
                    onChange={handleResponsavelChange}
                    list="responsaveis-list"
                    placeholder="Nome"
                    autoComplete="off"
                  />
                  <datalist id="responsaveis-list">
                    {sugestoes.responsaveis.map((r, i) => (
                      <option key={i} value={r} />
                    ))}
                  </datalist>
                </FloatingLabel>
              </div>
              <Button 
                variant="outline-secondary" 
                onClick={() => { setManageField('responsaveis'); setShowManageModal(true); }}
                style={{ width: '58px' }}
                title="Gerenciar histórico de responsáveis"
              >
                <GearFill />
              </Button>
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
                {sugestoes.telefones.map((t, i) => (
                  <option key={i} value={t} />
                ))}
              </datalist>
            </FloatingLabel>
          </Col>
        </Row>

        <div className="d-flex justify-content-end gap-2 mt-auto pt-3">
          {onCancelEdit && (
            <Button variant="outline-secondary" onClick={onCancelEdit}>
              <XCircle className="me-1" /> Cancelar
            </Button>
          )}
          <Button type="submit" variant="primary">
            <Save className="me-1" /> {deliveryToEdit ? 'Salvar' : 'Agendar'}
          </Button>
        </div>
      </Form>

      {/* MODAL DE GERENCIAMENTO DE HISTÓRICO - FORMATO TABELA */}
      <Modal show={showManageModal} onHide={() => setShowManageModal(false)} centered>
        <Modal.Header closeButton className="border-bottom-0 pb-0">
          <Modal.Title className="fs-5">Gerenciamento de Histórico</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <div className="table-responsive" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            <table className="table table-hover align-middle mb-0 border">
              <thead className="table-light sticky-top">
                <tr>
                  <th className="border-bottom text-secondary" style={{ fontSize: '0.85rem' }}>VALOR SALVO</th>
                  <th className="border-bottom text-end text-secondary" style={{ fontSize: '0.85rem' }}>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {(manageField ? sugestoes[manageField] : []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="fw-medium">{item}</td>
                    <td className="text-end">
                      <Button variant="danger" size="sm" onClick={() => handleRemoveOption(manageField!, item)} title="Remover">
                        <Trash />
                      </Button>
                    </td>
                  </tr>
                ))}
                {(manageField ? sugestoes[manageField] : []).length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center text-muted py-4">
                      Nenhuma opção visível salva no histórico.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-between border-top-0 pt-0 mt-3">
          <Button variant="danger" onClick={() => handleClearAllOptions(manageField!)}>
            Limpar Histórico
          </Button>
          <Button variant="secondary" onClick={() => setShowManageModal(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}