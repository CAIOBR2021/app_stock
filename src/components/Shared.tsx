import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';
import { API_URL } from '../constants';

// ── SVG ICONS ─────────────────────────────────────────────────────────────────

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconGearEmpty = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="44" height="44" style={{ opacity: .25 }}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </svg>
);

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

// ── MODAL COMPONENT ───────────────────────────────────────────────────────────

export function ModalComponent({
  children, title, onClose,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => { window.removeEventListener('keydown', handleEsc); };
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
        zIndex: 9999, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '14px',
          boxShadow: '0 12px 32px rgba(0,0,0,.12)',
          width: '100%', maxWidth: '520px', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          margin: 'auto', position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #E2E5EC', flexShrink: 0 }}>
          <h5 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1117', margin: 0 }}>{title}</h5>
          <button onClick={onClose} style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── GERENCIAR HISTÓRICO MODAL ─────────────────────────────────────────────────

export function GerenciarHistoricoModal({
  show, onClose, title, items, onRemove, onClearAll,
}: {
  show: boolean;
  onClose: () => void;
  title: string;
  items: string[];
  onRemove: (i: string) => void;
  onClearAll: () => void;
}) {
  if (!show) return null;

  return (
    <ModalComponent title={`Gerenciar: ${title}`} onClose={onClose}>
      <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px' }}>
        Remova os itens abaixo para que deixem de aparecer como sugestões automáticas.
      </p>

      <div style={{ maxHeight: '45vh', overflowY: 'auto', paddingRight: '4px' }}>
        {items.length > 0 ? (
          items.map((item, idx) => (
            <div key={idx} className="history-card-item">
              <span className="history-card-text">{item}</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0, display: 'flex', alignItems: 'center' }}
                onClick={() => onRemove(item)}
                title="Remover"
              >
                <IconTrash />
              </button>
            </div>
          ))
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
            <div style={{ marginBottom: '8px' }}><IconGearEmpty /></div>
            <p style={{ fontSize: '13px', margin: 0 }}>Nenhum item salvo no histórico deste campo.</p>
          </div>
        )}
      </div>

      <div className="ds-modal-footer" style={{ marginTop: '20px' }}>
        <button
          type="button"
          style={{ background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', padding: 0, opacity: items.length === 0 ? .4 : 1 }}
          onClick={() => onClearAll()}
          disabled={items.length === 0}
        >
          Limpar Tudo
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ borderRadius: '999px', padding: '0 24px', height: '36px', fontWeight: 700, fontSize: '13.5px' }}
          onClick={onClose}
        >
          Concluído
        </button>
      </div>
    </ModalComponent>
  );
}

// ── PASSWORD ENTRY MODAL ──────────────────────────────────────────────────────

export function PasswordEntryModal({
  onClose, onSubmit, loading, error, title, message, submitText = 'Confirmar',
}: {
  onClose: () => void;
  onSubmit: (password: string) => void;
  loading: boolean;
  error: string;
  title: string;
  message: string;
  submitText?: string;
}) {
  const [password, setPassword] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onSubmit(password); }
  };

  return (
    <ModalComponent title={title} onClose={onClose}>
      <p style={{ fontSize: '13.5px', color: 'var(--text-2)', marginBottom: '16px' }}>{message}</p>

      <div style={{ marginBottom: '12px' }}>
        <input
          type="password"
          className="form-control"
          style={{ height: '44px', borderRadius: '10px', fontSize: '15px' }}
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>

      {error && (
        <div style={{ background: 'var(--danger-light)', border: '1px solid #FFC5C5', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: 'var(--danger)', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ borderRadius: '999px', padding: '0 20px', height: '36px' }}
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ borderRadius: '999px', padding: '0 24px', height: '36px', fontWeight: 700 }}
          disabled={loading}
          onClick={() => onSubmit(password)}
        >
          {loading ? 'Verificando...' : submitText}
        </button>
      </div>
    </ModalComponent>
  );
}

// ── MODAL DE IDENTIFICAÇÃO DO OPERADOR ────────────────────────────────────────

const IconUserField = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconLock = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

interface PerfilOption {
  value: string;
  label: string;
  locked: boolean;
}

const PERFIL_OPTIONS: PerfilOption[] = [
  { value: 'almoxarifado', label: 'Almoxarifado', locked: true },
  { value: 'seguranca', label: 'Segurança do Trabalho', locked: false },
];

