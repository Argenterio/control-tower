import { useState, useEffect } from 'react';
import { FileText, AlertTriangle, CheckCircle, Clock, Plus, Search, Filter, X, Check, Upload, Calendar } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Vehicle, Driver } from '../types';

interface DocumentRecord {
  id: string;
  category?: 'vehiculo' | 'chofer' | 'empresa';
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  type: string;
  title: string;
  fileUrl: string;
  expiryDate: string;
  status: 'valid' | 'expiring' | 'expired';
}

export function DocumentsPage() {
  const { companyId } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estado del Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario
  const [formCategory, setFormCategory] = useState<'vehiculo' | 'chofer' | 'empresa'>('vehiculo');
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formDriverId, setFormDriverId] = useState('');
  const [formDocType, setFormDocType] = useState('RTO / VTV');
  const [formNumber, setFormNumber] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getDocuments(companyId),
      api.getVehicles(companyId),
      api.getDrivers(companyId)
    ])
      .then(([docData, vehData, drvData]) => {
        setDocuments(docData);
        setVehicles(vehData);
        setDrivers(drvData);
        if (vehData.length > 0 && !formVehicleId) setFormVehicleId(vehData[0].id);
        if (drvData.length > 0 && !formDriverId) setFormDriverId(drvData[0].id);
      })
      .catch((err) => {
        console.error("Error al cargar documentos:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleOpenModal = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFormNumber('');
    setFormExpiryDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFormFileUrl('');
    setShowModal(true);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNumber.trim()) {
      setErrorMsg('Por favor ingresa el número de póliza, certificado o licencia.');
      return;
    }
    if (!formExpiryDate) {
      setErrorMsg('Por favor ingresa la fecha de vencimiento.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    // Calcular estado inicial según fecha
    const diffDays = Math.ceil((new Date(formExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    let docStatus = 'valid';
    if (diffDays < 0) docStatus = 'expired';
    else if (diffDays <= 30) docStatus = 'expiring';

    try {
      await api.createDocument({
        companyId,
        vehicleId: formCategory === 'vehiculo' ? formVehicleId : undefined,
        driverId: formCategory === 'chofer' ? formDriverId : undefined,
        type: formDocType,
        title: formNumber,
        fileUrl: formFileUrl || 'https://storage.generarise.space/docs/' + formNumber + '.pdf',
        expiryDate: formExpiryDate,
        status: docStatus,
        uploadedBy: 'Administración'
      });

      setSuccessMsg('¡Documento cargado y auditado con éxito!');
      loadData();
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el documento');
    } finally {
      setSaving(false);
    }
  };

  const getDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return 999;
    return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getDocStatus = (d: DocumentRecord) => {
    const days = getDaysRemaining(d.expiryDate);
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring';
    return 'valid';
  };

  const filtered = documents.filter(d => {
    const status = getDocStatus(d);
    const entityName = d.vehiclePlate || d.driverName || 'Empresa';
    const matchSearch = entityName.toLowerCase().includes(search.toLowerCase()) ||
      d.type.toLowerCase().includes(search.toLowerCase()) ||
      (d.title || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || status === statusFilter;
    return matchSearch && matchStatus;
  });

  const expiredCount = documents.filter(d => getDocStatus(d) === 'expired').length;
  const expiringCount = documents.filter(d => getDocStatus(d) === 'expiring').length;
  const validCount = documents.filter(d => getDocStatus(d) === 'valid').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><FileText size={28} className="page-icon" /> Control Documental y Vencimientos</h1>
          <p className="page-subtitle">Monitoreo legal de RUTA, RTO, LNH, Seguros, SENASA y ART</p>
        </div>
        <button type="button" onClick={handleOpenModal} className="btn btn-primary">
          <Plus size={18} /> Cargar Documento
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-rose)' }}>{expiredCount}</span>
          <span className="kpi-label">Documentos Vencidos</span>
          <span className="kpi-trend negative"><AlertTriangle size={14} /> Riesgo operativo / multas</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-amber)' }}>{expiringCount}</span>
          <span className="kpi-label">Vencen en &lt; 30 días</span>
          <span className="kpi-trend neutral"><Clock size={14} /> Gestión de renovación</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>{validCount}</span>
          <span className="kpi-label">Documentos Vigentes</span>
          <span className="kpi-trend positive"><CheckCircle size={14} /> En regla</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">
            {documents.length > 0 ? `${Math.round((validCount / documents.length) * 100)}%` : '100%'}
          </span>
          <span className="kpi-label">Índice de Cumplimiento</span>
          <span className="kpi-trend positive">Auditoría al día</span>
        </div>
      </div>

      <div className="table-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por unidad, chofer o tipo de documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="expired">🔴 Vencidos</option>
            <option value="expiring">🟡 Próximos a vencer</option>
            <option value="valid">🟢 Vigentes</option>
          </select>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Titular / Entidad</th>
              <th>Tipo de Documento</th>
              <th>Nro. Certificado / Póliza</th>
              <th>Fecha Vencimiento</th>
              <th>Días Restantes</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const days = getDaysRemaining(d.expiryDate);
              const status = getDocStatus(d);
              const entity = d.vehiclePlate ? `Camión: ${d.vehiclePlate}` : d.driverName ? `Chofer: ${d.driverName}` : 'Empresa / Flota General';

              return (
                <tr key={d.id}>
                  <td className="td-bold">{entity}</td>
                  <td>{d.type}</td>
                  <td className="td-mono">{d.title || d.id}</td>
                  <td>{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString('es-AR') : '—'}</td>
                  <td>
                    {days < 0 ? (
                      <span className="text-danger">Vencido hace {Math.abs(days)} días</span>
                    ) : days <= 30 ? (
                      <span className="text-warning">{days} días</span>
                    ) : (
                      <span>{days} días</span>
                    )}
                  </td>
                  <td>
                    {status === 'expired' && <span className="badge badge-danger">🔴 Vencido</span>}
                    {status === 'expiring' && <span className="badge badge-warning">🟡 Por Vencer</span>}
                    {status === 'valid' && <span className="badge badge-success">🟢 Vigente</span>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={6} className="td-empty">No se encontraron documentos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Cargar Documento */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
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
            maxWidth: 580,
            padding: 28,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 10, background: 'rgba(16, 185, 129, 0.2)', borderRadius: 10, color: '#34d399' }}>
                  <FileText size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Cargar Documento Legal</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Control de vencimiento para habilitaciones, seguros y licencias</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Categoría del Documento</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {(['vehiculo', 'chofer', 'empresa'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        textTransform: 'capitalize',
                        background: formCategory === cat ? 'var(--primary)' : 'var(--bg-input)',
                        color: formCategory === cat ? '#fff' : '#94a3b8',
                        border: `1px solid ${formCategory === cat ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        fontWeight: formCategory === cat ? 600 : 400
                      }}
                    >
                      {cat === 'vehiculo' ? '🚛 Camión / Flota' : cat === 'chofer' ? '👤 Chofer' : '🏢 Empresa / ART'}
                    </button>
                  ))}
                </div>
              </div>

              {formCategory === 'vehiculo' && (
                <div className="form-group">
                  <label>Seleccionar Unidad</label>
                  <select
                    value={formVehicleId}
                    onChange={e => setFormVehicleId(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', color: '#fff' }}
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.licensePlate} &middot; {v.brand} {v.model}</option>
                    ))}
                  </select>
                </div>
              )}

              {formCategory === 'chofer' && (
                <div className="form-group">
                  <label>Seleccionar Chofer</label>
                  <select
                    value={formDriverId}
                    onChange={e => setFormDriverId(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', color: '#fff' }}
                  >
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.fullName} (DNI: {d.dni})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Tipo de Documento</label>
                  <select
                    value={formDocType}
                    onChange={e => setFormDocType(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', color: '#fff' }}
                  >
                    <option value="RTO / VTV">RTO / VTV Técnica</option>
                    <option value="RUTA">Certificado RUTA</option>
                    <option value="Póliza de Seguro">Póliza de Seguro</option>
                    <option value="Licencia LNH">Licencia LNH / CNRT</option>
                    <option value="Psicofísico">Examen Psicofísico</option>
                    <option value="ART">Constancia de Cobertura ART</option>
                    <option value="Habilitación SENASA">Habilitación SENASA</option>
                    <option value="Cédula Verde/Azul">Cédula del Vehículo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Nro. de Certificado / Póliza</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={e => setFormNumber(e.target.value)}
                    placeholder="Ej: RTO-99281-BA"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={e => setFormExpiryDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label><Upload size={14} style={{ display: 'inline', marginRight: 4 }} /> Archivo PDF o Imagen (URL)</label>
                  <input
                    type="text"
                    value={formFileUrl}
                    onChange={e => setFormFileUrl(e.target.value)}
                    placeholder="https://storage... (Opcional)"
                  />
                </div>
              </div>

              {errorMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} /> {errorMsg}
                </div>
              )}

              {successMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={16} /> {successMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {saving ? 'Cargando...' : <><Check size={16} /> Registrar Documento</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
