import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import type { StylesConfig } from 'react-select';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage';
import type { Produto, Entrega, EntregaPayload } from '../types';

// ── SVG ICONS ─────────────────────────────────────────────────────────────────

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8"  y1="2" x2="8"  y2="6"/>
    <line x1="3"  y1="10" x2="21" y2="10"/>
  </svg>
);

const IconSave = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconGear = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
       strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconEmptyHistory = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: .3 }}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </svg>
);

// ── TYPES ─────────────────────────────────────────────────────────────────────

interface HiddenOptions {
  origens: string[];
  destinos: string[];
  responsaveis: string[];
}

const HIDDEN_OPTIONS_DEFAULT: HiddenOptions = {
  origens: [],
  destinos: [],
  responsaveis: [],
};

interface ProdutoOption {
  value: string;
  label: string;
  nomeProduto: string;
  unidade: string;
  quantidade: number;
}

type SimpleOption = { value: string; label: string } | null;

interface DeliveryFormProps {
  onSave: (data: EntregaPayload) => void;
  onCancelEdit?: () => void;
  deliveryToEdit?: Entrega | null;
  produtosDisponiveis: Produto[];
  historicoEntregas?: Entrega[];
}

// ── REACT-SELECT STYLES ───────────────────────────────────────────────────────

const selectStyles: StylesConfig = {
  control: (base, state) => ({
    ...base,
    backgroundColor: state.isDisabled ? 'var(--surface-2)' : '#fff',
    borderColor: state.isFocused ? 'var(--primary)' : 'var(--border)',
    borderWidth: '1.5px',
    minHeight: '38px',
    borderRadius: '8px',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245,166,35,.12)' : 'none',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13.5px',
    '&:hover': { borderColor: state.isFocused ? 'var(--primary)' : 'var(--border)' },
  }),
  placeholder: base => ({ ...base, color: 'var(--text-3)', fontSize: '13.5px' }),
  singleValue: base => ({ ...base, color: 'var(--text-1)', fontSize: '13.5px' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--primary)' : state.isFocused ? 'var(--primary-light)' : '#fff',
    color: state.isSelected ? '#fff' : 'var(--text-1)',
    fontSize: '13.5px',
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer',
  }),
  menu:       base => ({ ...base, zIndex: 9999, borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }),
  menuPortal: base => ({ ...base, zIndex: 9999 }),
  indicatorSeparator: () => ({ display: 'none' }),
};

// ── COMPONENT ─────────────────────────────────────────────────────────────────

const FieldLabel = ({
  label,
  field,
  onManage,
}: {
  label: string;
  field: keyof HiddenOptions;
  onManage: (field: keyof HiddenOptions) => void;
}) => (
  <div className="d-flex justify-content-between align-items-center mb-1">
    <label className="form-label mb-0">{label}</label>
    <button
      type="button"
      className="btn-manage-discreet"
      style={{ height: '24px', padding: '0 6px' }}
      onClick={() => onManage(field)}
      title="Gerenciar histórico"
    >
      <IconGear />
    </button>
  </div>
);

