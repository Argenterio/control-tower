// Mensajes de Choferes — Bandeja de WhatsApp entrante
// Tabla: Hora | Chofer | Viaje | Tipo | Información | Estado
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import api, { resolveMediaUrl } from '../api/client';
import type { InboxMessage } from '../types';
import {
  MessageSquare, Mic, Image as ImageIcon, FileText, MapPin,
  RefreshCw, Search, Send, AlertTriangle, CheckCircle2, Clock, X, ExternalLink, Download
} from 'lucide-react';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function MessageTypeIcon({ type, action }: { type: string; action?: string }) {
  if (type === 'audio') return <Mic size={14} />;
  if (type === 'image') return <ImageIcon size={14} />;
  if (type === 'document') return <FileText size={14} />;
  if (type === 'location') return <MapPin size={14} />;
  if (action === 'accident' || action === 'breakdown' || action === 'delay' || action === 'tire_issue') return <AlertTriangle size={14} />;
  if (action === 'trip_arrival' || action === 'trip_departure') return <CheckCircle2 size={14} />;
  return <MessageSquare size={14} />;
}

function statusFromAction(action?: string, _messageType?: string): { label: string; tone: 'ok' | 'warn' | 'alert' | 'info' } {
  if (!action) return { label: 'Recibido', tone: 'info' };
  switch (action) {
    case 'accident': return { label: '🔴 Crítica', tone: 'alert' };
    case 'breakdown': return { label: '🟠 Alta', tone: 'warn' };
    case 'tire_issue': return { label: '🟠 Alta', tone: 'warn' };
    case 'delay': return { label: '🟡 Atención', tone: 'warn' };
    case 'document_upload': return { label: '📎 Evidencia', tone: 'info' };
    case 'location_share': return { label: '📍 Ubicación', tone: 'info' };
    case 'trip_departure': return { label: '🟢 Procesado', tone: 'ok' };
    case 'trip_arrival': return { label: '🟢 Procesado', tone: 'ok' };
    case 'loading': return { label: '🟢 Procesado', tone: 'ok' };
    case 'unloading': return { label: '🟢 Procesado', tone: 'ok' };
    case 'fuel_stop': return { label: '🟢 Procesado', tone: 'ok' };
    case 'greeting': return { label: '🔵 Información', tone: 'info' };
    case 'status_query': return { label: '🔵 Información', tone: 'info' };
    default: return { label: '🟢 Procesado', tone: 'ok' };
  }
}

