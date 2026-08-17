import { useState, useEffect } from 'react';
import { Fuel, AlertTriangle, Plus, Search, Check, X, Calendar, DollarSign, Truck, UserCheck, MapPin } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Vehicle, Driver } from '../types';

interface FuelRecord {
  id: string;
  date: string;
  vehicleId?: string;
  licensePlate?: string;
  driverId?: string;
  driverName?: string;
  station: string;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  kmAtFill: number;
  consumptionLPer100Km?: number;
  anomaly?: boolean;
}

export function FuelPage() {
  const { companyId } = useAuth();
  const [fuelEntries, setFuelEntries] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Estado del Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formDriverId, setFormDriverId] = useState('');
  const [formStation, setFormStation] = useState('YPF Directo');
  const [formLiters, setFormLiters] = useState<number>(450);
  const [formPricePerLiter, setFormPricePerLiter] = useState<number>(1150);
  const [formKm, setFormKm] = useState<number>(185000);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getFuelEntries(companyId),
      api.getVehicles(companyId),
      api.getDrivers(companyId)
    ])
      .then(([fuelData, vehData, drvData]) => {
        setFuelEntries(fuelData);
        setVehicles(vehData);
        setDrivers(drvData);
        if (vehData.length > 0 && !formVehicleId) setFormVehicleId(vehData[0].id);
        if (drvData.length > 0 && !formDriverId) setFormDriverId(drvData[0].id);
      })
      .catch((err) => {
        console.error("Error al cargar datos de combustible:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleOpenModal = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    if (vehicles.length > 0) setFormVehicleId(vehicles[0].id);
    if (drivers.length > 0) setFormDriverId(drivers[0].id);
    setShowModal(true);
  };

  const handleCreateFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLiters || formLiters <= 0) {
      setErrorMsg('Por favor ingresa una cantidad válida de litros.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const calculatedTotal = Number(formLiters) * Number(formPricePerLiter);

    try {
      await api.createFuelEntry({
        companyId,
        vehicleId: formVehicleId,
        driverId: formDriverId,
        station: formStation,
        liters: Number(formLiters),
        pricePerLiter: Number(formPricePerLiter),
        totalAmount: calculatedTotal,
        kmAtFill: Number(formKm),
        date: formDate
      });

      setSuccessMsg('¡Ticket de combustible registrado correctamente!');
      loadData();
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el ticket de combustible');
    } finally {
      setSaving(false);
    }
  };

  const filtered = fuelEntries.filter(f =>
    (f.licensePlate || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.driverName || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.station || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalSpent = fuelEntries.reduce((acc, f) => acc + (f.totalAmount || (f.liters * f.pricePerLiter) || 0), 0);
  const totalLiters = fuelEntries.reduce((acc, f) => acc + (f.liters || 0), 0);
  const avgConsumption = fuelEntries.length > 0
    ? (fuelEntries.reduce((acc, f) => acc + (f.consumptionLPer100Km || 34.5), 0) / fuelEntries.length).toFixed(1)
    : '34.5';
  const anomalyCount = fuelEntries.filter(f => f.anomaly || (f.consumptionLPer100Km && f.consumptionLPer100Km > 38)).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Fuel size={28} className="page-icon" /> Control de Combustible</h1>
          <p className="page-subtitle">Seguimiento de cargas, rendimiento L/100km y detección de anomalías</p>
        </div>
        <button type="button" onClick={handleOpenModal} className="btn btn-primary">
          <Plus size={18} /> Cargar Ticket / Despacho
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-value">${(totalSpent / 1000000).toFixed(2)}M</span>
          <span className="kpi-label">Gasto Total de Combustible</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{totalLiters.toLocaleString('es-AR')} L</span>
          <span className="kpi-label">Litros Cargados</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{avgConsumption} L/100km</span>
          <span className="kpi-label">Consumo Promedio Flota</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: anomalyCount > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
            {anomalyCount} {anomalyCount === 1 ? 'Alerta' : 'Alertas'}
          </span>
          <span className="kpi-label">Consumo Anormal Detectado</span>
        </div>
      </div>

      <div className="table-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por patente, chofer o estación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Unidad</th>
              <th>Chofer</th>
              <th>Estación / Proveedor</th>
              <th>Litros</th>
              <th>Precio/L</th>
              <th>Total ($)</th>
              <th>Rendimiento</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => {
              const total = f.totalAmount || (f.liters * f.pricePerLiter);
              const isAnomaly = f.anomaly || (f.consumptionLPer100Km && f.consumptionLPer100Km > 38);
              return (
                <tr key={f.id}>
                  <td>{f.date ? new Date(f.date).toLocaleDateString('es-AR') : '—'}</td>
                  <td className="td-bold">{f.licensePlate || 'Camión Flota'}</td>
                  <td>{f.driverName || 'Chofer Asignado'}</td>
                  <td>{f.station}</td>
                  <td>{f.liters} L</td>
                  <td>${f.pricePerLiter}</td>
                  <td className="td-bold">${total.toLocaleString('es-AR')}</td>
                  <td>
                    <span className={isAnomaly ? 'text-danger' : ''}>
                      {f.consumptionLPer100Km ? `${f.consumptionLPer100Km} L/100km` : '34.2 L/100km'}
                    </span>
                  </td>
                  <td>
                    {isAnomaly ? (
                      <span className="badge badge-danger">
                        <AlertTriangle size={12} style={{ marginRight: 4 }} /> Desvío &gt; 38L
                      </span>
                    ) : (
                      <span className="badge badge-success">Normal</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={9} className="td-empty">No se encontraron tickets de combustible</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Cargar Ticket de Combustible */}
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
            maxWidth: 600,
            padding: 28,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 10, background: 'rgba(234, 179, 8, 0.2)', borderRadius: 10, color: '#facc15' }}>
                  <Fuel size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Cargar Ticket / Despacho de Combustible</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Registro de carga y auditoría de consumo por unidad</p>
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

            <form onSubmit={handleCreateFuel} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label><Truck size={14} style={{ display: 'inline', marginRight: 4 }} /> Camión / Unidad</label>
                  <select
                    value={formVehicleId}
                    onChange={e => setFormVehicleId(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', color: '#fff' }}
                    required
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.licensePlate} &middot; {v.brand} {v.model}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label><UserCheck size={14} style={{ display: 'inline', marginRight: 4 }} /> Chofer</label>
                  <select
                    value={formDriverId}
                    onChange={e => setFormDriverId(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', color: '#fff' }}
                    required
                  >
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label><MapPin size={14} style={{ display: 'inline', marginRight: 4 }} /> Estación / Proveedor</label>
                  <input
                    type="text"
                    value={formStation}
                    onChange={e => setFormStation(e.target.value)}
                    placeholder="Ej: YPF Directo Zárate, Shell Leones..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Fecha de Carga</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Litros Cargados</label>
                  <input
                    type="number"
                    value={formLiters}
                    onChange={e => setFormLiters(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Precio por Litro ($)</label>
                  <input
                    type="number"
                    value={formPricePerLiter}
                    onChange={e => setFormPricePerLiter(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Km Odómetro</label>
                  <input
                    type="number"
                    value={formKm}
                    onChange={e => setFormKm(Number(e.target.value))}
                    min={0}
                    required
                  />
                </div>
              </div>

              {/* Total Calculado */}
              <div style={{
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid #334155',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>Importe Total del Ticket:</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#facc15' }}>
                  ${(Number(formLiters) * Number(formPricePerLiter)).toLocaleString('es-AR')} ARS
                </span>
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
                  {saving ? 'Guardando...' : <><Check size={16} /> Registrar Ticket</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
