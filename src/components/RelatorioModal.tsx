// src/components/RelatorioModal.tsx
import { useState } from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type TipoRelatorio = 'completo' | 'critico' | 'prioritarios';

export interface RelatorioFiltros {
  tipo: TipoRelatorio;
  categoria: string; // '' = todas
}

interface RelatorioModalProps {
  categorias: string[];
  onGerar: (filtros: RelatorioFiltros) => void;
  onClose: () => void;
}

// ── REACT-SELECT STYLES — idêntico ao padrão do app ───────────────────────────

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
  placeholder: (base) => ({ ...base, color: 'var(--text-3)', fontSize: '13.5px' }),
  singleValue:  (base) => ({ ...base, color: 'var(--text-1)', fontSize: '13.5px' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--primary)'
      : state.isFocused
      ? 'var(--primary-light)'
      : '#fff',
    color: state.isSelected ? '#fff' : 'var(--text-1)',
    fontSize: '13.5px',
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer',
  }),
  menu:               (base) => ({ ...base, zIndex: 9999, borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }),
  menuPortal:         (base) => ({ ...base, zIndex: 10000 }), // acima do overlay do modal (9999)
  indicatorSeparator: ()    => ({ display: 'none' }),
};

// ── ICONS ─────────────────────────────────────────────────────────────────────

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconFile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// ── OPÇÕES ────────────────────────────────────────────────────────────────────

const TIPO_OPTIONS: { value: TipoRelatorio; label: string; descricao: string }[] = [
  { value: 'completo',     label: 'Estoque completo',          descricao: 'Todos os produtos cadastrados'              },
  { value: 'critico',      label: 'Abaixo do mínimo (crítico)', descricao: 'Produtos com quantidade ≤ estoque mínimo'  },
  { value: 'prioritarios', label: 'Prioritários',               descricao: 'Produtos marcados com flag de prioridade'  },
];

const TIPO_LABELS: Record<TipoRelatorio, string> = {
  completo:     'Estoque completo',
  critico:      'Abaixo do mínimo (crítico)',
  prioritarios: 'Prioritários',
};

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export function RelatorioModal({ categorias, onGerar, onClose }: RelatorioModalProps) {
  const [tipo,      setTipo]      = useState<TipoRelatorio>('completo');
  const [categoria, setCategoria] = useState<{ value: string; label: string } | null>(null);

  // Opções do select de categoria
  const categoriaOptions = [
    { value: '', label: 'Todas as categorias' },
    ...categorias.map((c) => ({ value: c, label: c })),
  ];

  const handleGerar = () => {
    onGerar({ tipo, categoria: categoria?.value ?? '' });
    onClose();
  };

  // Portal: escapa o stacking context dos ancestrais animados (animation: fadeUp)
  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.55)',
        zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '14px',
          boxShadow: '0 12px 32px rgba(0,0,0,.12)',
          width: '100%', maxWidth: '480px', margin: 'auto',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h5 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>
            Gerar Relatório
          </h5>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
            <IconX />
          </button>
        </div>

        {/* Corpo */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Tipo */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
              Tipo de Estoque
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TIPO_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    cursor: 'pointer', padding: '10px 12px', borderRadius: '8px',
                    border: `1.5px solid ${tipo === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                    background: tipo === opt.value ? 'var(--primary-light)' : 'var(--surface-2)',
                    transition: 'all 150ms',
                  }}
                >
                  <input
                    type="radio"
                    name="tipo-relatorio"
                    value={opt.value}
                    checked={tipo === opt.value}
                    onChange={() => setTipo(opt.value)}
                    style={{ accentColor: 'var(--primary)', width: '15px', height: '15px', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-1)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
                      {opt.descricao}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Categoria — react-select padronizado */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>
              Categoria
            </label>
            <Select
              options={categoriaOptions}
              value={categoria ?? categoriaOptions[0]}
              onChange={(opt: { value: string; label: string } | null) => setCategoria(opt?.value ? opt : null)}
              styles={selectStyles}
              isSearchable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>

          {/* Preview */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-3)', flexShrink: 0 }}><IconFile /></span>
            <span style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>
              Relatório:{' '}
              <strong style={{ color: 'var(--text-1)' }}>{TIPO_LABELS[tipo]}</strong>
              {' · '}
              <strong style={{ color: 'var(--text-1)' }}>
                {categoria?.value || 'Todas as categorias'}
              </strong>
            </span>
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            <IconX /> Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleGerar}>
            <IconCheck /> Gerar relatório
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}