export default function DriverMessagesPage() {
  const { companyId } = useAuth();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toneFilter, setToneFilter] = useState<'all' | 'alert' | 'warn' | 'info' | 'ok'>('all');
  const [simulating, setSimulating] = useState(false);
  const [sendAlertLoading, setSendAlertLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.getInbox(companyId, 200);
      setMessages(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter(m => {
      const st = statusFromAction(m.interpretedAction, m.messageType);
      if (toneFilter !== 'all' && st.tone !== toneFilter) return false;
      if (!q) return true;
      return (
        m.content?.toLowerCase().includes(q) ||
        m.driver?.fullName.toLowerCase().includes(q) ||
        m.trip?.id.toLowerCase().includes(q) ||
        m.phone.includes(q)
      );
    });
  }, [messages, search, toneFilter]);

  async function simulate() {
    setSimulating(true);
    try {
      const presets = [
        { message: "Salí hacia Rosario, ya estoy en ruta", messageType: "text" },
        { message: "Central, tengo una demora de 45 minutos por piquete en la ruta", messageType: "text" },
        { message: "Se me pinchó una cubierta, estoy detenido", messageType: "text" },
        { message: "Acabo de llegar a destino", messageType: "text" }
      ];
      const pick = presets[Math.floor(Math.random() * presets.length)];
      const result = await api.simulateWhatsappMessage(companyId, pick);
      if (result?.success === false) {
        alert(`Error: ${result.error || 'Error desconocido'}`);
        return;
      }
      await load();
    } catch (err: any) {
      alert(`Error al simular: ${err.message || err}`);
    } finally {
      setSimulating(false);
    }
  }

  async function sendTestAlert() {
    setSendAlertLoading(true);
    try {
      await api.simulateWhatsappMessage(companyId, {
        message: "ALERTA TEST: Se detectó una anomalía en el sistema",
        messageType: "text"
      });
      await load();
      alert('Alerta de prueba enviada. Revisá la pestaña Alertas.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSendAlertLoading(false);
    }
  }

  return (
    <div className="page driver-messages-page">
      <div className="page-header">
        <div>
          <h1><MessageSquare size={28} className="page-icon" /> Mensajes de Choferes</h1>
          <p className="page-subtitle">Bandeja operativa — WhatsApp entrante · IA interpreta, sistema actualiza</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
          </button>
          <button className="btn btn-primary" onClick={simulate} disabled={simulating}>
            <Send size={16} /> Simular mensaje
          </button>
          <button className="btn btn-warning" onClick={sendTestAlert} disabled={sendAlertLoading}>
            <AlertTriangle size={16} /> {sendAlertLoading ? 'Enviando...' : 'Enviar alerta test'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por chofer, viaje, contenido o teléfono…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {[
            { v: 'all', l: 'Todos' },
            { v: 'alert', l: '🔴 Crítica' },
            { v: 'warn', l: '🟠/🟡 Atención' },
            { v: 'info', l: '🔵 Información' },
            { v: 'ok', l: '🟢 Procesado' }
          ].map(p => (
            <button
              key={p.v}
              className={`pill ${toneFilter === p.v ? 'pill-active' : ''}`}
              onClick={() => setToneFilter(p.v as any)}
            >{p.l}</button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="inbox-card">
        <div className="inbox-table">
          <div className="inbox-thead">
            <div className="th th-time"><Clock size={14} /> Hora</div>
            <div className="th th-driver">Chofer</div>
            <div className="th th-trip">Viaje</div>
            <div className="th th-type">Tipo</div>
            <div className="th th-info">Información</div>
            <div className="th th-status">Estado</div>
          </div>
          <div className="inbox-tbody">
            {loading && <div className="inbox-empty">Cargando mensajes…</div>}
            {!loading && filtered.length === 0 && (
              <div className="inbox-empty">No hay mensajes para mostrar.</div>
            )}
            {filtered.map(m => {
              const st = statusFromAction(m.interpretedAction, m.messageType);
              const mediaUrl = m.mediaUrl ? resolveMediaUrl(m.mediaUrl) : '';
              return (
                <div key={m.id} className={`inbox-row tone-${st.tone}`}>
                  <div className="td td-time">
                    <span className="td-mono">{formatTime(m.createdAt)}</span>
                  </div>
                  <div className="td td-driver">
                    {m.driver ? (
                      <>
                        <div className="driver-name">{m.driver.fullName}</div>
                        <div className="driver-meta">{m.vehicle?.licensePlate || 'sin unidad'} · {m.phone}</div>
                      </>
                    ) : (
                      <span className="td-muted">{m.phone} (no registrado)</span>
                    )}
                  </div>
                  <div className="td td-trip">
                    {m.trip ? (
                      <>
                        <div className="trip-short">#{m.trip.id.replace(/^trip-/, '').slice(-6)}</div>
                        <div className="trip-route">{m.trip.origin} → {m.trip.destination}</div>
                      </>
                    ) : <span className="td-muted">—</span>}
                  </div>
                  <div className="td td-type">
                    <span className="type-chip">
                      <MessageTypeIcon type={m.messageType} action={m.interpretedAction} />
                      <span>{m.messageType}{m.interpretedAction && m.interpretedAction !== m.messageType ? ` · ${m.interpretedAction}` : ''}</span>
                    </span>
                  </div>
                  <div className="td td-info">
                    <div className="info-text">
                      {m.content || (m.mediaUrl ? (m.messageType === 'image' ? '📸 Fotografía adjunta' : m.messageType === 'audio' ? '🎙️ Nota de voz' : '📎 Documento adjunto') : '—')}
                    </div>
                    {mediaUrl && (
                      <div className="media-preview-container" style={{ marginTop: 8 }}>
                        {m.messageType === 'image' && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <img
                              src={mediaUrl}
                              alt="Adjunto"
                              onClick={() => setPreviewImage(mediaUrl)}
                              style={{ maxHeight: 70, maxWidth: 140, borderRadius: 6, objectFit: 'cover', border: '1px solid #334155', cursor: 'pointer', transition: 'transform 0.15s' }}
                              title="Hacé clic para ampliar"
                            />
                            <button
                              className="btn btn-ghost"
                              style={{ padding: 4, fontSize: 12 }}
                              onClick={() => setPreviewImage(mediaUrl)}
                              title="Ampliar imagen"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        )}
                        {m.messageType === 'audio' && (
                          <div className="audio-player-box" style={{ background: '#1e293b', padding: '6px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #334155' }}>
                            <Mic size={16} style={{ color: '#a78bfa' }} />
                            <audio controls preload="metadata" src={mediaUrl} style={{ height: 32, maxWidth: 240 }}>
                              Tu navegador no soporta audio.
                            </audio>
                          </div>
                        )}
                        {m.messageType === 'document' && (
                          <a href={mediaUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <FileText size={14} /> Ver documento <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                    {m.responseMessage && (
                      <div className="info-reply">↳ {m.responseMessage.slice(0, 110)}{m.responseMessage.length > 110 ? '…' : ''}</div>
                    )}
                  </div>
                  <div className="td td-status">
                    <span className={`status-badge status-${st.tone}`}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Lightbox para previsualizar imagen completa */}
      {previewImage && (
        <div
          className="drawer-backdrop"
          onClick={() => setPreviewImage(null)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.8)' }}
        >
          <div
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: '#0f172a', borderRadius: 12, padding: 16, border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>Fotografía Adjunta</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={previewImage} target="_blank" download="evidencia.jpg" rel="noreferrer" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }}>
                  <Download size={14} /> Descargar
                </a>
                <button className="btn btn-ghost" onClick={() => setPreviewImage(null)} style={{ padding: 4 }}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <img
              src={previewImage}
              alt="Vista previa ampliada"
              style={{ maxWidth: '85vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}