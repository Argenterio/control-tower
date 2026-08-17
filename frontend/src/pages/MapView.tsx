// Map Page - Operational map with vehicle positions using Leaflet
import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Vehicle } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Map as MapIcon, Truck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with bundlers
const defaultIcon = L.divIcon({
  className: 'custom-truck-marker',
  html: `<div class="truck-marker"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Default center: Buenos Aires, Argentina
const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];
const DEFAULT_ZOOM = 6;

interface VehiclePosition {
  vehicle: Vehicle;
  lat: number;
  lng: number;
  timestamp?: string;
}

export default function MapPage() {
  const { companyId } = useAuth();
  const [positions, setPositions] = useState<VehiclePosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVehicles(companyId)
      .then((vehicles) => {
        const withPositions: VehiclePosition[] = [];
        for (const v of vehicles) {
          if (v.lastGpsLocation) {
            try {
              const loc = JSON.parse(v.lastGpsLocation);
              if (loc.latitude && loc.longitude) {
                withPositions.push({
                  vehicle: v,
                  lat: loc.latitude,
                  lng: loc.longitude,
                  timestamp: loc.timestamp,
                });
              }
            } catch { /* ignore invalid JSON */ }
          }
        }
        setPositions(withPositions);
      })
      .catch(() => setPositions([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /><p>Cargando mapa operativo...</p></div>;
  }

  return (
    <div className="page map-page">
      <div className="page-header">
        <div>
          <h1><MapIcon size={28} className="page-icon" /> Mapa Operativo</h1>
          <p className="page-subtitle">{positions.length} unidades con posición GPS</p>
        </div>
        <div className="header-actions">
          <span className="live-indicator">
            <span className="live-dot" />
            TIEMPO REAL
          </span>
        </div>
      </div>

      <div className="map-container">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%', borderRadius: 12 }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {positions.map((pos) => (
            <Marker
              key={pos.vehicle.id}
              position={[pos.lat, pos.lng]}
              icon={defaultIcon}
            >
              <Popup>
                <div className="map-popup">
                  <h4><Truck size={16} /> {pos.vehicle.licensePlate}</h4>
                  <p><strong>Marca:</strong> {pos.vehicle.brand || '—'} {pos.vehicle.model || ''}</p>
                  <p><strong>Estado:</strong> {pos.vehicle.status}</p>
                  <p><strong>Km Total:</strong> {pos.vehicle.kmTotal?.toLocaleString('es-AR')}</p>
                  {pos.timestamp && (
                    <p className="popup-time"><strong>Última posición:</strong> {new Date(pos.timestamp).toLocaleString('es-AR')}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {positions.length === 0 && (
          <div className="map-empty-overlay">
            <MapIcon size={48} />
            <p>No hay unidades con posición GPS registrada</p>
            <p className="text-muted">Las posiciones aparecerán cuando los vehículos envíen datos GPS</p>
          </div>
        )}
      </div>
    </div>
  );
}
