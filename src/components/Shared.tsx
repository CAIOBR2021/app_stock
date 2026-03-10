import React, { useState, useEffect } from 'react';

export function ModalComponent({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void; }) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  
  return (
    <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999 }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

// --- MODAL DE GERENCIAMENTO DE HISTÓRICO COM VISUAL DE TABELA ---
export function GerenciarHistoricoModal({ show, onClose, title, items, onRemove, onClearAll }: { show: boolean; onClose: () => void; title: string; items: string[]; onRemove: (i: string) => void; onClearAll: () => void; }) {
  if (!show) return null;
  return (
    <ModalComponent title={`Gerenciar Sugestões: ${title}`} onClose={onClose}>
      <div className="table-responsive" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        <table className="table table-hover align-middle mb-0 border">
          <thead className="table-light sticky-top">
            <tr>
              <th className="border-bottom text-secondary" style={{ fontSize: '0.85rem' }}>VALOR SALVO</th>
              <th className="border-bottom text-end text-secondary" style={{ fontSize: '0.85rem' }}>AÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="fw-medium">{item}</td>
                <td className="text-end">
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => onRemove(item)} title="Remover">
                    <i className="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center text-muted py-4">Nenhuma opção visível salva no histórico.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="d-flex justify-content-between mt-4">
        <button type="button" className="btn btn-danger" onClick={onClearAll}>Limpar Histórico</button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Fechar</button>
      </div>
    </ModalComponent>
  );
}

export function PasswordEntryModal({ onClose, onSubmit, loading, error, title, message, submitText = 'Confirmar' }: { onClose: () => void; onSubmit: (password: string) => void; loading: boolean; error: string; title: string; message: string; submitText?: string; }) {
  const [password, setPassword] = useState('');
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(password);
    }
  };
  return (
    <ModalComponent title={title} onClose={onClose}>
      <div>
        <p>{message}</p>
        <div className="mb-3">
          <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={handleKeyPress} autoFocus />
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="text-end">
          <button type="button" className="btn btn-secondary me-2" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" disabled={loading} onClick={() => onSubmit(password)}>
            {loading ? 'Verificando...' : submitText}
          </button>
        </div>
      </div>
    </ModalComponent>
  );
}

export function Paginacao({ totalItems, itemsPerPage, currentPage, onPageChange }: { totalItems: number; itemsPerPage: number; currentPage: number; onPageChange: (page: number) => void; }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;
  const handlePageClick = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };
  const renderPageNumbers = () => {
    const pageNumbers: (number | string)[] = [];
    const pagesToShow = 3;
    if (totalPages <= pagesToShow + 4) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3) { startPage = 2; endPage = 3; }
      if (currentPage >= totalPages - 2) { startPage = totalPages - 2; endPage = totalPages - 1; }
      if (startPage > 2) pageNumbers.push('...');
      for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
      if (endPage < totalPages - 1) pageNumbers.push('...');
      pageNumbers.push(totalPages);
    }
    return pageNumbers.map((page, index) => (
      <li key={index} className={`page-item ${page === '...' ? 'disabled' : ''} ${currentPage === page ? 'active' : ''}`}>
        <button className="page-link" onClick={() => typeof page === 'number' && handlePageClick(page)}>{page}</button>
      </li>
    ));
  };
  return (
    <nav className="d-flex flex-column flex-sm-row justify-content-between align-items-center flex-wrap gap-2 w-100">
      <div>
        {totalItems > 0 && (
          <span className="text-muted small">
            Exibindo {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
          </span>
        )}
      </div>
      <ul className="pagination m-0">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => handlePageClick(currentPage - 1)} aria-label="Anterior">&lt;</button>
        </li>
        {renderPageNumbers()}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => handlePageClick(currentPage + 1)} aria-label="Próxima">&gt;</button>
        </li>
      </ul>
    </nav>
  );
}