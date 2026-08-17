import { useState } from 'react';
import { Settings, Building, Phone, Radio, Save, Check, ExternalLink, Send, Bot, MessageSquare } from 'lucide-react';
import api from '../api';

export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [companyName, setCompanyName] = useState('Transportes Pampeana S.A.');
  const [cuit, setCuit] = useState('30-71234567-8');
  const [email, setEmail] = useState('operaciones@transportespampeana.com.ar');
  const [phone, setPhone] = useState('+54 9 11 4820-9900');
  const [address, setAddress] = useState('Ruta Panamericana Km 52.5, Campana, Buenos Aires');
  const [gpsProvider, setGpsProvider] = useState('geotab');
  const [whatsappNumber, setWhatsappNumber] = useState('+54 9 11 5500-1122');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');

  // Simulador interactivo de WhatsApp
  const [simDriverPhone, setSimDriverPhone] = useState('+54 9 11 4455-1122'); // Carlos Rodríguez
  const [simMessage, setSimMessage] = useState('Salí hacia Córdoba');
  const [simLoading, setSimLoading] = useState(false);
  const [simResponse, setSimResponse] = useState<any>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSimulate = async (customMsg?: string) => {
    const textToSend = customMsg || simMessage;
    if (!textToSend) return;
    setSimLoading(true);
    setSimResponse(null);
    try {
      const res = await api.post<any>('/api/whatsapp/simulate', {
        phone: simDriverPhone,
        message: textToSend,
        messageType: 'text'
      });
      setSimResponse(res.data);
    } catch (err: any) {
      setSimResponse({
        error: err.message || 'Error al comunicarse con la API de WhatsApp'
      });
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Settings size={28} className="page-icon" /> Configuración de la Empresa</h1>
          <p className="page-subtitle">Parámetros del tenant, integraciones telemáticas y canales de mensajería</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, maxWidth: 920 }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Company Profile */}
          <div className="chart-card">
            <div className="chart-header">
              <h3><Building size={18} color="var(--primary)" /> Perfil Corporativo</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Razón Social / Nombre</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>CUIT</label>
                <input type="text" value={cuit} onChange={e => setCuit(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email de Contacto Operativo</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Teléfono Central</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Dirección / Base de Operaciones</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Telemetry & Integrations */}
          <div className="chart-card">
            <div className="chart-header">
              <h3><Radio size={18} color="var(--accent-emerald)" /> Integración Telemática y GPS</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Proveedor Principal de GPS / Telemática</label>
                <select
                  value={gpsProvider}
                  onChange={e => setGpsProvider(e.target.value)}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '12px 16px', color: '#fff', outline: 'none' }}
                >
                  <option value="geotab">Geotab Fleet Telematics</option>
                  <option value="ituran">Ituran GPS Argentina</option>
                  <option value="pointer">Pointer / PowerFleet</option>
                  <option value="sitrack">Sitrack Logística</option>
                  <option value="localsat">Localsat Rastreo</option>
                  <option value="custom">API Genérica / Webhook REST</option>
                </select>
              </div>
              <div className="form-group">
                <label>Zona Horaria Operativa</label>
                <input type="text" value={timezone} onChange={e => setTimezone(e.target.value)} readOnly />
              </div>
            </div>
          </div>

          {/* WhatsApp Operativo */}
          <div className="chart-card">
            <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3><Phone size={18} color="var(--accent-cyan)" /> Canal WhatsApp Choferes (Evolution API + n8n)</h3>
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="live-dot" /> Canal Activo
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Número WhatsApp Bot Operativo</label>
                <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Webhook Receptor Central API</label>
                <input type="text" value="https://api.generarise.space/api/whatsapp/incoming" readOnly style={{ color: '#93c5fd', fontSize: 13 }} />
              </div>
            </div>

            {/* Enlaces a Infraestructura */}
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <a
                href="https://trafic.generarise.space/manager"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 8,
                  color: '#93c5fd',
                  textDecoration: 'none',
                  fontSize: 13
                }}
              >
                <span><strong>Evolution API Manager:</strong> Escanear QR</span>
                <ExternalLink size={16} />
              </a>

              <a
                href="https://manager.generarise.space"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: 8,
                  color: '#d8b4fe',
                  textDecoration: 'none',
                  fontSize: 13
                }}
              >
                <span><strong>n8n Workflows:</strong> Gestionar Bot</span>
                <ExternalLink size={16} />
              </a>
            </div>

            <div>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: 15, marginTop: 16 }}>
                {saved ? <><Check size={18} /> Guardado con Éxito</> : <><Save size={18} /> Guardar Configuración</>}
              </button>
            </div>
          </div>
        </form>

        {/* Simulador Interactivo de WhatsApp para Demostración */}
        <div className="chart-card" style={{ border: '1px solid rgba(52, 211, 153, 0.4)', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(6, 78, 59, 0.15) 100%)' }}>
          <div className="chart-header">
            <h3><Bot size={18} color="#34d399" /> Consola de Simulación WhatsApp en Vivo (Demo)</h3>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Prueba el procesamiento en tiempo real sin necesidad de enviar desde tu móvil</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
            <div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Chofer Remitente</label>
                <select
                  value={simDriverPhone}
                  onChange={e => setSimDriverPhone(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', color: '#fff' }}
                >
                  <option value="+54 9 11 4455-1122">Carlos Rodríguez (Viaje #482 a Córdoba)</option>
                  <option value="+54 9 341 556-3344">Martín Benítez (Viaje #483 a Mendoza)</option>
                  <option value="+54 9 11 6789-0011">Fernando Maidana (Viaje #484 a Bahía Blanca)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Mensaje del Chofer</label>
                <input
                  type="text"
                  value={simMessage}
                  onChange={e => setSimMessage(e.target.value)}
                  placeholder="Ej: Salí, Llegué, Demora por lluvia..."
                />
              </div>

              {/* Botones rápidos de prueba */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {['Salí a ruta', 'Llegué a destino', 'Estoy cargando', 'Demora de 1h por congestión', 'Se rompió una manguera', '¿Qué viaje tengo?'].map(txt => (
                  <button
                    key={txt}
                    type="button"
                    onClick={() => { setSimMessage(txt); handleSimulate(txt); }}
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      background: 'rgba(51, 65, 85, 0.8)',
                      border: '1px solid #475569',
                      borderRadius: 6,
                      color: '#cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    {txt}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleSimulate()}
                disabled={simLoading}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Send size={16} /> {simLoading ? 'Procesando...' : 'Simular Envío WhatsApp'}
              </button>
            </div>

            {/* Visualización de la Respuesta del Bot */}
            <div style={{ background: '#090d16', borderRadius: 8, padding: 14, border: '1px solid #1e293b', minHeight: 180, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare size={14} color="#34d399" /> Respuesta Automática de Alex / Bot WhatsApp:
              </div>

              {simResponse ? (
                simResponse.error ? (
                  <div style={{ color: '#f87171', fontSize: 13 }}>⚠️ {simResponse.error}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{
                      background: '#14532d',
                      color: '#dcfce7',
                      padding: '10px 14px',
                      borderRadius: '12px 12px 12px 2px',
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {simResponse.responseMessage}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      • Acción detectada: <strong style={{ color: '#38bdf8' }}>{simResponse.data?.interpretation?.action}</strong> (Confianza: {Math.round((simResponse.data?.interpretation?.confidence || 0) * 100)}%)<br />
                      • Viaje actualizado en base de datos: <strong style={{ color: simResponse.data?.tripUpdated ? '#4ade80' : '#94a3b8' }}>{simResponse.data?.tripUpdated ? 'SÍ' : 'NO'}</strong><br />
                      • Incidente generado: <strong style={{ color: simResponse.data?.incidentCreated ? '#f87171' : '#94a3b8' }}>{simResponse.data?.incidentCreated ? 'SÍ' : 'NO'}</strong>
                    </div>
                  </div>
                )
              ) : (
                <div style={{ color: '#475569', fontSize: 12, fontStyle: 'italic', margin: 'auto' }}>
                  Elige un mensaje de prueba o escribe uno para ver la interpretación y respuesta automática en vivo.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
