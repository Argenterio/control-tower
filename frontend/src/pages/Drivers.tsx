import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Driver } from '../types';
import { Users, Plus, Search, AlertTriangle } from 'lucide-react';
import { AddDriverForm } from '../components/Forms';
import { useToast } from '../components/Toast';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'badge-success' },
  inactive: { label: 'Inactivo', className: 'badge-neutral' },
  suspended: { label: 'Suspendido', className: 'badge-danger' },
};

export default function DriversPage() {
  const { companyId } = useAuth();
  const { addToast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    api.getDrivers(companyId)
      .then(setDrivers)
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleDriverCreated = (newDriver: Driver) => {
    setDrivers(prev => [newDriver, ...prev]);
    addToast(`Chofer ${newDriver.fullName} registrado con éxito`, 'success');
  };

  const filtered = drivers.filter(d =>
    d.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (d.dni || '').includes(search) ||
    (d.licenseNumber || '').includes(search)
  );

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 days
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
  };

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /><p>Cargando choferes...</p></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Users size={28} className="page-icon" /> Gestión de Choferes</h1>
          <p className="page-subtitle">{drivers.length} choferes registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Nuevo Chofer
        </button>
      </div>

      <AddDriverForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleDriverCreated}
      />

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
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="td-empty">No se encontraron choferes</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
