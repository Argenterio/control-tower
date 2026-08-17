// Fleet Page - Vehicle management with data table
import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Vehicle } from '../types';
import { Truck, Plus, Search, Filter } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'badge-success' },
  inactive: { label: 'Inactivo', className: 'badge-neutral' },
  maintenance: { label: 'Mantenimiento', className: 'badge-warning' },
  out_of_service: { label: 'Fuera de servicio', className: 'badge-danger' },
};

const TYPE_MAP: Record<string, string> = {
  truck: 'Camión',
  van: 'Utilitario',
  motorcycle: 'Motocicleta',
};

export default function FleetPage() {
  const { companyId } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    api.getVehicles(companyId)
      .then(setVehicles)
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  const filtered = vehicles.filter(v => {
    const matchSearch = v.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
      (v.brand || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.model || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /><p>Cargando flota...</p></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Truck size={28} className="page-icon" /> Gestión de Flota</h1>
          <p className="page-subtitle">{vehicles.length} unidades registradas</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={18} /> Nueva Unidad
        </button>
      </div>

      <div className="table-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por patente, marca o modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="maintenance">En mantenimiento</option>
            <option value="inactive">Inactivos</option>
            <option value="out_of_service">Fuera de servicio</option>
          </select>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Patente</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Km Total</th>
              <th>Última Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => {
              const status = STATUS_MAP[v.status] || { label: v.status, className: 'badge-neutral' };
              let lastLocation = '—';
              if (v.lastGpsLocation) {
                try {
                  const loc = JSON.parse(v.lastGpsLocation);
                  lastLocation = `${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}`;
                } catch { lastLocation = '—'; }
              }
              return (
                <tr key={v.id}>
                  <td className="td-bold">{v.licensePlate}</td>
                  <td>{v.brand || '—'}</td>
                  <td>{v.model || '—'}</td>
                  <td>{TYPE_MAP[v.type] || v.type}</td>
                  <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                  <td>{v.kmTotal?.toLocaleString('es-AR')} km</td>
                  <td className="td-mono">{lastLocation}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="td-empty">No se encontraron unidades</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
