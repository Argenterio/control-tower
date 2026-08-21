import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Trip } from '../types';
import { Route, Plus, Search, Filter, MapPin, Clock, ArrowRight, X, MessageSquare, Mic, Image as ImageIcon, FileText, MapPin as Pin, Sparkles, User as UserIcon, Truck as TruckIcon } from 'lucide-react';
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

type TimelineTab = 'timeline' | 'evidence' | 'messages';

export default function TripsPage() {
  const { companyId } = useAuth();
  const { addToast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailTrip, setDetailTrip] = useState<Trip | null>(null);

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
          <p className="page-subtitle">{trips.length} viajes registrados · Timeline operativa disponible</p>
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
            <div
              key={trip.id}
              className={`trip-card ${trip.status === 'delayed' ? 'trip-delayed' : ''}`}
              onClick={() => setDetailTrip(trip)}
              role="button"
              tabIndex={0}
            >
              <div className="trip-card-header">
                <span className={`badge ${status.className}`}>{status.label}</span>
                <span className="trip-id">#{trip.id.replace(/^trip-/, '').slice(-6)}</span>
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

      {detailTrip && (
        <TripDetailDrawer
          trip={detailTrip}
          companyId={companyId}
          onClose={() => setDetailTrip(null)}
        />
      )}
    </div>
  );
}

