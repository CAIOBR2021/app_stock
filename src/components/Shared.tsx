import React, { useState, useEffect } from 'react';

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
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="modal"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,.6)', zIndex: 9999 }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
          <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <h5 className="modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-.3px', margin: 0 }}>
              {title}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body" style={{ padding: '20px 24px' }}>{children}</div>
        </div>
      </div>
    </div>
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

      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)',
        }}
      >
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