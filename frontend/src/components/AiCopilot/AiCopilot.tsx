import { useState } from 'react';
import { Sparkles, Send, X, Bot, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import api from '../../api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "¿Resumen operativo de la flota hoy?",
  "¿Hay camiones con alertas o incidentes activos?",
  "¿Qué documentos o seguros vencen pronto?",
  "¿Qué viajes están demorados o en tránsito?"
];

export function AiCopilot() {
  const { companyId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu **Copiloto IA Gemini** para Control Tower. Tengo acceso en tiempo real a tus camiones, choferes, viajes, combustible, taller y documentos legales.\n\n¿En qué te puedo ayudar hoy?',
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await api.askAiCopilot(companyId, textToSend);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        role: 'assistant',
        content: `⚠️ Error al consultar el modelo de IA: ${err.message || 'Error desconocido'}`,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón flotante IA */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          height: 52,
          padding: '0 20px',
          borderRadius: 26,
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 8px 25px rgba(139, 92, 246, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          zIndex: 9990,
          transition: 'all 0.3s ease'
        }}
        title="Abrir Copiloto IA Gemini"
      >
        <Sparkles size={20} className="ai-icon-spin" />
        <span>Copiloto IA</span>
        <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 10, textTransform: 'uppercase' }}>
          Gemini 2.0
        </span>
      </button>

      {/* Ventana de Chat Flotante */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 86,
          right: 24,
          width: 420,
          maxWidth: 'calc(100vw - 32px)',
          height: 560,
          maxHeight: 'calc(100vh - 120px)',
          background: '#0f172a',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(139, 92, 246, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9991,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            background: 'linear-gradient(90deg, #1e1b4b 0%, #1e293b 100%)',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Control Tower Copilot
                  <span style={{ fontSize: 9, background: '#22c55e', color: '#000', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>
                    ONLINE
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Potenciado por Google Gemini 2.0 Flash</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Mensajes */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? '#3b82f6' : '#1e293b',
                  color: '#fff',
                  borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  padding: '10px 14px',
                  fontSize: 13,
                  lineHeight: 1.5,
                  border: m.role === 'user' ? 'none' : '1px solid #334155',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {m.content}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                  {m.timestamp}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                background: '#1e293b',
                borderRadius: '14px 14px 14px 2px',
                padding: '10px 14px',
                fontSize: 12,
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid #334155'
              }}>
                <RefreshCw size={14} className="spin-slow" />
                Analizando base operativa con Gemini...
              </div>
            )}
          </div>

          {/* Sugerencias Rápidas */}
          <div style={{
            padding: '8px 12px',
            background: '#090d16',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={loading}
                style={{
                  fontSize: 11,
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  borderRadius: 12,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Formulario de Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: 12,
              background: '#0f172a',
              borderTop: '1px solid #334155',
              display: 'flex',
              gap: 8
            }}
          >
            <input
              type="text"
              placeholder="Preguntá lo que sea sobre la flota..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#fff',
                fontSize: 13,
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '0 14px',
                cursor: 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
