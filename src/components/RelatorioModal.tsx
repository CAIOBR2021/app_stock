// src/components/RelatorioModal.tsx
import { useState } from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type TipoRelatorio = 'completo' | 'critico' | 'prioritarios';

export interface RelatorioFiltros {
  tipo: TipoRelatorio;
  categoria: string;
}

interface RelatorioModalProps {
  categorias: string[];
  onGerar: (filtros: RelatorioFiltros) => void;
  onClose: () => void;
}

// ── REACT-SELECT STYLES ───────────────────────────────────────────────────────

const selectStyles: StylesConfig = {
  control: (base, state) => ({
    ...base,
    backgroundColor: '#FAFAFA',
    borderColor: state.isFocused ? '#1A1A2E' : '#EAECF0',
    borderWidth: '1.5px',
    minHeight: '40px',
    borderRadius: '10px',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(26,26,46,.08)' : 'none',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13.5px',
    '&:hover': { borderColor: '#D0D5DD' },
  }),
  placeholder: (base) => ({ ...base, color: '#9BA3B2', fontSize: '13.5px' }),
  singleValue:  (base) => ({ ...base, color: '#1A1A2E', fontSize: '13.5px' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#1A1A2E' : state.isFocused ? '#F8F9FA' : '#fff',
    color: state.isSelected ? '#fff' : '#1A1A2E',
    fontSize: '13.5px',
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer',
    borderRadius: '6px',
    margin: '1px 4px',
    width: 'calc(100% - 8px)',
  }),
  menu:               (base) => ({ ...base, zIndex: 9999, borderRadius: '10px', border: '1px solid #EAECF0', boxShadow: '0 8px 24px rgba(0,0,0,.10)', padding: '4px 0' }),
  menuPortal:         (base) => ({ ...base, zIndex: 10000 }),
  indicatorSeparator: ()    => ({ display: 'none' }),
  dropdownIndicator:  (base) => ({ ...base, color: '#9BA3B2', padding: '0 10px' }),
};

// ── OPÇÕES ────────────────────────────────────────────────────────────────────

interface TipoOption {
  value: TipoRelatorio;
  label: string;
  descricao: string;
  badge?: { text: string; bg: string; color: string; border: string };
  icon?: React.ReactNode;
}

const TIPO_OPTIONS: TipoOption[] = [
  {
    value: 'completo',
    label: 'Estoque completo',
    descricao: 'Todos os produtos cadastrados',
  },
  {
    value: 'critico',
    label: 'Abaixo do mínimo',
    descricao: 'Quantidade ≤ estoque mínimo',
    badge: { text: 'Crítico', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  },
  {
    value: 'prioritarios',
    label: 'Prioritários',
    descricao: 'Marcados com flag de prioridade',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#DC2626" stroke="#DC2626" strokeWidth="1">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>
      </svg>
    ),
  },
];