function TripDetailDrawer({ trip, companyId, onClose }: { trip: Trip; companyId: string; onClose: () => void }) {
  const [tab, setTab] = useState<TimelineTab>('timeline');
  const [data, setData] = useState<{ trip: any; timeline: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getTripTimeline(companyId, trip.id).then(d => { setData(d); setLoading(false); });
  }, [trip.id, companyId]);

  const enrichedTrip = data?.trip || trip;
  const items = data?.timeline || [];

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <h2>Viaje #{trip.id.replace(/^trip-/, '').slice(-6)}</h2>
            <p className="drawer-subtitle">
              {enrichedTrip.origin} → {enrichedTrip.destination}
              {enrichedTrip.vehiclePlate && <> · <TruckIcon size={12} /> {enrichedTrip.vehiclePlate}</>}
              {enrichedTrip.driverName && <> · <UserIcon size={12} /> {enrichedTrip.driverName}</>}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="drawer-meta">
          <div className="meta-chip">
            <span className="meta-label">Estado</span>
            <span className={`badge ${STATUS_MAP[trip.status]?.className || 'badge-neutral'}`}>
              {STATUS_MAP[trip.status]?.label || trip.status}
            </span>
          </div>
          {enrichedTrip.estimatedArrival && (
            <div className="meta-chip">
              <span className="meta-label">ETA</span>
              <span>{new Date(enrichedTrip.estimatedArrival).toLocaleString('es-AR')}</span>
            </div>
          )}
          {enrichedTrip.customerName && (
            <div className="meta-chip">
              <span className="meta-label">Cliente</span>
              <span>{enrichedTrip.customerName}</span>
            </div>
          )}
        </div>

        <div className="drawer-tabs">
          <button className={`tab ${tab === 'timeline' ? 'tab-active' : ''}`} onClick={() => setTab('timeline')}>
            <Clock size={14} /> Línea de tiempo
          </button>
          <button className={`tab ${tab === 'evidence' ? 'tab-active' : ''}`} onClick={() => setTab('evidence')}>
            <ImageIcon size={14} /> Evidencias
          </button>
          <button className={`tab ${tab === 'messages' ? 'tab-active' : ''}`} onClick={() => setTab('messages')}>
            <MessageSquare size={14} /> Mensajes
          </button>
        </div>

        <div className="drawer-body">
          {loading && <div className="inbox-empty">Cargando…</div>}

          {!loading && tab === 'timeline' && (
            <div className="timeline">
              {items.length === 0 && (
                <div className="inbox-empty">
                  <Sparkles size={20} /> Aún no hay eventos registrados para este viaje.
                </div>
              )}
              {items.map((it: any, idx: number) => (
                <TimelineItem key={idx} item={it} />
              ))}
            </div>
          )}

          {!loading && tab === 'evidence' && (
            <div className="drawer-evidence">
              {items.filter((it: any) => it.kind === 'evidence').length === 0 && (
                <div className="inbox-empty">No hay evidencias aún.</div>
              )}
              {items.filter((it: any) => it.kind === 'evidence').map((it: any, idx: number) => (
                <div key={idx} className="evidence-mini">
                  {it.evidence.kind === 'audio' && <Mic size={16} />}
                  {it.evidence.kind === 'image' && <ImageIcon size={16} />}
                  {it.evidence.kind === 'document' && <FileText size={16} />}
                  {it.evidence.kind === 'location' && <Pin size={16} />}
                  {it.evidence.kind === 'text' && <MessageSquare size={16} />}
                  <div className="evidence-mini-body">
                    <div className="evidence-mini-title">{it.evidence.title || it.evidence.kind}</div>
                    <div className="evidence-mini-desc">{it.evidence.transcript || it.evidence.description}</div>
                    <div className="evidence-mini-time">{new Date(it.at).toLocaleString('es-AR')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === 'messages' && (
            <div className="drawer-messages">
              {items.filter((it: any) => it.kind === 'message').length === 0 && (
                <div className="inbox-empty">No hay mensajes.</div>
              )}
              {items.filter((it: any) => it.kind === 'message').map((it: any, idx: number) => (
                <div key={idx} className="msg-bubble">
                  <div className="msg-meta">
                    <span>{it.message.messageType}</span>
                    {it.message.interpretedAction && <span className="badge badge-soft">{it.message.interpretedAction}</span>}
                    <span className="msg-time">{new Date(it.at).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="msg-content">{it.message.content}</div>
                  {it.message.responseMessage && <div className="msg-reply">↳ {it.message.responseMessage}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function TimelineItem({ item }: { item: any }) {
  const t = new Date(item.at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  if (item.kind === 'event') {
    const ev = item.event;
    const emoji = ev.type === 'departure' ? '🚛' :
                  ev.type === 'arrival' ? '🏁' :
                  ev.type === 'loading' ? '📦' :
                  ev.type === 'unloading' ? '📥' :
                  ev.type === 'delay' ? '⏳' :
                  ev.type === 'breakdown' ? '🔧' :
                  ev.type === 'accident' ? '🚨' :
                  ev.type === 'tire' ? '🛞' :
                  ev.type === 'fuel' ? '⛽' :
                  ev.type === 'document' ? '📎' :
                  ev.type === 'location' ? '📍' :
                  ev.type === 'eta_update' ? '🧭' : '•';
    return (
      <div className={`timeline-item ti-event ti-${ev.priority}`}>
        <div className="ti-time">{t}</div>
        <div className="ti-icon">{emoji}</div>
        <div className="ti-body">
          <div className="ti-title">{ev.title || ev.type}</div>
          {ev.description && <div className="ti-desc">{ev.description}</div>}
          <div className="ti-meta">
            <span className="badge badge-soft">{ev.priority}</span>
            {ev.requiresIntervention ? <span className="badge badge-danger">requiere intervención</span> : null}
          </div>
        </div>
      </div>
    );
  }
  if (item.kind === 'message') {
    return (
      <div className="timeline-item ti-message">
        <div className="ti-time">{t}</div>
        <div className="ti-icon">🎙️</div>
        <div className="ti-body">
          <div className="ti-title">Chofer: <em>"{item.message.content}"</em></div>
          {item.message.responseMessage && <div className="ti-desc">🤖 Respuesta: {item.message.responseMessage}</div>}
        </div>
      </div>
    );
  }
  if (item.kind === 'evidence') {
    const ev = item.evidence;
    const emoji = ev.kind === 'audio' ? '🎙️' : ev.kind === 'image' ? '📷' : ev.kind === 'document' ? '📎' : ev.kind === 'location' ? '📍' : '📝';
    return (
      <div className="timeline-item ti-evidence">
        <div className="ti-time">{t}</div>
        <div className="ti-icon">{emoji}</div>
        <div className="ti-body">
          <div className="ti-title">Evidencia recibida ({ev.kind})</div>
          {ev.transcript && <div className="ti-desc">"{ev.transcript}"</div>}
          {ev.description && <div className="ti-desc">{ev.description}</div>}
        </div>
      </div>
    );
  }
  if (item.kind === 'location') {
    const l = item.location;
    return (
      <div className="timeline-item ti-location">
        <div className="ti-time">{t}</div>
        <div className="ti-icon">📍</div>
        <div className="ti-body">
          <div className="ti-title">Ubicación del vehículo</div>
          <div className="ti-desc">{l.latitude?.toFixed(4)}, {l.longitude?.toFixed(4)} {l.label && `· ${l.label}`}</div>
        </div>
      </div>
    );
  }
  return null;
}
