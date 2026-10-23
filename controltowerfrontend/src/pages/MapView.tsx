// Map Page — Command Center: mapa operativo con HUD de flota en tiempo real
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import { useToast } from '../components/Toast';
import type { Driver, Trip, Vehicle } from '../types';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Crosshair,
  Gauge,
  LocateFixed,
  Map as MapIcon,
  MapPinned,
  Moon,
  PanelLeft,
  Phone,
  RefreshCw,
  Route as RouteIcon,
  Satellite,
  Search,
  Signal,
  Truck,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

type Motion = 'moving' | 'stopped' | 'maintenance' | 'offline' | 'no-gps';
type FilterKey = 'all' | 'moving' | 'stopped' | 'maintenance' | 'no-gps';
type LayerKey = 'dark' | 'satellite' | 'streets';

interface GpsPayload {
  latitude?: number;
  longitude?: number;
  speed?: number;
  timestamp?: string;
}

interface FleetUnit {
  vehicle: Vehicle;
  lat?: number;
  lng?: number;
  speed: number;
  gpsTimestamp?: string;
  motion: Motion;
  driver?: Driver;
  trip?: Trip;
}

const ESRI_ATTR = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';
const ENV = (import.meta as any).env || {};

const ESRI_DARK_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

const LAYERS: Record<LayerKey, { url: string; attr: string; label: string }> = {
  dark: {
    url: ENV.VITE_MAP_TILES_URL || ESRI_DARK_URL,
    attr: ENV.VITE_MAP_ATTRIBUTION || ESRI_ATTR,
    label: 'Modo oscuro',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: ESRI_ATTR,
    label: 'Satélite',
  },
  streets: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attr: ESRI_ATTR,
    label: 'Calles',
  },
};

const MOTION_META: Record<Motion, { label: string }> = {
  moving: { label: 'En ruta' },
  stopped: { label: 'Detenido' },
  maintenance: { label: 'Mantenimiento' },
  offline: { label: 'Fuera de servicio' },
  'no-gps': { label: 'Sin GPS' },
};

const MOTION_ORDER: Record<Motion, number> = {
  moving: 0,
  stopped: 1,
  maintenance: 2,
  offline: 3,
  'no-gps': 4,
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'moving', label: 'En ruta' },
  { key: 'stopped', label: 'Detenidos' },
  { key: 'maintenance', label: 'Mantenimiento' },
  { key: 'no-gps', label: 'Sin GPS' },
];

const VEHICLE_TYPE_LABEL: Record<Vehicle['type'], string> = {
  truck: 'Camión',
  van: 'Van',
  motorcycle: 'Moto',
  trailer: 'Acoplado',
  utility: 'Utilitario',
};

const TRIP_STATUS_LABEL: Record<Trip['status'], string> = {
  pending: 'Pendiente',
  loading: 'Cargando',
  en_route: 'En ruta',
  delayed: 'Demorado',
  unloading: 'Descargando',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];
const DEFAULT_ZOOM = 6;

const TRUCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

function buildMarkerIcon(motion: Motion, selected: boolean, label: string): L.DivIcon {
  return L.divIcon({
    className: `ct-marker-wrap${selected ? ' is-selected' : ''}`,
    html: `<div class="ct-marker ct-marker--${motion}">
      <span class="ct-marker__pulse"></span>
      <span class="ct-marker__halo"></span>
      <span class="ct-marker__body">${TRUCK_SVG}</span>
      <span class="ct-marker__label">${escapeHtml(label)}</span>
    </div>`,
    iconSize: [140, 86],
    iconAnchor: [70, 23],
  });
}

function getMotion(vehicle: Vehicle, hasGps: boolean, speed: number): Motion {
  if (!hasGps) return 'no-gps';
  if (vehicle.status === 'maintenance') return 'maintenance';
  if (vehicle.status === 'inactive' || vehicle.status === 'out_of_service' || vehicle.status === 'sold') return 'offline';
  return speed > 5 ? 'moving' : 'stopped';
}

