import { useState } from 'react';
import { Wrench, Plus, Search, CheckCircle2 } from 'lucide-react';

interface MaintenanceRecord {
  id: string;
  vehicle: string;
  type: 'preventive' | 'corrective';
  description: string;
  workshop: string;
  date: string;
  nextDate?: string;
  kmAtService: number;
  cost: number;
  status: 'completed' | 'in_progress' | 'scheduled';
}

const DEMO_MAINTENANCE: MaintenanceRecord[] = [
  { id: 'M-01', vehicle: 'AF 342 KL (Scania R450)', type: 'preventive', description: 'Service 150.000 km (Aceite sintético, filtros motor y secador)', workshop: 'Taller Central Campana', date: '2026-08-10', nextDate: '2026-11-10', kmAtService: 145000, cost: 890000, status: 'completed' },
  { id: 'M-02', vehicle: 'AE 819 BC (Mercedes Actros)', type: 'corrective', description: 'Cambio de pastillas y discos de freno eje delantero', workshop: 'Frenos San Martín (Rosario)', date: '2026-08-14', kmAtService: 219000, cost: 1250000, status: 'completed' },
  { id: 'M-03', vehicle: 'AG 105 OP (Iveco Stralis)', type: 'corrective', description: 'Reparación de fuelle neumático y sensor de ABS', workshop: 'Iveco Oficial Córdoba', date: '2026-08-16', kmAtService: 98500, cost: 620000, status: 'in_progress' },
  { id: 'M-04', vehicle: 'AD 990 ZZ (Volvo FH 500)', type: 'preventive', description: 'Rotación y alineación de 10 neumáticos', workshop: 'Gomería Rutas Pampeanas', date: '2026-08-20', nextDate: '2026-12-20', kmAtService: 315000, cost: 340000, status: 'scheduled' },
  { id: 'M-05', vehicle: 'AF 228 PQ (Scania G410)', type: 'preventive', description: 'Control de baterías y sistema de inyección', workshop: 'Taller Central Campana', date: '2026-08-22', nextDate: '2026-11-22', kmAtService: 178000, cost: 410000, status: 'scheduled' },
];

export function MaintenancePage() {
  const [search, setSearch] = useState('');

  const filtered = DEMO_MAINTENANCE.filter(m =>
    m.vehicle.toLowerCase().includes(search.toLowerCase()) ||
    m.description.toLowerCase().includes(search.toLowerCase()) ||
    m.workshop.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Wrench size={28} className="page-icon" /> Mantenimiento y Talleres</h1>
          <p className="page-subtitle">Programación preventiva, correctivos, repuestos y control de costos</p>
        </div>
        <button className="btn btn-primary"><Plus size={18} /> Registrar Orden de Trabajo</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-value">3</span>
          <span className="kpi-label">Completados este mes</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-cyan)' }}>1</span>
          <span className="kpi-label">En Taller Ahora</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-purple)' }}>2</span>
          <span className="kpi-label">Turnos Programados</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">$3.51M</span>
          <span className="kpi-label">Inversión en Mantenimiento</span>
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
                <td className="td-bold">{m.vehicle}</td>
                <td>
                  <span className={`badge ${m.type === 'preventive' ? 'badge-primary' : 'badge-warning'}`}>
                    {m.type === 'preventive' ? 'Preventivo' : 'Correctivo'}
                  </span>
                </td>
                <td>{m.description}</td>
                <td>{m.workshop}</td>
                <td>{new Date(m.date).toLocaleDateString('es-AR')}</td>
                <td className="td-bold">${m.cost.toLocaleString('es-AR')}</td>
                <td>
                  {m.status === 'completed' && <span className="badge badge-success"><CheckCircle2 size={12} style={{ marginRight: 4 }} /> Listo</span>}
                  {m.status === 'in_progress' && <span className="badge badge-cyan">En taller</span>}
                  {m.status === 'scheduled' && <span className="badge badge-purple">Programado</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
