import { useState } from 'react';
import { Settings, Building, Phone, Radio, Save, Check, ExternalLink, Send, Bot, MessageSquare, Image, Mic, MapPin, AlertTriangle } from 'lucide-react';
import api, { resolveMediaUrl } from '../api/client';

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
  const [simMessageType, setSimMessageType] = useState<'text' | 'image' | 'audio' | 'location'>('text');
  const [simMediaUrl, setSimMediaUrl] = useState<string>('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResponse, setSimResponse] = useState<any>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSimulate = async (opts?: { message?: string; messageType?: string; mediaUrl?: string; latitude?: number; longitude?: number }) => {
    const textToSend = opts?.message !== undefined ? opts.message : simMessage;
    const typeToSend = opts?.messageType || simMessageType;
    const mediaToSend = opts?.mediaUrl !== undefined ? opts.mediaUrl : simMediaUrl;

    setSimLoading(true);
    setSimResponse(null);
    try {
      const res = await api.simulateWhatsappMessage('default-company', {
        phone: simDriverPhone,
        message: textToSend,
        messageType: typeToSend,
        mediaUrl: mediaToSend || undefined,
        latitude: opts?.latitude,
        longitude: opts?.longitude
      });
      setSimResponse(res);
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, maxWidth: 960 }}>
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

        {/* Simulador Interactivo Multimodal de WhatsApp */}
        <div className="chart-card" style={{ border: '1px solid rgba(52, 211, 153, 0.4)', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(6, 78, 59, 0.2) 100%)' }}>
          <div className="chart-header">
            <h3><Bot size={20} color="#34d399" /> Consola de Simulación WhatsApp en Vivo (Multimodal)</h3>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Prueba mensajes de texto, fotos de remitos, audios y reportes de averías en tiempo real</span>
          </div>

          {/* Botones Rápidos por Categoría */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#38bdf8', marginBottom: 8 }}>
              ⚡ Pruebas Rápidas con IA y Multimedia (1-Click):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '8px 12px', justifyContent: 'flex-start', background: 'rgba(30, 41, 59, 0.8)' }}
                onClick={() => {
                  setSimMessage('Salí hacia Córdoba con carga completa');
                  setSimMessageType('text');
                  setSimMediaUrl('');
                  handleSimulate({ message: 'Salí hacia Córdoba con carga completa', messageType: 'text' });
                }}
              >
                🚀 <strong>Salida a Ruta</strong> (Texto)
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '8px 12px', justifyContent: 'flex-start', background: 'rgba(30, 41, 59, 0.8)' }}
                onClick={() => {
                  setSimMessage('Acabo de llegar a la planta de Arcor Arroyito');
                  setSimMessageType('text');
                  setSimMediaUrl('');
                  handleSimulate({ message: 'Acabo de llegar a la planta de Arcor Arroyito', messageType: 'text' });
                }}
              >
                🏁 <strong>Llegada a Destino</strong> (Texto)
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '8px 12px', justifyContent: 'flex-start', background: 'rgba(30, 41, 59, 0.8)' }}
                onClick={() => {
                  setSimMessage('Tengo demora de 1h 30m por corte en RN9 km 140 Baradero');
                  setSimMessageType('text');
                  setSimMediaUrl('');
                  handleSimulate({ message: 'Tengo demora de 1h 30m por corte en RN9 km 140 Baradero', messageType: 'text' });
                }}
              >
                ⏳ <strong>Demora Operativa</strong> (Alerta)
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '8px 12px', justifyContent: 'flex-start', borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(14, 116, 144, 0.2)' }}
                onClick={() => {
                  const imgUrl = 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&auto=format&fit=crop&q=80';
                  setSimMessage('Adjunto foto del remito firmado con sello de recepción');
                  setSimMessageType('image');
                  setSimMediaUrl(imgUrl);
                  handleSimulate({
                    message: 'Adjunto foto del remito firmado con sello de recepción',
                    messageType: 'image',
                    mediaUrl: imgUrl
                  });
                }}
              >
                <Image size={14} color="#38bdf8" /> <strong>Remito Firmado</strong> (Foto)
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '8px 12px', justifyContent: 'flex-start', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(153, 27, 27, 0.2)' }}
                onClick={() => {
                  const imgUrl = 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80';
                  setSimMessage('Se pinchó la cubierta delantera derecha en RN9, estoy en banquina');
                  setSimMessageType('image');
                  setSimMediaUrl(imgUrl);
                  handleSimulate({
                    message: 'Se pinchó la cubierta delantera derecha en RN9, estoy en banquina',
                    messageType: 'image',
                    mediaUrl: imgUrl
                  });
                }}
              >
                <AlertTriangle size={14} color="#ef4444" /> <strong>Neumático / Avería</strong> (Foto + Alerta)
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '8px 12px', justifyContent: 'flex-start', borderColor: 'rgba(168, 85, 247, 0.4)', background: 'rgba(107, 33, 168, 0.2)' }}
                onClick={() => {
                  const audioUrl = 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg';
                  setSimMessage('Hola central, Martín Benítez reportando. Ya ingresé a la bodega en Mendoza.');
                  setSimMessageType('audio');
                  setSimMediaUrl(audioUrl);
                  handleSimulate({
                    message: 'Hola central, Martín Benítez reportando. Ya ingresé a la bodega en Mendoza.',
                    messageType: 'audio',
                    mediaUrl: audioUrl
                  });
                }}
              >
                <Mic size={14} color="#c084fc" /> <strong>Nota de Voz Chofer</strong> (Audio)
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '8px 12px', justifyContent: 'flex-start', background: 'rgba(30, 41, 59, 0.8)' }}
                onClick={() => {
                  setSimMessage('Comparto mi ubicación GPS actual');
                  setSimMessageType('location');
                  setSimMediaUrl('');
                  handleSimulate({
                    message: 'Comparto mi ubicación GPS actual',
                    messageType: 'location',
                    latitude: -32.9468,
                    longitude: -60.6393
                  });
                }}
              >
                <MapPin size={14} color="#34d399" /> <strong>Ubicación GPS</strong> (Coords)
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 16 }}>
            {/* Formulario Personalizado */}
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
                <label>Tipo de Mensaje</label>
                <select
                  value={simMessageType}
                  onChange={e => setSimMessageType(e.target.value as any)}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', color: '#fff' }}
                >
                  <option value="text">Texto</option>
                  <option value="image">Fotografía / Imagen</option>
                  <option value="audio">Audio / Nota de Voz</option>
                  <option value="location">Ubicación GPS</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Mensaje o Epígrafe del Chofer</label>
                <input
                  type="text"
                  value={simMessage}
                  onChange={e => setSimMessage(e.target.value)}
                  placeholder="Ej: Salí, Llegué, Demora por lluvia..."
                />
              </div>

              {simMessageType !== 'text' && simMessageType !== 'location' && (
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>URL o Archivo Multimedia (opcional)</label>
                  <input
                    type="text"
                    value={simMediaUrl}
                    onChange={e => setSimMediaUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => handleSimulate()}
                disabled={simLoading}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}
              >
                <Send size={16} /> {simLoading ? 'Procesando con IA...' : 'Simular Envío WhatsApp'}
              </button>
            </div>

            {/* Visualización de la Respuesta del Bot e Impacto en Base de Datos */}
            <div style={{ background: '#090d16', borderRadius: 8, padding: 14, border: '1px solid #1e293b', minHeight: 220, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare size={14} color="#34d399" /> Respuesta Automática de Alex / Bot WhatsApp:
              </div>

              {simResponse ? (
                simResponse.error ? (
                  <div style={{ color: '#f87171', fontSize: 13, padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
                    ⚠️ {simResponse.error}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Mensaje de retorno al chofer */}
                    <div style={{
                      background: '#14532d',
                      color: '#dcfce7',
                      padding: '12px 14px',
                      borderRadius: '12px 12px 12px 2px',
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                      {simResponse.responseMessage || simResponse.data?.interpretation?.responseMessage}
                    </div>

                    {/* Previsualización del medio si hubo */}
                    {simMediaUrl && (
                      <div style={{ marginTop: 4, background: 'rgba(30, 41, 59, 0.5)', padding: 8, borderRadius: 8, border: '1px solid #334155' }}>
                        {simMessageType === 'image' && (
                          <img
                            src={resolveMediaUrl(simMediaUrl)}
                            alt="Vista previa"
                            style={{ maxHeight: 120, borderRadius: 6, display: 'block', objectFit: 'cover' }}
                          />
                        )}
                        {simMessageType === 'audio' && (
                          <audio controls src={resolveMediaUrl(simMediaUrl)} style={{ width: '100%', height: 36 }}>
                            Tu navegador no soporta audio.
                          </audio>
                        )}
                      </div>
                    )}

                    {/* Metadata interpretada */}
                    <div style={{ fontSize: 12, color: '#94a3b8', background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 6, lineHeight: 1.6 }}>
                      • Acción clasificada: <strong style={{ color: '#38bdf8' }}>{simResponse.data?.interpretation?.action || 'general_message'}</strong> (Confianza: {Math.round((simResponse.data?.interpretation?.confidence || 0.9) * 100)}%)<br />
                      • Viaje actualizado en tiempo real: <strong style={{ color: simResponse.data?.tripUpdated ? '#4ade80' : '#94a3b8' }}>{simResponse.data?.tripUpdated ? 'SÍ' : 'NO'}</strong><br />
                      • Evidencia guardada en panel: <strong style={{ color: '#38bdf8' }}>{simMessageType !== 'text' ? 'SÍ' : 'NO'}</strong><br />
                      • Incidente / Alerta generada: <strong style={{ color: simResponse.data?.incidentCreated ? '#f87171' : '#94a3b8' }}>{simResponse.data?.incidentCreated ? 'SÍ' : 'NO'}</strong>
                    </div>
                  </div>
                )
              ) : (
                <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic', margin: 'auto', textAlign: 'center', padding: 20 }}>
                  Selecciona una de las <strong>pruebas rápidas (1-Click)</strong> o escribe un mensaje personalizado para ver cómo la IA interpreta, responde y actualiza el panel en vivo.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
