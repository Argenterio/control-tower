import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Trip } from '../types';
import { Route, Plus, Search, Filter, MapPin, Clock, ArrowRight } from 'lucide-react';
import { AddTripForm } from '../components/Forms';
import { useToast } from '../components/Toast';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'badge-purple' },
  loading: { label: 'Cargando', className: 'badge-cyan' },
  en_route: { label: 'En Ruta', className: 'badge-primary' },
  delayed: { label: 'Demorado', className: 'badge-danger' },
  unloading: { label: 'Descargando', className: 'badge-cyan' },
  completed: { label: 'Completado', className: 'badge-success' },
  cancelled: { label: 'Cancelado', className: 'badge-neutral' },
};

export default function TripsPage() {
  const { companyId } = useAuth();
  const { addToast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    api.getTrips(companyId)
      .then(setTrips)
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleTripCreated = (newTrip: Trip) => {
    setTrips(prev => [newTrip, ...prev]);
    addToast(`Viaje a ${newTrip.destination} creado con éxito`, 'success');
  };

  const filtered = trips.filter(t => {
    const matchSearch = t.origin.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase()) ||
      t.id.includes(search);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /><p>Cargando viajes...</p></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Route size={28} className="page-icon" /> Gestión de Viajes</h1>
          <p className="page-subtitle">{trips.length} viajes registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Nuevo Viaje
        </button>
      </div>

      <AddTripForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleTripCreated}
      />

      <div className="table-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por origen, destino o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="loading">Cargando</option>
            <option value="en_route">En Ruta</option>
            <option value="delayed">Demorados</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Trip Cards */}
      <div className="trip-cards">
        {filtered.map(trip => {
          const status = STATUS_MAP[trip.status] || { label: trip.status, className: 'badge-neutral' };
          return (
            <div key={trip.id} className={`trip-card ${trip.status === 'delayed' ? 'trip-delayed' : ''}`}>
              <div className="trip-card-header">
                <span className={`badge ${status.className}`}>{status.label}</span>
                <span className="trip-id">#{trip.id.slice(0, 8)}</span>
              </div>
              <div className="trip-route">
                <div className="trip-point">
                  <MapPin size={16} className="origin-icon" />
                  <span>{trip.origin}</span>
                </div>
                <ArrowRight size={16} className="route-arrow" />
                <div className="trip-point">
                  <MapPin size={16} className="dest-icon" />
                  <span>{trip.destination}</span>
                </div>
              </div>
              <div className="trip-meta">
                {trip.startTime && (
                  <span className="trip-meta-item">
                    <Clock size={14} />
                    {new Date(trip.startTime).toLocaleDateString('es-AR')}
                  </span>
                )}
                {trip.fare && (
                  <span className="trip-meta-item">
                    ${trip.fare.toLocaleString('es-AR')}
                  </span>
                )}
                {trip.kmTotal && (
                  <span className="trip-meta-item">
                    {trip.kmTotal.toLocaleString('es-AR')} km
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state">
            <Route size={48} />
            <p>No se encontraron viajes</p>
          </div>
        )}
      </div>
    </div>
  );
}
