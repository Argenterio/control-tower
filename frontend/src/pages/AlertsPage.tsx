import { useState } from 'react';
import { AlertTriangle, ShieldAlert, Bot, Send, Sparkles, ArrowRight } from 'lucide-react';

interface SystemAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  description: string;
  entity: string;
  time: string;
  actionRequired: string;
}

const DEMO_ALERTS: SystemAlert[] = [
  { id: 'ALT-1', severity: 'critical', title: 'Viaje #482 con Demora Crítica (+1h 45m)', description: 'Congestión severa por corte en RN9 km 140 (Baradero). Ventana de entrega comprometida con Arcor Arroyito.', entity: 'AF 342 KL — Chofer: C. Rodríguez', time: 'Hace 12 min', actionRequired: 'Notificar reprogramación de ETA al cliente Arcor' },
  { id: 'ALT-2', severity: 'critical', title: 'Póliza de Seguro Vencida', description: 'La unidad Iveco Stralis tiene la cobertura de seguro automotor vencida desde el 12/08/2026.', entity: 'AG 105 OP — Iveco Stralis', time: 'Hace 2 horas', actionRequired: 'Inmovilizar unidad hasta renovación de póliza' },
  { id: 'ALT-3', severity: 'high', title: 'Consumo Anormal de Combustible (+22%)', description: 'La unidad consumió 42.1 L/100km en el tramo Rosario-Córdoba (Promedio histórico del modelo: 34.5 L/100km).', entity: 'AG 105 OP — Chofer: L. Gómez', time: 'Hace 4 horas', actionRequired: 'Inspeccionar inyectores o verificar telemetría de velocidad' },
  { id: 'ALT-4', severity: 'medium', title: 'Psicofísico CNRT Próximo a Vencer (12 días)', description: 'El chofer Martín Benítez debe renovar su aptitud médica antes del 28/08/2026.', entity: 'Chofer: Martín Benítez', time: 'Hoy 08:30', actionRequired: 'Asignar turno médico en delegación CNRT' },
  { id: 'ALT-5', severity: 'info', title: 'Service 150.000 km Próximo', description: 'La unidad Volvo FH500 alcanzará el kilometraje de mantenimiento programado en aproximadamente 800 km.', entity: 'AD 990 ZZ — Volvo FH 500', time: 'Ayer', actionRequired: 'Reservar turno en taller' },
];

