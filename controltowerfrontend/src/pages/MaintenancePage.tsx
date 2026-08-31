import { useState, useEffect } from 'react';
import { Wrench, Plus, Search, CheckCircle2, AlertTriangle, X, Check, Calendar, DollarSign, Truck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Vehicle } from '../types';

interface MaintenanceRecord {
  id: string;
  vehicleId?: string;
  vehiclePlate?: string;
  type: 'preventive' | 'corrective';
  description: string;
  workshop: string;
  serviceDate: string;
  nextServiceDate?: string;
  kmAtService: number;
  cost: number;
  status: 'completed' | 'in_progress' | 'scheduled';
}

export function MaintenancePage() {
  const { companyId } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Estado del Modal de Nueva Orden
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formType, setFormType] = useState<'preventive' | 'corrective'>('preventive');
  const [formDescription, setFormDescription] = useState('');
  const [formWorkshop, setFormWorkshop] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNextDate, setFormNextDate] = useState('');
  const [formKm, setFormKm] = useState<number>(150000);
  const [formCost, setFormCost] = useState<number>(450000);
  const [formStatus, setFormStatus] = useState<'scheduled' | 'in_progress' | 'completed'>('scheduled');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getMaintenance(companyId),
      api.getVehicles(companyId)
    ])
      .then(([maintData, vehData]) => {
        setRecords(maintData);
        setVehicles(vehData);
        if (vehData.length > 0 && !formVehicleId) {
          setFormVehicleId(vehData[0].id);
        }
      })
      .catch((err) => {
        console.error("Error al cargar datos de mantenimiento:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleOpenModal = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFormDescription('');
    setFormWorkshop('Taller Central');
    setFormDate(new Date().toISOString().split('T')[0]);
    if (vehicles.length > 0) setFormVehicleId(vehicles[0].id);
    setShowModal(true);
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      setErrorMsg('Por favor ingresa una descripción del trabajo.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await api.createMaintenance({
        companyId,
        vehicleId: formVehicleId || undefined,
        type: formType,
        description: formDescription,
        workshop: formWorkshop,
        serviceDate: formDate,
        nextServiceDate: formNextDate || undefined,
        kmAtService: Number(formKm),
        cost: Number(formCost),
        status: formStatus
      });

      setSuccessMsg('¡Orden de trabajo registrada con éxito!');
      loadData();
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la orden de mantenimiento');
    } finally {
      setSaving(false);
    }
  };

  const filtered = records.filter(m =>
    (m.vehiclePlate || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.workshop || '').toLowerCase().includes(search.toLowerCase())
  );

  const completedCount = records.filter(m => m.status === 'completed').length;
  const inProgressCount = records.filter(m => m.status === 'in_progress').length;
  const scheduledCount = records.filter(m => m.status === 'scheduled').length;
  const totalInvestment = records.reduce((sum, m) => sum + (m.cost || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Wrench size={28} className="page-icon" /> Mantenimiento y Talleres</h1>
          <p className="page-subtitle">Programación preventiva, correctivos, repuestos y control de costos</p>
        </div>
        <button type="button" onClick={handleOpenModal} className="btn btn-primary">
          <Plus size={18} /> Registrar Orden de Trabajo
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>{completedCount}</span>
          <span className="kpi-label">Completados</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-cyan)' }}>{inProgressCount}</span>
          <span className="kpi-label">En Taller Ahora</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-purple)' }}>{scheduledCount}</span>
          <span className="kpi-label">Turnos Programados</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">${(totalInvestment / 1000000).toFixed(2)}M</span>
          <span className="kpi-label">Inversión Total Registrada</span>
        </div>
      </div>

      <div className="table-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por unidad, taller o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Orden #</th>
              <th>Unidad</th>
              <th>Tipo</th>
              <th>Detalle del Trabajo</th>
              <th>Taller / Ubicación</th>
              <th>Fecha</th>
              <th>Costo Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id}>
                <td className="td-mono">{m.id}</td>
                <td className="td-bold">{m.vehiclePlate || 'Unidad Flota'}</td>
                <td>
                  <span className={`badge ${m.type === 'preventive' ? 'badge-primary' : 'badge-warning'}`}>
                    {m.type === 'preventive' ? 'Preventivo' : 'Correctivo'}
                  </span>
                </td>
                <td>{m.description}</td>
                <td>{m.workshop || 'Taller Central'}</td>
                <td>{m.serviceDate ? new Date(m.serviceDate).toLocaleDateString('es-AR') : '—'}</td>
                <td className="td-bold">${(m.cost || 0).toLocaleString('es-AR')}</td>
                <td>
                  {m.status === 'completed' && <span className="badge badge-success"><CheckCircle2 size={12} style={{ marginRight: 4 }} /> Listo</span>}
                  {m.status === 'in_progress' && <span className="badge badge-cyan">En taller</span>}
                  {m.status === 'scheduled' && <span className="badge badge-purple">Programado</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={8} className="td-empty">No se encontraron registros de mantenimiento</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Registrar Orden de Trabajo */}
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
            maxWidth: 620,
            padding: 28,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 10, background: 'rgba(59, 130, 246, 0.2)', borderRadius: 10, color: '#60a5fa' }}>
                  <Wrench size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Registrar Orden de Trabajo</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Ingreso a taller, service programado o reparación</p>
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

            <form onSubmit={handleCreateMaintenance} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label><Truck size={14} style={{ display: 'inline', marginRight: 4 }} /> Unidad / Camión</label>
                  <select
                    value={formVehicleId}
                    onChange={e => setFormVehicleId(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', color: '#fff' }}
                    required
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.licensePlate} &middot; {v.brand} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Tipo de Mantenimiento</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', color: '#fff' }}
                  >
                    <option value="preventive">Preventivo (Service / Rutina)</option>
                    <option value="corrective">Correctivo (Avería / Rotura)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Detalle del Trabajo / Repuestos</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Ej: Service de 150.000 km, cambio de aceite 15W40, filtros y revisión de frenos..."
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Taller / Proveedor</label>
                  <input
                    type="text"
                    value={formWorkshop}
                    onChange={e => setFormWorkshop(e.target.value)}
                    placeholder="Ej: Taller Central Campana"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Estado de la Orden</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', color: '#fff' }}
                  >
                    <option value="scheduled">Programado (Turno futuro)</option>
                    <option value="in_progress">En Taller (En proceso)</option>
                    <option value="completed">Completado (Listo)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Fecha del Servicio</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Próximo Service (Opcional)</label>
                  <input
                    type="date"
                    value={formNextDate}
                    onChange={e => setFormNextDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Km al Momento del Service</label>
                  <input
                    type="number"
                    value={formKm}
                    onChange={e => setFormKm(Number(e.target.value))}
                    min={0}
                  />
                </div>

                <div className="form-group">
                  <label><DollarSign size={14} style={{ display: 'inline', marginRight: 4 }} /> Costo Total ($ ARS)</label>
                  <input
                    type="number"
                    value={formCost}
                    onChange={e => setFormCost(Number(e.target.value))}
                    min={0}
                    required
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
                  {saving ? 'Guardando...' : <><Check size={16} /> Guardar Orden</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