const TIPO_LABELS: Record<TipoRelatorio, string> = {
  completo:     'Estoque completo',
  critico:      'Abaixo do mínimo',
  prioritarios: 'Prioritários',
};

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export function RelatorioModal({ categorias, onGerar, onClose }: RelatorioModalProps) {
  const [tipo,      setTipo]      = useState<TipoRelatorio>('completo');
  const [categoria, setCategoria] = useState<{ value: string; label: string } | null>(null);

  const categoriaOptions = [
    { value: '', label: 'Todas as categorias' },
    ...categorias.map((c) => ({ value: c, label: c })),
  ];

  const handleGerar = () => {
    onGerar({ tipo, categoria: categoria?.value ?? '' });
    onClose();
  };

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,12,18,.72)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '20px',
          boxShadow: '0 32px 64px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.06)',
          width: '100%', maxWidth: '420px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Cabeçalho ── */}
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E', margin: 0, letterSpacing: '-.3px' }}>
                Gerar relatório
              </p>
              <p style={{ fontSize: '12px', color: '#9BA3B2', margin: '2px 0 0' }}>
                Selecione o escopo do relatório
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'rgba(0,0,0,.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Corpo ── */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '0' }}>

          {/* Label seção */}
          <p style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: '#9BA3B2', margin: '0 0 10px' }}>
            Tipo de estoque
          </p>

          {/* Opções */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {TIPO_OPTIONS.map((opt) => {
              const active = tipo === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => setTipo(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px 14px', borderRadius: '12px', cursor: 'pointer',
                    border: active ? '1.5px solid #1A1A2E' : '1.5px solid #EAECF0',
                    background: active ? '#fff' : '#FAFAFA',
                    boxShadow: active ? '0 2px 8px rgba(26,26,46,.08)' : 'none',
                    transition: 'all .15s',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* Barra lateral âmbar */}
                  {active && (
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#F5A623', borderRadius: '0' }} />
                  )}

                  {/* Radio */}
                  <div style={{
                    width: '17px', height: '17px', borderRadius: '50%',
                    border: active ? '2px solid #1A1A2E' : '2px solid #D0D5DD',
                    background: active ? '#1A1A2E' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all .15s',
                  }}>
                    {active && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F5A623' }} />}
                  </div>

                  {/* Texto */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13.5px', fontWeight: 600, margin: 0, color: active ? '#1A1A2E' : '#344054' }}>
                      {opt.label}
                    </p>
                    <p style={{ fontSize: '11.5px', margin: '2px 0 0', color: '#9BA3B2' }}>
                      {opt.descricao}
                    </p>
                  </div>

                  {/* Indicador */}
                  {opt.badge && (
                    <span style={{ fontSize: '11px', fontWeight: 600, background: opt.badge.bg, color: opt.badge.color, padding: '3px 9px', borderRadius: '999px', border: `1px solid ${opt.badge.border}`, flexShrink: 0 }}>
                      {opt.badge.text}
                    </span>
                  )}
                  {opt.icon && <span style={{ flexShrink: 0 }}>{opt.icon}</span>}
                </div>
              );
            })}
          </div>

          {/* Divisor */}
          <div style={{ height: '1px', background: '#F2F4F7', margin: '0 0 16px' }} />

          {/* Categoria */}
          <p style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: '#9BA3B2', margin: '0 0 8px' }}>
            Categoria
          </p>
          <Select
            options={categoriaOptions}
            value={categoria ?? categoriaOptions[0]}
            onChange={(opt: { value: string; label: string } | null) =>
              setCategoria(opt?.value ? opt : null)
            }
            styles={selectStyles}
            isSearchable={false}
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />

          {/* Preview escuro */}
          <div style={{ marginTop: '14px', background: 'linear-gradient(135deg, #1A1A2E 0%, #2D2D4E 100%)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245,166,35,.15)', border: '1px solid rgba(245,166,35,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,.45)', margin: 0, letterSpacing: '.3px', textTransform: 'uppercase' }}>
                Relatório a gerar
              </p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: '3px 0 0' }}>
                {TIPO_LABELS[tipo]} · {categoria?.label || 'Todas as categorias'}
              </p>
            </div>
          </div>
        </div>


   {/* ── Rodapé ── */}
        <div style={{ padding: '16px 24px 24px', display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #F2F4F7' }}>
          <button
            onClick={onClose}
            style={{
              all: 'unset' as any,
              height: '40px', padding: '0 18px', borderRadius: '10px',
              border: '1.5px solid #EAECF0', background: '#fff',
              fontSize: '13.5px', fontWeight: 500, color: '#667085',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
              gap: '6px', fontFamily: 'DM Sans, sans-serif',
              boxSizing: 'border-box' as const,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGerar}
            style={{
              all: 'unset' as any,
              height: '40px', padding: '0 20px', borderRadius: '10px',
              border: 'none', background: '#F5A623',
              fontSize: '13.5px', fontWeight: 700, color: '#fff',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
              gap: '7px', fontFamily: 'DM Sans, sans-serif',
              boxShadow: '0 1px 3px rgba(245,166,35,.4), 0 4px 12px rgba(245,166,35,.2)',
              boxSizing: 'border-box' as const,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Gerar relatório
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}