export function DeliveryForm({
  onSave,
  produtosDisponiveis,
  onCancelEdit,
  deliveryToEdit,
  historicoEntregas = [],
}: DeliveryFormProps) {
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const [formData, setFormData] = useState({
    localArmazenagem: '', localObra: '', produtoId: '',
    itemNome: '', itemQuantidade: 1, responsavelNome: '', responsavelTelefone: '',
  });
  const [data,           setData]           = useState(todayStr);
  const [hora,           setHora]           = useState('08:00');
  const [selectedOption, setSelectedOption] = useState<ProdutoOption | null>(null);
  const [formError,      setFormError]      = useState('');

  const [showManageModal, setShowManageModal] = useState(false);
  const [manageField, setManageField]         = useState<keyof HiddenOptions | null>(null);

  // ── localStorage CORRIGIDO ───────────────────────────────────────────────
  // Correção: safeLocalStorageGet trata erros de acesso e JSON inválido
  const [hiddenOptions, setHiddenOptions] = useState<HiddenOptions>(() =>
    safeLocalStorageGet('deliveryHiddenOptions', HIDDEN_OPTIONS_DEFAULT)
  );

  useEffect(() => {
    safeLocalStorageSet('deliveryHiddenOptions', hiddenOptions);
  }, [hiddenOptions]);

  const formatPhone = (value: string) => {
    if (!value) return '';
    let v = value.replace(/\D/g, '').substring(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
    return v;
  };

  const sugestoes = useMemo(() => {
    const origens      = new Set<string>(['Almoxarifado Central', 'Pátio 04', 'Galpão Externo']);
    const destinos     = new Set<string>();
    const responsaveis = new Set<string>();
    const telefones    = new Set<string>();
    const mapaTel: Record<string, string> = {};

    historicoEntregas.forEach(e => {
      if (e.localArmazenagem) origens.add(e.localArmazenagem);
      if (e.localObra)        destinos.add(e.localObra);
      if (e.responsavelNome) {
        responsaveis.add(e.responsavelNome);
        if (e.responsavelTelefone) {
          const tel = formatPhone(e.responsavelTelefone);
          mapaTel[e.responsavelNome.toLowerCase()] = tel;
          telefones.add(tel);
        }
      }
    });

    return {
      origens:      Array.from(origens).filter(o => !hiddenOptions.origens?.includes(o)),
      destinos:     Array.from(destinos).filter(d => !hiddenOptions.destinos?.includes(d)),
      responsaveis: Array.from(responsaveis).filter(r => !hiddenOptions.responsaveis?.includes(r)),
      telefones:    Array.from(telefones),
      mapaTelefonePorNome: mapaTel,
    };
  }, [historicoEntregas, hiddenOptions]);

  const options = useMemo(() =>
    produtosDisponiveis.map(p => ({
      value: p.id,
      label: `${p.nome} (Saldo: ${p.quantidade} ${p.unidade} | SKU: ${p.sku})`,
      nomeProduto: p.nome,
      unidade: p.unidade,
      quantidade: p.quantidade,
    })), [produtosDisponiveis]);

  // Preenche o formulário quando uma entrega entra em edição
  // (ajuste de estado durante o render, conforme https://react.dev/learn/you-might-not-need-an-effect)
  const [prevDeliveryToEdit, setPrevDeliveryToEdit] = useState(deliveryToEdit);
  if (deliveryToEdit !== prevDeliveryToEdit) {
    setPrevDeliveryToEdit(deliveryToEdit);
    if (deliveryToEdit) {
      const d = new Date(deliveryToEdit.dataHoraSolicitacao);
      setData(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      setHora(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      setFormData({
        localArmazenagem: deliveryToEdit.localArmazenagem || '',
        localObra:        deliveryToEdit.localObra || '',
        produtoId:        deliveryToEdit.produtoId,
        itemNome:         deliveryToEdit.itemNome || '',
        itemQuantidade:   deliveryToEdit.itemQuantidade,
        responsavelNome:  deliveryToEdit.responsavelNome || '',
        responsavelTelefone: formatPhone(deliveryToEdit.responsavelTelefone || ''),
      });
      setSelectedOption(options.find(o => o.value === deliveryToEdit.produtoId) || null);
    }
  }

  // ── SUBMIT COM VALIDAÇÃO ──────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validação: produto selecionado
    if (!selectedOption) {
      setFormError('Por favor, selecione um produto da lista.');
      return;
    }

    // Validação: quantidade numérica e positiva
    const qtd = Number(String(formData.itemQuantidade).replace(',', '.'));
    if (!isFinite(qtd) || qtd <= 0) {
      setFormError('A quantidade deve ser um número positivo.');
      return;
    }

    // Validação: campos obrigatórios
    if (!formData.localArmazenagem.trim()) {
      setFormError('Informe a origem (armazém).');
      return;
    }
    if (!formData.localObra.trim()) {
      setFormError('Informe o destino (obra).');
      return;
    }

    const dataLocal = new Date(`${data}T${hora}:00`);
    onSave({
      ...formData,
      itemQuantidade: qtd,
      produtoId: selectedOption.value,
      itemNome:  selectedOption.nomeProduto,
      dataHoraSolicitacao: dataLocal.toISOString(),
    });

    if (!deliveryToEdit) {
      setFormData({ localArmazenagem: '', localObra: '', produtoId: '', itemNome: '', itemQuantidade: 1, responsavelNome: '', responsavelTelefone: '' });
      setSelectedOption(null);
    }
  };

  const handleResponsavelChange = (newValue: SimpleOption) => {
    const nome = newValue?.value || '';
    const tel  = nome ? (sugestoes.mapaTelefonePorNome[nome.toLowerCase()] || formData.responsavelTelefone) : '';
    setFormData(prev => ({ ...prev, responsavelNome: nome, responsavelTelefone: tel }));
  };

  const origensOptions     = sugestoes.origens.map(o => ({ value: o, label: o }));
  const destinosOptions    = sugestoes.destinos.map(d => ({ value: d, label: d }));
  const responsaveisOptions = sugestoes.responsaveis.map(r => ({ value: r, label: r }));
  const telefonesOptions   = sugestoes.telefones.map(t => ({ value: t, label: t }));

  const handleRemoveOption = (field: keyof HiddenOptions, value: string) => {
    setHiddenOptions(prev => ({ ...prev, [field]: [...(prev[field] || []), value] }));
  };
  const handleClearAll = (field: keyof HiddenOptions) => {
    setHiddenOptions(prev => ({ ...prev, [field]: [...(prev[field] || []), ...sugestoes[field]] }));
  };

  const openManageModal = (field: keyof HiddenOptions) => {
    setManageField(field);
    setShowManageModal(true);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="d-flex flex-column h-100"
        style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}
      >
        <div className="d-flex align-items-center gap-2 mb-4" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--primary)' }}><IconCalendar /></span>
          <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-.3px' }}>
            {deliveryToEdit ? 'Editar Entrega' : 'Nova Entrega'}
          </h5>
        </div>

        {/* Mensagem de erro de validação */}
        {formError && (
          <div style={{ background: 'var(--danger-light)', border: '1px solid #FFC5C5', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: 'var(--danger)', marginBottom: '12px' }}>
            {formError}
          </div>
        )}

        <div className="row g-3 mb-3">
          <div className="col-6">
            <label className="form-label">Data</label>
            <input type="date" className="form-control" value={data} onChange={e => setData(e.target.value)} required />
          </div>
          <div className="col-6">
            <label className="form-label">Hora</label>
            <input type="time" className="form-control" value={hora} onChange={e => setHora(e.target.value)} required />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Produto *</label>
          <Select
            value={selectedOption}
            onChange={(opt) => {
              const option = opt as ProdutoOption | null;
              setSelectedOption(option);
              setFormData(prev => ({ ...prev, produtoId: option?.value || '', itemNome: option?.nomeProduto || '' }));
              setFormError('');
            }}
            options={options}
            placeholder="Selecione o Produto..."
            isClearable
            styles={selectStyles}
            menuPortalTarget={document.body}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Quantidade *</label>
          <input
            type="number" min="0.01" step="0.01" className="form-control"
            value={formData.itemQuantidade}
            onChange={e => setFormData(prev => ({ ...prev, itemQuantidade: Number(e.target.value) }))}
            required
          />
        </div>

        <div className="mb-3">
          <FieldLabel label="Origem (Armazém) *" field="origens" onManage={openManageModal} />
          <CreatableSelect
            isClearable options={origensOptions}
            value={formData.localArmazenagem ? { value: formData.localArmazenagem, label: formData.localArmazenagem } : null}
            onChange={(v) => setFormData(prev => ({ ...prev, localArmazenagem: (v as SimpleOption)?.value || '' }))}
            placeholder="Selecione ou digite..."
            formatCreateLabel={(i: string) => `Usar "${i}"`}
            styles={selectStyles} menuPortalTarget={document.body}
          />
        </div>

        <div className="mb-3">
          <FieldLabel label="Destino (Obra) *" field="destinos" onManage={openManageModal} />
          <CreatableSelect
            isClearable options={destinosOptions}
            value={formData.localObra ? { value: formData.localObra, label: formData.localObra } : null}
            onChange={(v) => setFormData(prev => ({ ...prev, localObra: (v as SimpleOption)?.value || '' }))}
            placeholder="Ex: Bloco A"
            formatCreateLabel={(i: string) => `Usar "${i}"`}
            styles={selectStyles} menuPortalTarget={document.body}
          />
        </div>

        <div className="mb-3">
          <FieldLabel label="Responsável" field="responsaveis" onManage={openManageModal} />
          <CreatableSelect
            isClearable options={responsaveisOptions}
            value={formData.responsavelNome ? { value: formData.responsavelNome, label: formData.responsavelNome } : null}
            onChange={(v) => handleResponsavelChange(v as SimpleOption)}
            placeholder="Nome de quem recebe"
            formatCreateLabel={(i: string) => `Usar "${i}"`}
            styles={selectStyles} menuPortalTarget={document.body}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Telefone</label>
          <CreatableSelect
            isClearable options={telefonesOptions}
            value={formData.responsavelTelefone ? { value: formData.responsavelTelefone, label: formData.responsavelTelefone } : null}
            onChange={(v) => setFormData(prev => ({ ...prev, responsavelTelefone: (v as SimpleOption)?.value || '' }))}
            placeholder="(00) 00000-0000"
            formatCreateLabel={(i: string) => `Usar "${i}"`}
            styles={selectStyles} menuPortalTarget={document.body}
          />
        </div>

        <div className="d-flex flex-column gap-2 mt-auto" style={{ paddingTop: '16px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
          <button type="submit" className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2" style={{ height: '42px', fontWeight: 700 }}>
            <IconSave /> {deliveryToEdit ? 'Salvar Alterações' : 'Agendar Entrega'}
          </button>
          {deliveryToEdit && (
            <button type="button" className="btn btn-ghost w-100 d-flex align-items-center justify-content-center gap-2" onClick={onCancelEdit} style={{ height: '40px' }}>
              <IconX /> Cancelar
            </button>
          )}
        </div>
      </form>

      {/* ── MANAGE HISTORY MODAL ── */}
      {showManageModal && (
        <div className="ds-modal-overlay" onClick={() => setShowManageModal(false)}>
          <div className="ds-modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="ds-modal-header">
              <h5 className="ds-modal-title">Gerenciar Histórico</h5>
              <button className="ds-modal-close" onClick={() => setShowManageModal(false)} aria-label="Fechar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="ds-modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px' }}>
                Remova itens que não deseja mais como sugestão neste campo.
              </p>
              <div style={{ maxHeight: '45vh', overflowY: 'auto', paddingRight: '4px' }}>
                {manageField && sugestoes[manageField].length > 0 ? (
                  sugestoes[manageField].map((item, idx) => (
                    <div key={idx} className="history-card-item">
                      <span className="history-card-text">{item}</span>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0, display: 'flex', alignItems: 'center' }}
                        onClick={() => handleRemoveOption(manageField!, item)}
                        title="Remover"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)' }}>
                    <div style={{ marginBottom: '8px' }}><IconEmptyHistory /></div>
                    <p style={{ fontSize: '13px', margin: 0 }}>Nenhum item no histórico deste campo.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="ds-modal-footer">
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', padding: 0 }}
                onClick={() => manageField && handleClearAll(manageField)}
                disabled={!manageField || sugestoes[manageField]?.length === 0}
              >
                Limpar tudo
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ borderRadius: '999px', padding: '0 24px', height: '38px', fontWeight: 700 }}
                onClick={() => setShowManageModal(false)}
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}