import type { Tema } from '../theme';

// ── ÍCONES ────────────────────────────────────────────────────────────────────

const IconSol = ({ size = 15 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={size} height={size}>
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 1.5v2M12 20.5v2M3.5 12h-2M22.5 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" />
  </svg>
);

const IconLua = ({ size = 15 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const IconMonitor = ({ size = 15 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

// ── SELETOR (sidebar, desktop) ────────────────────────────────────────────────

const OPCOES: { id: Tema; label: string; titulo: string; Icon: typeof IconSol }[] = [
  { id: 'claro', label: 'Claro', titulo: 'Sempre claro', Icon: IconSol },
  { id: 'escuro', label: 'Escuro', titulo: 'Sempre escuro', Icon: IconLua },
  { id: 'sistema', label: 'Auto', titulo: 'Acompanhar o sistema', Icon: IconMonitor },
];

/**
 * Controle segmentado de três estados no rodapé da sidebar.
 *
 * Três botões em vez de um interruptor porque "acompanhar o sistema" é uma
 * escolha distinta de claro e de escuro — num interruptor de dois estados ela
 * não teria como ser representada, e o app deixaria de seguir o modo noturno
 * agendado do Windows.
 *
 * Vive sobre a sidebar, que é escura nos dois temas: por isso as cores aqui
 * são os tokens --on-dark-*, e não os de texto comuns.
 */
export function SeletorTema({ tema, onChange }: { tema: Tema; onChange: (t: Tema) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      style={{
        display: 'flex',
        gap: '2px',
        padding: '3px',
        marginBottom: '10px',
        borderRadius: '9px',
        background: 'rgba(255, 255, 255, .06)',
      }}
    >
      {OPCOES.map(({ id, label, titulo, Icon }) => {
        const ativo = tema === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={ativo}
            title={titulo}
            onClick={() => onChange(id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '6px 4px',
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '.2px',
              background: ativo ? 'rgba(245, 166, 35, .18)' : 'transparent',
              color: ativo ? 'var(--primary)' : 'var(--on-dark-2)',
              transition: 'background var(--transition), color var(--transition)',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── BOTÃO COMPACTO (header mobile) ────────────────────────────────────────────

/**
 * Alterna claro ↔ escuro num toque. No mobile não há espaço para o segmentado,
 * e o ícone mostra o tema que o toque VAI aplicar — não o atual —, que é a
 * convenção que o usuário já conhece do sistema operacional.
 */
export function BotaoTema({
  efetivo,
  onToggle,
}: {
  efetivo: 'claro' | 'escuro';
  onToggle: () => void;
}) {
  const vaiPara = efetivo === 'escuro' ? 'claro' : 'escuro';
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`Mudar para o modo ${vaiPara}`}
      aria-label={`Mudar para o modo ${vaiPara}`}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background var(--transition), color var(--transition)',
      }}
    >
      {vaiPara === 'escuro' ? <IconLua size={17} /> : <IconSol size={17} />}
    </button>
  );
}