function relTime(ms: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (seconds < 10) return 'ahora';
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

function formatDate(value?: string): string {
  if (!value) return 'Sin dato';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin dato';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function docTone(value?: string): 'ok' | 'warn' | 'expired' | 'none' {
  if (!value) return 'none';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'none';
  const days = (time - Date.now()) / 86400000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'warn';
  return 'ok';
}

function DocRow({ label, value }: { label: string; value?: string }) {
  const tone = docTone(value);
  return (
    <div className="ct-doc-row">
      <span>{label}</span>
      <span className={`ct-doc-badge ct-doc-badge--${tone}`}>{formatDate(value)}</span>
    </div>
  );
}

const VehicleMarker = memo(function VehicleMarker({
  unit,
  selected,
  onSelect,
}: {
  unit: FleetUnit;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const label = unit.speed > 5
    ? `${unit.vehicle.licensePlate} · ${Math.round(unit.speed)} km/h`
    : unit.vehicle.licensePlate;
  const icon = useMemo(() => buildMarkerIcon(unit.motion, selected, label), [unit.motion, selected, label]);

  if (unit.lat == null || unit.lng == null) return null;

  return (
    <Marker
      position={[unit.lat, unit.lng]}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(unit.vehicle.id) }}
    />
  );
});

function MapBridge({
  units,
  selected,
  onCursor,
  onZoom,
}: {
  units: FleetUnit[];
  selected: FleetUnit | null;
  onCursor: (lat: number, lng: number) => void;
  onZoom: (zoom: number) => void;
}) {
  const map = useMap();
  const didFit = useRef(false);
  const lastCursor = useRef(0);

  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);

  useEffect(() => {
    if (didFit.current) return;
    const points = units.filter((u) => u.lat != null && u.lng != null);
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((u) => [u.lat as number, u.lng as number] as [number, number]));
    map.fitBounds(bounds, { padding: [90, 90], maxZoom: 12 });
    didFit.current = true;
  }, [units, map]);

  useEffect(() => {
    if (selected?.lat == null || selected.lng == null) return;
    map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 13), { duration: 0.9 });
  }, [selected?.vehicle.id]);

  useMapEvents({
    mousemove(event) {
      const now = Date.now();
      if (now - lastCursor.current < 90) return;
      lastCursor.current = now;
      onCursor(event.latlng.lat, event.latlng.lng);
    },
    zoomend() {
      onZoom(map.getZoom());
    },
  });

  return null;
}

