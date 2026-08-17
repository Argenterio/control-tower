import { useState } from 'react';
import { Fuel, AlertTriangle, Plus, Search } from 'lucide-react';

interface FuelRecord {
  id: string;
  date: string;
  licensePlate: string;
  driver: string;
  station: string;
  liters: number;
  pricePerLiter: number;
  total: number;
  kmAtFill: number;
  consumptionLPer100Km: number;
  anomaly?: boolean;
}

const DEMO_FUEL: FuelRecord[] = [
  { id: 'F-101', date: '2026-08-16', licensePlate: 'AF 342 KL', driver: 'Carlos Rodríguez', station: 'YPF Directo Zárate', liters: 480, pricePerLiter: 1120, total: 537600, kmAtFill: 142500, consumptionLPer100Km: 34.2 },
  { id: 'F-102', date: '2026-08-15', licensePlate: 'AE 819 BC', driver: 'Martín Benítez', station: 'Shell Leones (RN9)', liters: 520, pricePerLiter: 1150, total: 598000, kmAtFill: 218900, consumptionLPer100Km: 35.8 },
  { id: 'F-103', date: '2026-08-15', licensePlate: 'AG 105 OP', driver: 'Lucas Gómez', station: 'Axion San Nicolás', liters: 610, pricePerLiter: 1130, total: 689300, kmAtFill: 98400, consumptionLPer100Km: 42.1, anomaly: true },
  { id: 'F-104', date: '2026-08-14', licensePlate: 'AD 990 ZZ', driver: 'Fernando Maidana', station: 'Puma Rosario Sur', liters: 450, pricePerLiter: 1090, total: 490500, kmAtFill: 312000, consumptionLPer100Km: 33.9 },
  { id: 'F-105', date: '2026-08-14', licensePlate: 'AF 228 PQ', driver: 'Diego Álvarez', station: 'YPF Villa María', liters: 490, pricePerLiter: 1120, total: 548800, kmAtFill: 176300, consumptionLPer100Km: 34.5 },
];

export function FuelPage() {
  const [search, setSearch] = useState('');

  const filtered = DEMO_FUEL.filter(f =>
    f.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
    f.driver.toLowerCase().includes(search.toLowerCase()) ||
    f.station.toLowerCase().includes(search.toLowerCase())
  );

  const totalSpent = DEMO_FUEL.reduce((acc, f) => acc + f.total, 0);
  const totalLiters = DEMO_FUEL.reduce((acc, f) => acc + f.liters, 0);
  const avgConsumption = (DEMO_FUEL.reduce((acc, f) => acc + f.consumptionLPer100Km, 0) / DEMO_FUEL.length).toFixed(1);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Fuel size={28} className="page-icon" /> Control de Combustible</h1>
          <p className="page-subtitle">Seguimiento de cargas, rendimiento L/100km y detección de anomalías</p>
        </div>
        <button className="btn btn-primary"><Plus size={18} /> Cargar Ticket / Despacho</button>
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
          <span className="kpi-value" style={{ color: 'var(--accent-amber)' }}>1 Alerta</span>
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
              <th>Estación</th>
              <th>Litros</th>
              <th>Precio/L</th>
              <th>Total ($)</th>
              <th>Rendimiento</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id}>
                <td>{new Date(f.date).toLocaleDateString('es-AR')}</td>
                <td className="td-bold">{f.licensePlate}</td>
                <td>{f.driver}</td>
                <td>{f.station}</td>
                <td>{f.liters} L</td>
                <td>${f.pricePerLiter}</td>
                <td className="td-bold">${f.total.toLocaleString('es-AR')}</td>
                <td>
                  <span className={f.anomaly ? 'text-danger' : ''}>
                    {f.consumptionLPer100Km} L/100km
                  </span>
                </td>
                <td>
                  {f.anomaly ? (
                    <span className="badge badge-danger">
                      <AlertTriangle size={12} style={{ marginRight: 4 }} /> +22% Desvío
                    </span>
                  ) : (
                    <span className="badge badge-success">Normal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