export function AlertsPage() {
  const [messages, setMessages] = useState<{ sender: 'user' | 'alex'; text: string }[]>([
    { sender: 'alex', text: '👋 Hola Gustavo. Soy Alex Control, tu copiloto de dirección operativa. ¿En qué puedo ayudarte hoy? Puedes preguntarme "¿Cómo estamos?", "¿Qué camiones tienen demora?" o "¿Cuánto margen dejamos este mes?".' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: q }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = 'Estoy analizando los registros operativos de la flota en tiempo real...';
      const lower = q.toLowerCase();

      if (lower.includes('cómo estamos') || lower.includes('como estamos') || lower.includes('estado general')) {
        reply = '📊 **Resumen Operativo en Tiempo Real:**\n• **Flota activa:** 18 unidades en ruta, 1 en taller, 1 inactiva.\n• **Viajes hoy:** 12 completados, 6 en tránsito, 1 demorado (Viaje #482 Arcor).\n• **Facturación estimada:** $3.500.000 proyectada para el día.\n• **Atención requerida:** Seguro vencido en unidad AG 105 OP y desvío de combustible en tramo Rosario-Córdoba.';
      } else if (lower.includes('demorad') || lower.includes('demoras') || lower.includes('atraso')) {
        reply = '⚠️ **Viaje Demorado:**\n• **Viaje #482** (CABA → Córdoba):\n  - Chofer: Carlos Rodríguez | Unidad: AF 342 KL\n  - Causa: Congestión en RN9 Km 140 (Baradero)\n  - ETA original: 16:30 | Nueva ETA calculada: 18:15 (+1h 45m)\n  - Cliente: Arcor Arroyito. **Recomendación:** Enviar WhatsApp de actualización a logística Arcor.';
      } else if (lower.includes('margen') || lower.includes('facturaci') || lower.includes('dinero') || lower.includes('financ')) {
        reply = '💰 **Análisis Financiero y Rentabilidad:**\n• **Facturación acumulada mes:** $48.200.000\n• **Costos directos (Combustible + Peajes + Chofer):** $31.800.000\n• **Margen bruto promedio:** 34.02%\n• **Cliente más rentable:** Molinos Río de la Plata (Margen: 38.5%)\n• **Cliente con margen bajo:** Acindar (21.4% por tiempos muertos en descarga).';
      } else if (lower.includes('combustible') || lower.includes('gasto') || lower.includes('nafta') || lower.includes('gasoil')) {
        reply = '⛽ **Control de Combustible:**\n• **Consumo medio de la flota:** 34.8 L/100km.\n• **Alerta activa:** Unidad AG 105 OP registró 42.1 L/100km (+22% de exceso) en su último trayecto. Se recomienda chequear calibración de inyectores o telemetría de velocidad excesiva.';
      } else {
        reply = `He registrado tu consulta: "${q}". Todo el sistema opera con normalidad con 18 camiones conectados por telemetría GPS y 0 accidentes reportados en las últimas 48 horas.`;
      }

      setMessages(prev => [...prev, { sender: 'alex', text: reply }]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><AlertTriangle size={28} className="page-icon" /> Centro de Alertas e Inteligencia Operativa</h1>
          <p className="page-subtitle">Detección automática de anomalías, riesgos operativos y copiloto Alex AI</p>
        </div>
      </div>

      <div className="charts-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        {/* Alerts List */}
        <div className="chart-card">
          <div className="chart-header">
            <h3><ShieldAlert size={18} color="var(--accent-rose)" /> Alertas Activas del Sistema</h3>
          </div>
          <div className="activity-list">
            {DEMO_ALERTS.map(a => (
              <div key={a.id} className="trip-card" style={{ padding: 16, borderLeft: `4px solid ${a.severity === 'critical' ? 'var(--accent-rose)' : a.severity === 'high' ? 'var(--accent-amber)' : 'var(--accent-cyan)'}` }}>
                <div className="trip-card-header">
                  <span className={`badge ${a.severity === 'critical' ? 'badge-danger' : a.severity === 'high' ? 'badge-warning' : 'badge-cyan'}`}>
                    {a.severity.toUpperCase()}
                  </span>
                  <span className="td-mono" style={{ fontSize: 11 }}>{a.time}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginTop: 4 }}>
                  {a.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {a.description}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📍 {a.entity}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 6, fontSize: 12, color: 'var(--primary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowRight size={14} /> <strong>Acción:</strong> {a.actionRequired}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alex Control AI Chat Copilot */}
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', height: '620px' }}>
          <div className="chart-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={20} color="var(--primary)" />
              <span>Alex Control</span>
              <span className="badge badge-primary" style={{ fontSize: 10 }}>IA COPILOTO</span>
            </h3>
          </div>

          {/* Quick Prompts */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
            {['¿Cómo estamos?', '¿Qué camiones están demorados?', '¿Cuánto margen dejamos este mes?', 'Control de combustible'].map(chip => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: 'var(--primary)', padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer' }}
              >
                <Sparkles size={10} style={{ display: 'inline', marginRight: 4 }} />{chip}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '10px 0' }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  background: m.sender === 'user' ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' : 'rgba(255,255,255,0.05)',
                  border: m.sender === 'user' ? 'none' : '1px solid var(--border-card)',
                  padding: '10px 14px',
                  borderRadius: 14,
                  fontSize: 13,
                  whiteSpace: 'pre-line',
                  lineHeight: 1.5,
                  color: '#fff'
                }}
              >
                {m.text}
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                Alex está analizando datos de telemetría...
              </div>
            )}
          </div>

          {/* Input Box */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <input
              type="text"
              placeholder="Pregúntale a Alex sobre la flota, viajes, costos..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 14px', color: '#fff', outline: 'none', fontSize: 13 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleSend()}
              style={{ padding: '0 16px' }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