export default function MapPage() {
  const { companyId } = useAuth();
  const { addToast } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [layer, setLayer] = useState<LayerKey>('dark');
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [panelOpen, setPanelOpen] = useState(true);
  const [cursor, setCursor] = useState<{ lat: number; lng: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);
  const tileFailed = useRef(false);

  const load = useCallback(
    async (initial = false) => {
      if (initial) setLoading(true);
      else setRefreshing(true);
      try {
        const vehicleData = await api.getVehicles(companyId);
        setVehicles(vehicleData || []);
        const [driverData, tripData] = await Promise.all([
          api.getDrivers(companyId).catch(() => [] as Driver[]),
          api.getTrips(companyId).catch(() => [] as Trip[]),
        ]);
        setDrivers(driverData);
        setTrips(tripData);
        setLastUpdated(new Date());
      } catch {
        if (initial) {
          setVehicles([]);
          setDrivers([]);
          setTrips([]);
        }
      } finally {
        if (initial) setLoading(false);
        else setRefreshing(false);
      }
    },
    [companyId]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => load(false), 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const units = useMemo<FleetUnit[]>(() => {
    const driverByVehicle = new Map<string, Driver>();
    for (const driver of drivers) {
      if (driver.vehicleId) driverByVehicle.set(driver.vehicleId, driver);
    }
    const activeTripByVehicle = new Map<string, Trip>();
    for (const trip of trips) {
      if (!trip.vehicleId) continue;
      if (trip.status === 'completed' || trip.status === 'cancelled') continue;
      if (!activeTripByVehicle.has(trip.vehicleId)) activeTripByVehicle.set(trip.vehicleId, trip);
    }

    return vehicles.map((vehicle) => {
      let lat: number | undefined;
      let lng: number | undefined;
      let speed = 0;
      let gpsTimestamp: string | undefined;

      if (vehicle.lastGpsLocation) {
        try {
          const payload = JSON.parse(vehicle.lastGpsLocation) as GpsPayload;
          if (typeof payload.latitude === 'number' && typeof payload.longitude === 'number') {
            lat = payload.latitude;
            lng = payload.longitude;
            speed = typeof payload.speed === 'number' ? payload.speed : 0;
            gpsTimestamp = payload.timestamp;
          }
        } catch {
          /* posición inválida */
        }
      }

      return {
        vehicle,
        lat,
        lng,
        speed,
        gpsTimestamp,
        motion: getMotion(vehicle, lat != null, speed),
        driver: driverByVehicle.get(vehicle.id),
        trip: activeTripByVehicle.get(vehicle.id),
      };
    });
  }, [vehicles, drivers, trips]);

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      all: units.length,
      moving: 0,
      stopped: 0,
      maintenance: 0,
      'no-gps': 0,
    };
    for (const unit of units) {
      if (unit.motion === 'moving') result.moving++;
      else if (unit.motion === 'stopped') result.stopped++;
      else if (unit.motion === 'maintenance') result.maintenance++;
      else if (unit.motion === 'no-gps') result['no-gps']++;
    }
    return result;
  }, [units]);

  const visibleUnits = useMemo(() => {
    const query = search.trim().toLowerCase();
    return units
      .filter((unit) => (filter === 'all' ? true : unit.motion === filter))
      .filter((unit) => {
        if (!query) return true;
        return [unit.vehicle.licensePlate, unit.vehicle.brand, unit.vehicle.model, unit.driver?.fullName]
          .some((value) => (value || '').toLowerCase().includes(query));
      })
      .sort((a, b) => MOTION_ORDER[a.motion] - MOTION_ORDER[b.motion] || a.vehicle.licensePlate.localeCompare(b.vehicle.licensePlate));
  }, [units, filter, search]);

  const mappedUnits = useMemo(() => units.filter((unit) => unit.lat != null && unit.lng != null), [units]);

  const visibleMapped = useMemo(
    () => visibleUnits.filter((unit) => unit.lat != null && unit.lng != null),
    [visibleUnits]
  );

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.vehicle.id === selectedId) ?? null,
    [units, selectedId]
  );

  const centerAll = useCallback(() => {
    if (!map) return;
    const points = visibleMapped.filter((unit) => unit.lat != null && unit.lng != null);
    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((unit) => [unit.lat as number, unit.lng as number] as [number, number])),
      { padding: [90, 90], maxZoom: 13 }
    );
  }, [map, visibleMapped]);

  const centerOnSelected = useCallback(() => {
    if (!map || !selectedUnit || selectedUnit.lat == null || selectedUnit.lng == null) return;
    map.flyTo([selectedUnit.lat, selectedUnit.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [map, selectedUnit]);

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  const handleTileError = useCallback(() => {
    if (!tileFailed.current) {
      tileFailed.current = true;
      setLayer('satellite');
      addToast('Se activó la capa satelital de respaldo', 'info');
    }
  }, [addToast]);

  const handleLayer = useCallback((key: LayerKey) => {
    tileFailed.current = false;
    setLayer(key);
  }, []);

  const copyCoords = useCallback(async () => {
    if (!selectedUnit || selectedUnit.lat == null || selectedUnit.lng == null) return;
    const text = `${selectedUnit.lat.toFixed(6)}, ${selectedUnit.lng.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      addToast('Coordenadas copiadas', 'success');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      addToast('No se pudieron copiar las coordenadas', 'error');
    }
  }, [selectedUnit, addToast]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>Inicializando centro de control...</p>
      </div>
    );
  }

  const activeLayer = LAYERS[layer];
  const tripProgress = selectedUnit?.trip && selectedUnit.trip.kmTotal
    ? Math.min(100, Math.max(0, Math.round((selectedUnit.trip.kmCompleted / selectedUnit.trip.kmTotal) * 100)))
    : null;

  return (
    <div className="page ct-map-page">
      <div className="ct-map-header">
        <div className="ct-map-title">
          <span className="ct-map-title-icon"><MapIcon size={22} /></span>
          <div>
            <h1>Centro de Control</h1>
            <p>
              <strong>{units.length}</strong> unidades monitoreadas · <strong>{counts.moving}</strong> en ruta ·{' '}
              <strong>{mappedUnits.length}</strong> con señal GPS
            </p>
          </div>
        </div>
        <div className="ct-map-header-right">
          <span className="ct-updated">
            <Clock size={12} />
            {lastUpdated ? relTime(lastUpdated.getTime()) : 'sin datos'}
          </span>
          <span className="live-indicator">
            <span className="live-dot" />
            TIEMPO REAL
          </span>
          <button
            className="ct-icon-btn"
            onClick={() => load(false)}
            disabled={refreshing}
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={refreshing ? 'ct-spin' : undefined} />
          </button>
        </div>
      </div>

      <div className={`ct-map-shell layer-${layer}${zoom < 8 ? ' zoom-far' : ''}${selectedUnit ? ' drawer-open' : ''}`}>
        <MapContainer
          ref={setMap}
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          zoomControl={false}
          attributionControl
          minZoom={3}
          maxZoom={19}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            key={layer}
            url={activeLayer.url}
            attribution={activeLayer.attr}
            eventHandlers={{ tileerror: handleTileError }}
          />
          {visibleMapped.map((unit) => (
            <VehicleMarker
              key={unit.vehicle.id}
              unit={unit}
              selected={unit.vehicle.id === selectedId}
              onSelect={handleSelect}
            />
          ))}
          <MapBridge
            units={visibleMapped}
            selected={selectedUnit}
            onCursor={(lat, lng) => setCursor({ lat, lng })}
            onZoom={setZoom}
          />
        </MapContainer>

        <div className="ct-map-vignette" />

        <aside className={`ct-fleet-panel ct-glass${panelOpen ? '' : ' is-hidden'}`}>
          <div className="ct-panel-head">
            <div className="ct-panel-head-row">
              <span className="ct-panel-title"><Truck size={13} /> Flota en mapa</span>
              <span className="ct-panel-count">{visibleUnits.length}</span>
            </div>
            <div className="ct-search">
              <Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar patente, marca o chofer"
              />
            </div>
            <div className="ct-filters">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  className={`ct-filter${filter === item.key ? ' is-active' : ''}`}
                  onClick={() => setFilter(item.key)}
                >
                  {item.key !== 'all' && <span className={`ct-dot ct-dot--${item.key}`} />}
                  {item.label}
                  <b>{counts[item.key]}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="ct-fleet-list">
            {visibleUnits.length === 0 && (
              <div className="ct-fleet-empty">
                <Search size={18} />
                <span>Sin unidades que coincidan</span>
              </div>
            )}
            {visibleUnits.map((unit) => (
              <button
                key={unit.vehicle.id}
                className={`ct-fleet-item${unit.vehicle.id === selectedId ? ' is-selected' : ''}`}
                onClick={() => setSelectedId(unit.vehicle.id)}
              >
                <span className={`ct-dot ct-dot--${unit.motion}`} />
                <span className="ct-fleet-item__main">
                  <span className="ct-fleet-item__plate">{unit.vehicle.licensePlate}</span>
                  <span className="ct-fleet-item__sub">
                    {unit.vehicle.brand || VEHICLE_TYPE_LABEL[unit.vehicle.type]}
                    {unit.driver ? ` · ${unit.driver.fullName}` : ''}
                  </span>
                </span>
                <span className="ct-fleet-item__speed">
                  {unit.motion === 'no-gps' ? '—' : <><b>{Math.round(unit.speed)}</b> km/h</>}
                </span>
                <ChevronRight size={14} className="chev" />
              </button>
            ))}
          </div>

          <div className="ct-panel-foot">
            <div className="ct-stat"><span className="ct-dot ct-dot--moving" /><span>En ruta</span><b>{counts.moving}</b></div>
            <div className="ct-stat"><span className="ct-dot ct-dot--stopped" /><span>Detenidos</span><b>{counts.stopped}</b></div>
            <div className="ct-stat"><span className="ct-dot ct-dot--maintenance" /><span>Mant.</span><b>{counts.maintenance}</b></div>
            <div className="ct-stat"><span className="ct-dot ct-dot--no-gps" /><span>Sin GPS</span><b>{counts['no-gps']}</b></div>
          </div>
        </aside>

        <div className="ct-controls">
          <div className="ct-glass ct-ctrl-group">
            <button
              className={`ct-ctrl-btn${layer === 'dark' ? ' is-active' : ''}`}
              onClick={() => handleLayer('dark')}
              title={LAYERS.dark.label}
            >
              <Moon size={16} />
            </button>
            <button
              className={`ct-ctrl-btn${layer === 'satellite' ? ' is-active' : ''}`}
              onClick={() => handleLayer('satellite')}
              title={LAYERS.satellite.label}
            >
              <Satellite size={16} />
            </button>
            <button
              className={`ct-ctrl-btn${layer === 'streets' ? ' is-active' : ''}`}
              onClick={() => handleLayer('streets')}
              title={LAYERS.streets.label}
            >
              <MapPinned size={16} />
            </button>
          </div>
          <div className="ct-glass ct-ctrl-group">
            <button className="ct-ctrl-btn" onClick={() => map?.zoomIn()} title="Acercar">
              <ZoomIn size={16} />
            </button>
            <button className="ct-ctrl-btn" onClick={() => map?.zoomOut()} title="Alejar">
              <ZoomOut size={16} />
            </button>
            <span className="ct-ctrl-sep" />
            <button className="ct-ctrl-btn" onClick={centerAll} title="Ver toda la flota">
              <Crosshair size={16} />
            </button>
            <button
              className={`ct-ctrl-btn${panelOpen ? ' is-active' : ''}`}
              onClick={() => setPanelOpen((value) => !value)}
              title="Mostrar u ocultar panel de flota"
            >
              <PanelLeft size={16} />
            </button>
          </div>
        </div>

        {mappedUnits.length === 0 && (
          <div className="ct-map-empty">
            <MapIcon size={42} />
            <h3>Sin posiciones GPS</h3>
            <p>Las unidades aparecerán en el mapa cuando envíen su primera señal de ubicación.</p>
          </div>
        )}

        <div className="ct-coords">
          <span className="ct-coords-dot" />
          {cursor ? (
            <>
              <span>{cursor.lat.toFixed(5)}, {cursor.lng.toFixed(5)}</span>
              <b>z{zoom}</b>
            </>
          ) : (
            <span>Moviendo el cursor sobre el mapa</span>
          )}
        </div>

        {selectedUnit && (
          <aside className="ct-drawer ct-glass">
            <div className="ct-drawer-head">
              <button className="ct-drawer-close" onClick={() => setSelectedId(null)} aria-label="Cerrar ficha">
                <X size={15} />
              </button>
              <div className="ct-drawer-kicker">
                <Truck size={12} /> Unidad · {VEHICLE_TYPE_LABEL[selectedUnit.vehicle.type]}
              </div>
              <div className="ct-drawer-plate">
                <b>{selectedUnit.vehicle.licensePlate}</b>
                <span>{[selectedUnit.vehicle.brand, selectedUnit.vehicle.model].filter(Boolean).join(' ') || 'Sin modelo'}</span>
              </div>
              <div className="ct-chip-row">
                <span className={`ct-status-chip ct-status-chip--${selectedUnit.motion}`}>
                  <span className={`ct-dot ct-dot--${selectedUnit.motion}`} />
                  {MOTION_META[selectedUnit.motion].label}
                </span>
                {selectedUnit.trip && (
                  <span className="ct-status-chip ct-status-chip--trip">
                    <RouteIcon size={11} /> {TRIP_STATUS_LABEL[selectedUnit.trip.status]}
                  </span>
                )}
              </div>
            </div>

            <div className="ct-drawer-body">
              <div className="ct-drawer-grid">
                <div className="ct-metric">
                  <span><Gauge size={11} /> Velocidad</span>
                  <b>{selectedUnit.motion === 'no-gps' ? '—' : `${Math.round(selectedUnit.speed)} km/h`}</b>
                </div>
                <div className="ct-metric">
                  <span><Signal size={11} /> Última señal</span>
                  <b className="small">
                    {selectedUnit.gpsTimestamp && !Number.isNaN(new Date(selectedUnit.gpsTimestamp).getTime())
                      ? relTime(new Date(selectedUnit.gpsTimestamp).getTime())
                      : '—'}
                  </b>
                </div>
                <div className="ct-metric">
                  <span><RouteIcon size={11} /> Odómetro</span>
                  <b className="small">{selectedUnit.vehicle.kmTotal.toLocaleString('es-AR')} km</b>
                </div>
                <div className="ct-metric">
                  <span><MapPinned size={11} /> GPS ID</span>
                  <b className="small">{selectedUnit.vehicle.gpsDeviceId || 'Sin asignar'}</b>
                </div>
              </div>

              <div>
                <div className="ct-section-label"><User size={12} /> Chofer asignado</div>
                {selectedUnit.driver ? (
                  <div className="ct-info-card ct-person">
                    <span className="ct-avatar"><User size={16} /></span>
                    <div>
                      <div className="ct-person__name">{selectedUnit.driver.fullName}</div>
                      <div className="ct-person__phone">{selectedUnit.driver.phone || 'Sin teléfono'}</div>
                    </div>
                    {selectedUnit.driver.phone && (
                      <a className="ct-mini-action" href={`tel:${selectedUnit.driver.phone}`} title="Llamar">
                        <Phone size={13} />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="ct-info-card ct-muted-card">Sin chofer asignado a esta unidad</div>
                )}
              </div>

              <div>
                <div className="ct-section-label"><RouteIcon size={12} /> Viaje activo</div>
                {selectedUnit.trip ? (
                  <div className="ct-info-card">
                    <div className="ct-trip-route">
                      <div className="ct-trip-line"><span className="ct-dot ct-dot--moving" />{selectedUnit.trip.origin}</div>
                      <div className="ct-trip-line ct-trip-dest"><span className="ct-dot ct-dot--stopped" />{selectedUnit.trip.destination}</div>
                    </div>
                    {tripProgress != null && (
                      <>
                        <div className="ct-progress"><div style={{ width: `${tripProgress}%` }} /></div>
                        <div className="ct-trip-meta">
                          <span>{selectedUnit.trip.kmCompleted} / {selectedUnit.trip.kmTotal} km</span>
                          <span>{tripProgress}%</span>
                        </div>
                      </>
                    )}
                    {selectedUnit.trip.estimatedArrival && (
                      <div className="ct-trip-meta">
                        <span>ETA estimada</span>
                        <span>{new Date(selectedUnit.trip.estimatedArrival).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="ct-info-card ct-muted-card">Sin viaje activo</div>
                )}
              </div>

              <div>
                <div className="ct-section-label"><AlertTriangle size={12} /> Documentación</div>
                <div className="ct-info-card">
                  <DocRow label="Seguro" value={selectedUnit.vehicle.insuranceExpiry} />
                  <DocRow label="Revisión técnica" value={selectedUnit.vehicle.technicalReviewExpiry} />
                  <DocRow label="Autorización de ruta" value={selectedUnit.vehicle.routeAuthorizationExpiry} />
                </div>
              </div>

              <div className="ct-coords-row">
                <div>
                  <span className="ct-coords-label">Última posición GPS</span>
                  <span className="ct-mono ct-coords-value">
                    {selectedUnit.lat != null && selectedUnit.lng != null
                      ? `${selectedUnit.lat.toFixed(6)}, ${selectedUnit.lng.toFixed(6)}`
                      : 'Sin coordenadas'}
                  </span>
                </div>
                {selectedUnit.lat != null && (
                  <button className="ct-icon-btn ct-sm" onClick={copyCoords} title="Copiar coordenadas">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </div>

              <div className="ct-drawer-actions">
                <button
                  className="ct-action-btn primary"
                  onClick={centerOnSelected}
                  disabled={selectedUnit.lat == null}
                >
                  <LocateFixed size={14} /> Centrar
                </button>
                <Link className="ct-action-btn" to="/trips">
                  <RouteIcon size={14} /> Ver viajes
                </Link>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
