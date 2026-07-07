import { useState, useRef, useEffect } from 'react';
import { API_URL } from '../constants';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { icon: '📦', label: 'Estoque baixo', text: 'Quais materiais estão abaixo do mínimo?' },
  { icon: '📊', label: 'Resumo', text: 'Resumo geral do estoque' },
  { icon: '🔍', label: 'Ranking', text: 'Qual produto tem maior quantidade?' },
];

// Altura da bottom-nav do mobile (64px) + margem: o FAB fica acima dela
const NAV_CLEARANCE = 88;
const MOBILE_QUERY = '(max-width: 991px)';

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0, role: 'assistant',
      text: 'Olá! Sou O Almoxarife, seu assistente de estoque. Pergunte sobre produtos, quantidades, movimentações ou fornecedores.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [fabHovered, setFabHovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const ORIGIN = { bottom: isMobile ? NAV_CLEARANCE : 24, right: 24 };
  const SNAP_RADIUS = 50;
  const FAB_SIZE = 56;
  const CHAT_W = 390;
  const CHAT_H = 560;

  const [pos, setPos] = useState({ ...ORIGIN });
  const dragRef = useRef<{ startX: number; startY: number; startRight: number; startBottom: number; dragged: boolean } | null>(null);

  // Ao cruzar o breakpoint, volta o FAB para a origem correspondente
  // (ajuste de estado durante o render, conforme https://react.dev/learn/you-might-not-need-an-effect)
  const [prevIsMobile, setPrevIsMobile] = useState(isMobile);
  if (prevIsMobile !== isMobile) {
    setPrevIsMobile(isMobile);
    setPos({ bottom: isMobile ? NAV_CLEARANCE : 24, right: 24 });
  }

  const clampPos = (r: number, b: number) => {
    const w = open ? CHAT_W : FAB_SIZE;
    const h = open ? CHAT_H : FAB_SIZE;
    // no mobile o FAB não pode invadir a bottom-nav
    const minBottom = isMobile ? NAV_CLEARANCE - 16 : 0;
    return {
      right: Math.max(0, Math.min(window.innerWidth - w, r)),
      bottom: Math.max(minBottom, Math.min(window.innerHeight - h, b)),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // chat aberto em tela cheia no mobile não é arrastável
    if (open && isMobile) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startRight: pos.right, startBottom: pos.bottom, dragged: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = dragRef.current.startX - e.clientX;
    const dy = dragRef.current.startY - e.clientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.dragged = true;
    if (!dragRef.current.dragged) return;
    setPos(clampPos(dragRef.current.startRight + dx, dragRef.current.startBottom + dy));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const wasDrag = dragRef.current?.dragged;
    dragRef.current = null;
    if (wasDrag) {
      e.preventDefault();
      const dist = Math.sqrt((pos.right - ORIGIN.right) ** 2 + (pos.bottom - ORIGIN.bottom) ** 2);
      if (dist <= SNAP_RADIUS) { setPos({ ...ORIGIN }); setFabHovered(false); }
    } else if (!open) setOpen(true);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const closeChat = () => {
    setOpen(false);
    setFabHovered(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: nextId.current++, role: 'user', text: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setMessages(prev => [...prev, { id: nextId.current++, role: 'assistant', text: data.resposta, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { id: nextId.current++, role: 'assistant', text: 'Não consegui processar sua mensagem agora. Tente novamente ou pergunte sobre produtos, estoque e movimentações.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <>
      {/* ── FAB ── */}
      {!open && (
        <div
          className="chat-fab"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onMouseEnter={() => setFabHovered(true)}
          onMouseLeave={() => setFabHovered(false)}
          style={{
            position: 'fixed', bottom: `${pos.bottom}px`, right: `${pos.right}px`, zIndex: 9999,
            touchAction: 'none',
            display: 'flex', alignItems: 'center', gap: '0',
            background: '#f3f4f6',
            borderRadius: '999px',
            boxShadow: '0 2px 12px rgba(0,0,0,.10)',
            padding: fabHovered ? '6px 6px 6px 18px' : '6px',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'padding 0.2s ease',
          }}
        >
          <span style={{
            fontSize: '13px', color: '#9ca3af', fontFamily: 'DM Sans, sans-serif',
            fontWeight: 400, whiteSpace: 'nowrap', marginRight: fabHovered ? '12px' : '0',
            maxWidth: fabHovered ? '120px' : '0',
            overflow: 'hidden',
            opacity: fabHovered ? 1 : 0,
            transition: 'max-width 0.2s ease, opacity 0.2s ease, margin 0.2s ease',
          }}>
            Pergunte algo...
          </span>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: '#1e1b4b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <div style={{
              position: 'absolute', bottom: '1px', right: '1px',
              width: '11px', height: '11px', borderRadius: '50%',
              background: '#22C55E', border: '2px solid #f3f4f6',
            }} />
          </div>
        </div>
      )}

      {/* ── Chat Window ── */}
      {open && (
        <div style={{
          position: 'fixed', zIndex: 9998,
          overflow: 'hidden',
          background: '#FAFAFA',
          display: 'flex', flexDirection: 'column',
          animation: 'chatOpen 350ms cubic-bezier(.34,1.56,.64,1)',
          // mobile: tela cheia (cobre a bottom-nav); desktop: janela flutuante
          ...(isMobile
            ? { inset: 0, width: '100%', height: '100dvh', borderRadius: 0 }
            : {
                bottom: `${pos.bottom}px`, right: `${pos.right}px`,
                width: '390px', maxWidth: 'calc(100vw - 32px)',
                height: '560px', maxHeight: 'calc(100vh - 48px)',
                borderRadius: '24px',
                boxShadow: '0 25px 80px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.06)',
              }),
        }}>

          {/* ── Header ── */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={e => { const wasDrag = dragRef.current?.dragged; dragRef.current = null; if (wasDrag) e.preventDefault(); }}
            style={{
            padding: '0', flexShrink: 0,
            background: 'linear-gradient(160deg, #0f0a2e 0%, #1e1b4b 40%, #312e81 100%)',
            position: 'relative', overflow: 'hidden',
            cursor: isMobile ? 'default' : 'grab', touchAction: 'none',
          }}>
            {/* Subtle pattern overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 80% 20%, rgba(99,102,241,.25) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(139,92,246,.15) 0%, transparent 50%)',
            }} />

            {/* Close button */}
            <button
              onClick={closeChat}
              style={{
                position: 'absolute', top: '12px', right: '12px', zIndex: 2,
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(255,255,255,.1)', border: 'none',
                cursor: 'pointer', color: 'rgba(255,255,255,.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.2)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Profile section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px 16px', position: 'relative' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(255,255,255,.2), rgba(255,255,255,.05))',
                padding: '2px',
                flexShrink: 0,
                boxShadow: '0 4px 16px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.15)',
              }}>
                <div style={{
                  width: '100%', height: '100%', borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#1a1650',
                }}>
                  <img src="/almoxarife-avatar.png" alt="O Almoxarife" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff', letterSpacing: '-.3px', lineHeight: 1.2 }}>
                  O Almoxarife
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', marginTop: '4px', fontWeight: 400 }}>
                  Assistente inteligente de estoque
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: loading ? 'rgba(251,191,36,.15)' : 'rgba(34,197,94,.15)',
                    padding: '2px 8px 2px 6px', borderRadius: '10px',
                  }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: loading ? '#FBBF24' : '#22C55E',
                      boxShadow: loading ? '0 0 8px #FBBF24' : '0 0 8px #22C55E',
                      animation: loading ? 'chatPulse 1.5s infinite' : 'none',
                    }} />
                    <span style={{ fontSize: '10px', color: loading ? '#FBBF24' : '#22C55E', fontWeight: 600, letterSpacing: '.2px' }}>
                      {loading ? 'ANALISANDO' : 'ONLINE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Messages Area ── */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 14px 8px',
            display: 'flex', flexDirection: 'column', gap: '12px',
            background: '#FAFAFA',
          }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end', gap: '8px',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '10px',
                    padding: '1.5px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #4338ca, #6366f1)',
                    boxShadow: '0 2px 6px rgba(67,56,202,.2)',
                  }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '8.5px',
                      overflow: 'hidden', background: '#1e1b4b',
                    }}>
                      <img src="/almoxarife-avatar.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  </div>
                )}
                <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #312e81, #4338ca)'
                      : '#FFFFFF',
                    color: msg.role === 'user' ? '#fff' : '#1F2937',
                    fontSize: '13px', lineHeight: 1.6,
                    boxShadow: msg.role === 'user'
                      ? '0 2px 12px rgba(49,46,129,.3)'
                      : '0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.text}
                  </div>
                  <span style={{
                    fontSize: '10px', color: '#B0B0B0', marginTop: '4px',
                    paddingLeft: msg.role === 'user' ? '0' : '2px',
                    paddingRight: msg.role === 'user' ? '2px' : '0',
                  }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '10px',
                  padding: '1.5px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #4338ca, #6366f1)',
                  boxShadow: '0 2px 6px rgba(67,56,202,.2)',
                }}>
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '8.5px',
                    overflow: 'hidden', background: '#1e1b4b',
                  }}>
                    <img src="/almoxarife-avatar.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                </div>
                <div style={{
                  padding: '12px 18px', borderRadius: '16px 16px 16px 4px',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)',
                  display: 'flex', gap: '4px', alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#4338ca',
                      animation: 'chatDot 1.4s infinite ease-in-out',
                      animationDelay: `${i * 0.16}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showSuggestions && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '36px' }}>
                <span style={{
                  fontSize: '10px', fontWeight: 600, color: '#9CA3AF',
                  textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: '2px',
                }}>
                  Sugestões
                </span>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.text)}
                    style={{
                      background: '#fff',
                      border: '1px solid #E8E8ED',
                      borderRadius: '12px', padding: '10px 14px',
                      fontSize: '12.5px', color: '#4B5563', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 180ms ease',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      boxShadow: '0 1px 2px rgba(0,0,0,.03)',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget;
                      el.style.borderColor = '#4338ca';
                      el.style.background = '#EEF2FF';
                      el.style.color = '#312e81';
                      el.style.transform = 'translateX(4px)';
                      el.style.boxShadow = '0 2px 8px rgba(67,56,202,.1)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget;
                      el.style.borderColor = '#E8E8ED';
                      el.style.background = '#fff';
                      el.style.color = '#4B5563';
                      el.style.transform = 'translateX(0)';
                      el.style.boxShadow = '0 1px 2px rgba(0,0,0,.03)';
                    }}
                  >
                    <span style={{
                      width: '30px', height: '30px', borderRadius: '8px',
                      background: '#F1F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', flexShrink: 0,
                    }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '1px' }}>{s.label}</div>
                      <div style={{ fontSize: '12px', lineHeight: 1.3 }}>{s.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Area ── */}
          <div style={{
            padding: '12px 14px 14px', flexShrink: 0,
            borderTop: '1px solid #EBEBEB',
            background: '#fff',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#F5F5F7', borderRadius: '16px',
              border: inputFocused ? '1.5px solid #4338ca' : '1.5px solid transparent',
              padding: '4px 4px 4px 16px',
              transition: 'border-color 200ms, box-shadow 200ms',
              boxShadow: inputFocused ? '0 0 0 3px rgba(67,56,202,.08)' : 'none',
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Digite sua pergunta..."
                disabled={loading}
                style={{
                  flex: 1, height: '38px', border: 'none',
                  padding: 0, fontSize: '13px', outline: 'none',
                  background: 'transparent', color: '#1F2937',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  width: '38px', height: '38px', borderRadius: '12px',
                  border: 'none',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg, #312e81, #4338ca)'
                    : '#DDDDE3',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 200ms',
                  boxShadow: input.trim() && !loading ? '0 3px 12px rgba(67,56,202,.35)' : 'none',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatOpen {
          from { opacity: 0; transform: translateY(20px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes chatPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