const DARK_BG = '#1A1A2E';
const DARK_BORDER = 'rgba(255,255,255,.14)';

const darkSelectStyles: StylesConfig = {
  control: (_, state) => ({
    backgroundColor: 'rgba(255,255,255,.06)',
    borderColor: state.isFocused ? '#F5A623' : DARK_BORDER,
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderRadius: '12px',
    minHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245,166,35,.15)' : 'none',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'border-color .2s ease, box-shadow .2s ease',
  }),
  valueContainer: (base) => ({ ...base, padding: '0 14px' }),
  placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,.38)', fontSize: '15px' }),
  singleValue: (base) => ({ ...base, color: '#fff', fontSize: '15px', fontFamily: 'DM Sans, sans-serif' }),
  input: () => ({ color: '#fff', margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: () => ({ color: 'rgba(255,255,255,.45)', padding: '0 12px', display: 'flex' }),
  menu: () => ({
    backgroundColor: DARK_BG,
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,.12)',
    boxShadow: '0 12px 32px rgba(0,0,0,.6)',
    overflow: 'hidden',
    marginTop: '6px',
  }),
  menuList: () => ({
    backgroundColor: DARK_BG,
    padding: '4px',
    borderRadius: '12px',
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  option: (_, state) => ({
    backgroundColor: state.isSelected
      ? '#F5A623'
      : state.isFocused
        ? 'rgba(245,166,35,.12)'
        : 'transparent',
    color: state.isSelected ? DARK_BG : '#fff',
    fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: state.isSelected ? 700 : 400,
    borderRadius: '8px',
    padding: '10px 14px',
    cursor: 'pointer',
    transition: 'background-color .15s ease',
  }),
};

/**
 * Modal para identificar o operador que regista as movimentações.
 * - Sem `onClose` → modo obrigatório (não fecha por ESC nem por clique fora; sem botão Cancelar).
 * - Com `onClose` → modo "alterar nome" (permite cancelar).
 */
export function IdentificacaoModal({
  onConfirm,
  initialValue = '',
  initialPerfil = '',
  onClose,
}: {
  onConfirm: (nome: string, perfil: string) => void;
  initialValue?: string;
  initialPerfil?: string;
  onClose?: () => void;
}) {
  const [nome, setNome] = useState(initialValue);
  const [perfil, setPerfil] = useState(initialPerfil);
  const [focused, setFocused] = useState(false);
  const [senha, setSenha] = useState('');
  const [senhaErro, setSenhaErro] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [senhaVerificada, setSenhaVerificada] = useState(false);
  const [senhaFocused, setSenhaFocused] = useState(false);

  const precisaSenha = perfil === 'almoxarifado' && !senhaVerificada;
  const valido = nome.trim().length >= 2 && perfil !== '' && (!precisaSenha || senha.length >= 4);

  // ESC só fecha quando NÃO é obrigatório
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const submit = async () => {
    if (!valido || verificando) return;
    if (perfil === 'almoxarifado' && !senhaVerificada) {
      setVerificando(true);
      setSenhaErro('');
      try {
        const res = await fetch(`${API_URL}/auth/verify-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: senha }),
        });
        if (!res.ok) {
          setSenhaErro('Senha incorreta.');
          setVerificando(false);
          return;
        }
        setSenhaVerificada(true);
      } catch {
        setSenhaErro('Não foi possível verificar. Tente novamente.');
        setVerificando(false);
        return;
      }
      setVerificando(false);
    }
    onConfirm(nome.trim(), perfil);
  };

  return ReactDOM.createPortal(
    <div
      onClick={() => { if (onClose) onClose(); }} // clicar fora só fecha se não for obrigatório
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,.85)',
        zIndex: 10000, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="ident-title"
        style={{
          background: 'var(--accent)', borderRadius: '20px',
          boxShadow: '0 30px 80px rgba(0,0,0,.55)',
          border: '1px solid rgba(255,255,255,.08)',
          width: '100%', maxWidth: '400px',
          padding: '34px 32px 30px', position: 'relative', overflow: 'hidden',
          animation: 'fadeUp .28s ease both',
        }}
      >
        {/* Brilho âmbar (como o menu lateral) */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(160deg, rgba(245,166,35,.12) 0%, transparent 55%)',
        }} />

        <div style={{ position: 'relative' }}>
          {/* Fechar (apenas no modo edição) */}
          {onClose && (
            <button
              type="button" onClick={onClose} aria-label="Fechar"
              style={{
                position: 'absolute', top: '-6px', right: '-6px',
                width: '30px', height: '30px', borderRadius: '8px',
                border: 'none', background: 'transparent', color: 'rgba(255,255,255,.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          {/* Badge dourado */}
          <div style={{
            width: '50px', height: '50px', borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '18px', boxShadow: '0 8px 22px rgba(245,166,35,.35)',
            fontWeight: 700, fontSize: '20px',
          }}>
            {onClose && nome.trim() ? nome.trim().charAt(0).toUpperCase() : <IconUserField />}
          </div>

          {/* Título + apoio */}
          <h5 id="ident-title" style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-.3px', margin: '0 0 7px' }}>
            {onClose ? 'Alterar identificação' : 'Identificação'}
          </h5>
          <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,.55)', lineHeight: 1.55, margin: '0 0 24px' }}>
            Qual é o seu nome? Ele ficará registado nas movimentações que fizer.
          </p>

          {/* Campo com ícone */}
          <label htmlFor="ident-input" style={{
            display: 'block', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.6px',
            textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: '8px',
          }}>
            Nome do operador
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)',
              color: focused ? 'var(--primary)' : 'rgba(255,255,255,.45)', display: 'flex',
              pointerEvents: 'none', transition: 'color .2s ease',
            }}>
              <IconUserField />
            </span>
            <input
              id="ident-input"
              className="ident-input-dark"
              style={{
                width: '100%', height: '50px', borderRadius: '12px',
                background: 'rgba(255,255,255,.06)',
                border: `1.5px solid ${focused ? 'var(--primary)' : 'rgba(255,255,255,.14)'}`,
                color: '#fff', fontSize: '15px', paddingLeft: '46px', paddingRight: '14px',
                outline: 'none', fontFamily: 'DM Sans, sans-serif',
                transition: 'border-color .2s ease, box-shadow .2s ease',
                boxShadow: focused ? '0 0 0 3px rgba(245,166,35,.15)' : 'none',
              }}
              placeholder="Escreva o seu nome"
              value={nome}
              autoFocus
              maxLength={60}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            />
          </div>

          {/* Select de perfil */}
          <label style={{
            display: 'block', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.6px',
            textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: '8px', marginTop: '16px',
          }}>
            Perfil de acesso
          </label>
          <Select
            options={PERFIL_OPTIONS}
            value={PERFIL_OPTIONS.find(o => o.value === perfil) || null}
            onChange={(opt) => {
              const novoPerf = (opt as PerfilOption | null)?.value ?? '';
              setPerfil(novoPerf);
              setSenha('');
              setSenhaErro('');
              setSenhaVerificada(false);
            }}
            placeholder="Selecione o seu perfil"
            styles={darkSelectStyles}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            isSearchable={false}
            formatOptionLabel={(opt) => (
              <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                {opt.label}
                {opt.locked && (
                  <span style={{ opacity: 0.55, display: 'flex', alignItems: 'center' }}>
                    <IconLock size={13} />
                  </span>
                )}
              </span>
            )}
          />

          {/* Campo de senha — visível apenas quando Almoxarifado ainda não foi verificado */}
          {precisaSenha && (
            <>
              <label style={{
                display: 'block', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.6px',
                textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: '8px', marginTop: '16px',
              }}>
                Senha de acesso
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)',
                  color: senhaFocused ? 'var(--primary)' : 'rgba(255,255,255,.45)', display: 'flex',
                  pointerEvents: 'none', transition: 'color .2s ease',
                }}>
                  <IconLock />
                </span>
                <input
                  type="password"
                  className="ident-input-dark"
                  style={{
                    width: '100%', height: '50px', borderRadius: '12px',
                    background: 'rgba(255,255,255,.06)',
                    border: `1.5px solid ${senhaErro ? '#ff6b6b' : senhaFocused ? 'var(--primary)' : 'rgba(255,255,255,.14)'}`,
                    color: '#fff', fontSize: '15px', paddingLeft: '46px', paddingRight: '14px',
                    outline: 'none', fontFamily: 'DM Sans, sans-serif',
                    transition: 'border-color .2s ease, box-shadow .2s ease',
                    boxShadow: senhaErro ? '0 0 0 3px rgba(255,107,107,.15)' : senhaFocused ? '0 0 0 3px rgba(245,166,35,.15)' : 'none',
                  }}
                  placeholder="Senha de administrador"
                  value={senha}
                  maxLength={100}
                  onFocus={() => setSenhaFocused(true)}
                  onBlur={() => setSenhaFocused(false)}
                  onChange={e => { setSenha(e.target.value); setSenhaErro(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                />
              </div>
              {senhaErro && (
                <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {senhaErro}
                </p>
              )}
            </>
          )}

          {/* Ações */}
          {onClose ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginTop: '26px' }}>
              <button
                type="button" onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, color: 'rgba(255,255,255,.55)', padding: 0 }}
              >
                Cancelar
              </button>
              <button
                type="button" disabled={!valido || verificando} onClick={submit}
                style={{
                  border: 'none', cursor: valido && !verificando ? 'pointer' : 'not-allowed',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: 'var(--accent)', borderRadius: '11px', padding: '0 26px', height: '46px',
                  fontSize: '14px', fontWeight: 700, opacity: valido && !verificando ? 1 : .4,
                  boxShadow: valido && !verificando ? '0 8px 20px rgba(245,166,35,.4)' : 'none',
                  transition: 'opacity .2s ease, box-shadow .2s ease',
                }}
              >
                {verificando ? 'Verificando...' : 'Guardar'}
              </button>
            </div>
          ) : (
            <button
              type="button" disabled={!valido || verificando} onClick={submit}
              style={{
                width: '100%', marginTop: '26px',
                border: 'none', cursor: valido && !verificando ? 'pointer' : 'not-allowed',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                color: 'var(--accent)', borderRadius: '12px', height: '50px',
                fontSize: '14.5px', fontWeight: 700, opacity: valido && !verificando ? 1 : .4,
                boxShadow: valido && !verificando ? '0 10px 24px rgba(245,166,35,.42)' : 'none',
                transition: 'opacity .2s ease, box-shadow .2s ease',
              }}
            >
              {verificando ? 'Verificando...' : 'Continuar'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── PAGINAÇÃO ─────────────────────────────────────────────────────────────────

export function Paginacao({
  totalItems, itemsPerPage, currentPage, onPageChange,
}: {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  const go = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    let start = Math.max(2, currentPage - 1);
    let end   = Math.min(totalPages - 1, currentPage + 1);
    if (currentPage <= 3)               { start = 2; end = 3; }
    if (currentPage >= totalPages - 2)  { start = totalPages - 2; end = totalPages - 1; }
    if (start > 2)           pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  const btnBase: React.CSSProperties = {
    width: '32px', height: '32px', borderRadius: '7px',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text-2)', fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px', fontWeight: 500, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all var(--transition)',
  };

  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: 'var(--primary)', borderColor: 'var(--primary)',
    color: '#fff', fontWeight: 700,
  };

  return (
    <nav style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', width: '100%', marginTop: '12px' }}>
      {/* Info */}
      <span style={{ fontSize: '12.5px', color: 'var(--text-3)', fontWeight: 500 }}>
        Exibindo{' '}
        <strong style={{ color: 'var(--text-1)' }}>{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</strong>
        {' – '}
        <strong style={{ color: 'var(--text-1)' }}>{Math.min(currentPage * itemsPerPage, totalItems)}</strong>
        {' de '}
        <strong style={{ color: 'var(--text-1)' }}>{totalItems}</strong>
      </span>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {/* Prev */}
        <button style={{ ...btnBase, opacity: currentPage === 1 ? .4 : 1 }} onClick={() => go(currentPage - 1)} disabled={currentPage === 1} aria-label="Anterior">
          <IconChevronLeft />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={i} style={{ padding: '0 4px', color: 'var(--text-3)', fontSize: '12px', display: 'flex', alignItems: 'center' }}>…</span>
          ) : (
            <button
              key={i}
              style={currentPage === p ? btnActive : btnBase}
              onClick={() => typeof p === 'number' && go(p)}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button style={{ ...btnBase, opacity: currentPage === totalPages ? .4 : 1 }} onClick={() => go(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Próxima">
          <IconChevronRight />
        </button>
      </div>
    </nav>
  );
}