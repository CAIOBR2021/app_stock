import { useState, useRef, useEffect } from 'react';
import { API_URL } from '../constants';
import { useChatViewportLock } from '../hooks';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { icon: '🔍', label: 'Consultar', text: 'Quantos sacos de cimento temos em estoque?' },
  { icon: '📍', label: 'Localização', text: 'Onde está armazenada a argamassa?' },
  { icon: '📝', label: 'Solicitar', text: 'Quero solicitar 10 sacos de argamassa' },
];

const BOAS_VINDAS =
  'Olá! Sou O Almoxarife, seu assistente de estoque. Você pode consultar quantidades, ' +
  'localização e especificações dos materiais, ou solicitar a retirada de um item — ' +
  'eu registro o pedido para o almoxarifado avaliar.';

/**
 * Chat em tela cheia do perfil Visitante: única forma de acesso ao estoque
 * (somente leitura + criação de solicitação). Envia o histórico completo ao
 * backend para que a IA conduza o fluxo de solicitação em múltiplos turnos.
 */
export function VisitanteChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'assistant', text: BOAS_VINDAS, timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  // Chat ocupa a tela toda: trava a página para o teclado não a empurrar
  useChatViewportLock(true);

  // Rola SOMENTE o contêiner de mensagens (scrollIntoView rolaria a página
  // inteira junto, empurrando o layout para fora da tela no mobile)
  const rolarParaFim = (suave = true) => {
    const el = messagesEndRef.current?.parentElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: suave ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    rolarParaFim();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: nextId.current++, role: 'user', text: text.trim(), timestamp: new Date() };
    const historico = [...messages, userMsg];
    setMessages(historico);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat/visitante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagens: historico.map(({ role, text }) => ({ role, text })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.resposta) throw new Error();
      setMessages(prev => [...prev, { id: nextId.current++, role: 'assistant', text: data.resposta, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, {
        id: nextId.current++, role: 'assistant',
        text: 'Não consegui processar sua mensagem agora. Tente novamente em instantes.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const showSuggestions = messages.length === 1 && !loading;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0, flex: 1,
      background: '#FAFAFA',
      borderRadius: '16px', overflow: 'hidden',
      border: '1px solid var(--border)',
      boxShadow: '0 4px 24px rgba(0,0,0,.06)',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '16px 20px', flexShrink: 0,
        background: 'linear-gradient(160deg, #0f0a2e 0%, #1e1b4b 40%, #312e81 100%)',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <div style={{
          width: '46px', height: '46px', borderRadius: '14px',
          overflow: 'hidden', background: '#1a1650', flexShrink: 0,
          boxShadow: '0 4px 16px rgba(0,0,0,.25)',
        }}>
          <img src="/almoxarife-avatar.png" alt="O Almoxarife" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', letterSpacing: '-.3px' }}>O Almoxarife</div>
          <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.55)', marginTop: '2px' }}>
            Consultas de estoque e solicitações de material
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: loading ? 'rgba(251,191,36,.15)' : 'rgba(34,197,94,.15)',
          padding: '3px 9px 3px 7px', borderRadius: '10px', flexShrink: 0,
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: loading ? '#FBBF24' : '#22C55E',
          }} />
          <span style={{ fontSize: '10px', color: loading ? '#FBBF24' : '#22C55E', fontWeight: 600 }}>
            {loading ? 'ANALISANDO' : 'ONLINE'}
          </span>
        </div>
      </div>

      {/* ── Mensagens ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '18px 16px 8px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        overscrollBehavior: 'contain',
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
                overflow: 'hidden', background: '#1e1b4b', flexShrink: 0,
              }}>
                <img src="/almoxarife-avatar.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #312e81, #4338ca)'
                  : '#FFFFFF',
                color: msg.role === 'user' ? '#fff' : '#1F2937',
                fontSize: '13.5px', lineHeight: 1.6,
                boxShadow: msg.role === 'user'
                  ? '0 2px 12px rgba(49,46,129,.3)'
                  : '0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {msg.text}
              </div>
              <span style={{ fontSize: '10px', color: '#B0B0B0', marginTop: '4px' }}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '10px',
              overflow: 'hidden', background: '#1e1b4b', flexShrink: 0,
            }}>
              <img src="/almoxarife-avatar.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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

        {showSuggestions && (
          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '38px', maxWidth: '440px' }}>
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

      {/* ── Input ── */}
      <div style={{
        padding: '12px 14px 14px', flexShrink: 0,
        borderTop: '1px solid #EBEBEB', background: '#fff',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#F5F5F7', borderRadius: '16px',
          border: inputFocused ? '1.5px solid #4338ca' : '1.5px solid transparent',
          padding: '4px 4px 4px 16px',
          transition: 'border-color 200ms',
        }}>
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setInputFocused(true);
              // teclado virtual abrindo: mantém a conversa visível após a animação
              setTimeout(() => rolarParaFim(false), 300);
            }}
            onBlur={() => setInputFocused(false)}
            placeholder="Pergunte sobre o estoque ou solicite um material..."
            disabled={loading}
            autoFocus
            style={{
              flex: 1, height: '40px', border: 'none',
              padding: 0, fontSize: '13.5px', outline: 'none',
              background: 'transparent', color: '#1F2937',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #312e81, #4338ca)'
                : '#DDDDE3',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 200ms',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
