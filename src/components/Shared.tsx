import React, { useState, useEffect } from 'react';
import { Trash3Fill, GearFill } from 'react-bootstrap-icons';

// --- ESTILOS COMPARTILHADOS PARA O NOVO DESIGN ---
const modalStyles = `
  .modern-modal-content {
    border-radius: 20px !important;
    border: none !important;
  }
  .history-card-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    background: #f8fafc;
    border: 1px solid #edf2f7;
    border-radius: 12px;
    margin-bottom: 10px;
    transition: all 0.2s ease;
  }
  .history-card-item:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }
  .history-card-text {
    font-weight: 500;
    color: #334155;
    font-size: 0.95rem;
    word-break: break-word;
  }
  .empty-state-container {
    padding: 40px 20px;
    text-align: center;
    color: #94a3b8;
  }
`;

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
      <style>{modalStyles}</style>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg modern-modal-content">
          <div className="modal-header border-0 px-4 pt-4">
            <h5 className="modal-title fw-bold text-dark">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

// --- MODAL DE GERENCIAMENTO DE HISTÓRICO COM VISUAL DE CARDS REFINADOS ---
export function GerenciarHistoricoModal({ 
  show, 
  onClose, 
  title, 
  items, 
  onRemove, 
  onClearAll 
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
      <p className="text-muted small mb-4">
        Remova os itens abaixo para que eles deixem de aparecer como sugestões automáticas.
      </p>
      
      <div className="custom-scroll" style={{ maxHeight: '45vh', overflowY: 'auto', paddingRight: '5px' }}>
        {items.length > 0 ? (
          items.map((item, idx) => (
            <div key={idx} className="history-card-item">
              <span className="history-card-text">{item}</span>
              <button 
                type="button" 
                className="btn btn-link text-danger p-0 border-0" 
                onClick={() => onRemove(item)}
                title="Remover"
              >
                <Trash3Fill size={18} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state-container">
            <div className="mb-2 opacity-25">
              <GearFill size={48} />
            </div>
            <p className="mb-0 small">Nenhum item salvo no histórico deste campo.</p>
          </div>
        )}
      </div>

      <div className="d-flex justify-content-between align-items-center mt-4 pt-2 border-top">
        <button 
          type="button" 
          className="btn btn-link text-danger text-decoration-none fw-bold p-0" 
          onClick={() => {
            if(window.confirm("Deseja ocultar todas as sugestões deste campo?")) onClearAll();
          }}
          disabled={items.length === 0}
        >
          Limpar Tudo
        </button>
        <button 
          type="button" 
          className="btn btn-primary px-4 rounded-pill fw-bold" 
          onClick={onClose}
        >
          Concluído
        </button>
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
        <p className="text-secondary">{message}</p>
        <div className="mb-3">
          <input 
            type="password" 
            className="form-control form-control-lg" 
            style={{ borderRadius: '12px' }}
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            onKeyPress={handleKeyPress} 
            autoFocus 
          />
        </div>
        {error && <div className="alert alert-danger py-2" style={{ borderRadius: '10px' }}>{error}</div>}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button type="button" className="btn btn-light px-4 rounded-pill" onClick={onClose}>Cancelar</button>
          <button 
            type="button" 
            className="btn btn-primary px-4 rounded-pill fw-bold" 
            disabled={loading} 
            onClick={() => onSubmit(password)}
          >
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
        <button 
          className="page-link border-0 mx-1 rounded" 
          style={currentPage === page ? { borderRadius: '8px' } : { borderRadius: '8px', color: '#64748b' }}
          onClick={() => typeof page === 'number' && handlePageClick(page)}
        >
          {page}
        </button>
      </li>
    ));
  };

  return (
    <nav className="d-flex flex-column flex-sm-row justify-content-between align-items-center flex-wrap gap-3 w-100 mt-3">
      <div>
        {totalItems > 0 && (
          <span className="text-muted small fw-medium">
            Exibindo {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
          </span>
        )}
      </div>
      <ul className="pagination pagination-sm m-0">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button className="page-link border-0 rounded-circle" onClick={() => handlePageClick(currentPage - 1)} aria-label="Anterior">&lt;</button>
        </li>
        {renderPageNumbers()}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button className="page-link border-0 rounded-circle" onClick={() => handlePageClick(currentPage + 1)} aria-label="Próxima">&gt;</button>
        </li>
      </ul>
    </nav>
  );
}