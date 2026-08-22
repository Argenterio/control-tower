// Drivers Page - Driver management with WhatsApp direct dispatch
import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Driver } from '../types';
import { Users, Plus, Search, AlertTriangle, MessageSquare, Send, X, Check, Edit, Trash2 } from 'lucide-react';
import { AddDriverForm } from '../components/Forms';
import { useToast } from '../components/Toast';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'badge-success' },
  inactive: { label: 'Inactivo', className: 'badge-neutral' },
  suspended: { label: 'Suspendido', className: 'badge-danger' },
};

export default function DriversPage() {
  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 days
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
  };
  const { companyId } = useAuth();
  const { addToast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  
  // WhatsApp modal states
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  useEffect(() => {
    api.getDrivers(companyId)
      .then(setDrivers)
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleOpenNewDriver = () => {
    setEditingDriver(null);
    setIsModalOpen(true);
  };

  const handleOpenEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
  };

  const handleModalCreated = async (newDriver: Driver) => {
    if (editingDriver) {
      // Edit mode
      setDrivers(prev => prev.map(d => d.id === editingDriver.id ? newDriver : d));
      addToast('Chofer actualizado con éxito', 'success');
    } else {
      // Create mode
      setDrivers(prev => [newDriver, ...prev]);
      addToast('Chofer creado con éxito', 'success');
    }
    handleCloseModal();
  };

  // WhatsApp modal handlers
  const handleOpenWhatsapp = (driver: Driver) => {
    setSelectedDriver(driver);
    setMsgText('');
    setSendResult(null);
  };

  const handleSendWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver?.phone || !msgText.trim()) return;

    setSending(true);
    setSendResult(null);
    try {
      await api.sendWhatsappMessage(selectedDriver.phone, msgText, selectedDriver.id);
      setSendResult('¡Mensaje enviado con éxito al WhatsApp del chofer!');
      setTimeout(() => {
        setSelectedDriver(null);
        setSendResult(null);
      }, 2000);
    } catch (err: any) {
      setSendResult(`Error: ${err.message || 'No se pudo enviar el mensaje'}`);
    } finally {
      setSending(false);
    }
  };

  const filtered = drivers.filter(d =>
    d.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (d.dni || '').includes(search) ||
    (d.licenseNumber || '').includes(search)
  );

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /><p>Cargando choferes...</p></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Users size={28} className="page-icon" /> Gestión de Choferes</h1>
          <p className="page-subtitle">{drivers.length} choferes registrados en la flota</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNewDriver}>
          <Plus size={18} /> Nuevo Chofer
        </button>
      </div>

      <div className="table-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o licencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Teléfono</th>
              <th>Licencia</th>
              <th>Vto. Licencia</th>
              <th>Estado</th>
              <th>Viajes</th>
              <th>Km Total</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const status = STATUS_MAP[d.status] || { label: d.status, className: 'badge-neutral' };
              const licExpired = isExpired(d.licenseExpiry);
              const licExpiring = isExpiringSoon(d.licenseExpiry);
              return (
                <tr key={d.id}>
                  <td className="td-bold">{d.fullName}</td>
                  <td className="td-mono">{d.dni || '—'}</td>
                  <td>{d.phone || '—'}</td>
                  <td className="td-mono">{d.licenseNumber || '—'}</td>
                  <td>
                    <span className={licExpired ? 'text-danger' : licExpiring ? 'text-warning' : ''}>
                      {d.licenseExpiry ? new Date(d.licenseExpiry).toLocaleDateString('es-AR') : '—'}
                      {licExpired && <AlertTriangle size={14} className="inline-icon" />}
                      {licExpiring && !licExpired && <AlertTriangle size={14} className="inline-icon warning" />}
                    </span>
                  </td>
                  <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                  <td>{d.totalTrips}</td>
                  <td>{d.totalKm?.toLocaleString('es-AR')} km</td>
                  <td style={{ textAlign: 'center', display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditDriver(d)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      title="Editar chofer"
                    >
                      <Edit size={14} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsapp(d)}
                      className="btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        background: 'rgba(34, 197, 94, 0.15)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#4ade80',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer'
                      }}
                      title="Enviar WhatsApp directo"
                    >
                      <MessageSquare size={14} /> WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`¿Eliminar chofer ${d.fullName}?`)) return;
                        try {
                          await api.updateDriver(d.id, { ...d, status: 'inactive' });
                          setDrivers(prev => prev.filter(x => x.id !== d.id));
                          addToast('Chofer desactivado', 'success');
                        } catch (err: any) {
                          addToast(`Error: ${err.message}`, 'error');
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
                      title="Desactivar chofer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="td-empty">No se encontraron choferes</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add/Edit Driver */}
      <AddDriverForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreated={handleModalCreated}
        initialData={editingDriver}
        saving={false}
      />

      {/* Modal para Enviar WhatsApp Manual */}
      {selectedDriver && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 16,
            width: '100%',
            maxWidth: 500,
            padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, background: 'rgba(34, 197, 94, 0.2)', borderRadius: 8, color: '#4ade80' }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Enviar WhatsApp a Chofer</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                    {selectedDriver.fullName} &middot; <code>{selectedDriver.phone || 'Sin teléfono'}</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendWhatsapp}>
              {/* Plantillas rápidas */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Mensajes Rápidos:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    'Favor de confirmar salida a ruta.',
                    'Por favor enviar foto del remito firmado.',
                    'Aviso: Cambio de puerta de descarga.',
                    'Por favor reportar estado de combustible.'
                  ].map(template => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => setMsgText(template)}
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 6,
                        color: '#93c5fd',
                        cursor: 'pointer'
                      }}
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Mensaje:</label>
                <textarea
                  rows={4}
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  placeholder="Escribe el mensaje que recibirá el chofer en su WhatsApp..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: 14,
                    resize: 'vertical'
                  }}
                  required
                />
              </div>

              {sendResult && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 13,
                  background: sendResult.startsWith('Error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                  color: sendResult.startsWith('Error') ? '#f87171' : '#4ade80',
                  border: `1px solid ${sendResult.startsWith('Error') ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  {sendResult.startsWith('Error') ? <AlertTriangle size={16} /> : <Check size={16} />}
                  {sendResult}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setSelectedDriver(null)}
                  className="btn btn-secondary"
                  disabled={sending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending || !msgText.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Send size={16} /> {sending ? 'Enviando...' : 'Enviar WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}