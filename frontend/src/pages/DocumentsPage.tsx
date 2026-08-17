import { useState } from 'react';
import { FileText, AlertTriangle, CheckCircle, Clock, Plus, Search, Filter } from 'lucide-react';

interface LegalDoc {
  id: string;
  category: 'vehiculo' | 'chofer' | 'empresa';
  entity: string;
  docType: 'RTO / VTV' | 'RUTA' | 'Póliza de Seguro' | 'Licencia LNH' | 'Psicofísico' | 'ART' | 'Habilitación SENASA';
  number: string;
  expiryDate: string;
  daysRemaining: number;
  status: 'valid' | 'expiring' | 'expired';
}

const DEMO_DOCS: LegalDoc[] = [
  { id: 'D-01', category: 'vehiculo', entity: 'AF 342 KL (Scania R450)', docType: 'RTO / VTV', number: 'RTO-88934-BA', expiryDate: '2026-09-02', daysRemaining: 17, status: 'expiring' },
  { id: 'D-02', category: 'vehiculo', entity: 'AE 819 BC (Mercedes Actros)', docType: 'RUTA', number: 'RUTA-299104', expiryDate: '2027-02-15', daysRemaining: 183, status: 'valid' },
  { id: 'D-03', category: 'vehiculo', entity: 'AG 105 OP (Iveco Stralis)', docType: 'Póliza de Seguro', number: 'POL-CHUBB-9921', expiryDate: '2026-08-12', daysRemaining: -4, status: 'expired' },
  { id: 'D-04', category: 'chofer', entity: 'Carlos Rodríguez', docType: 'Licencia LNH', number: 'LNH-29831920', expiryDate: '2026-11-20', daysRemaining: 96, status: 'valid' },
  { id: 'D-05', category: 'chofer', entity: 'Martín Benítez', docType: 'Psicofísico', number: 'PSICO-CNRT-884', expiryDate: '2026-08-28', daysRemaining: 12, status: 'expiring' },
  { id: 'D-06', category: 'chofer', entity: 'Lucas Gómez', docType: 'Licencia LNH', number: 'LNH-33102941', expiryDate: '2027-05-10', daysRemaining: 267, status: 'valid' },
  { id: 'D-07', category: 'empresa', entity: 'Transportes Pampeana S.A.', docType: 'ART', number: 'ART-ASOC-99281', expiryDate: '2026-12-31', daysRemaining: 137, status: 'valid' },
  { id: 'D-08', category: 'vehiculo', entity: 'AD 990 ZZ (Volvo FH 500)', docType: 'Habilitación SENASA', number: 'SENASA-CAT-301', expiryDate: '2026-10-15', daysRemaining: 60, status: 'valid' },
];

export function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = DEMO_DOCS.filter(d => {
    const matchSearch = d.entity.toLowerCase().includes(search.toLowerCase()) ||
      d.docType.toLowerCase().includes(search.toLowerCase()) ||
      d.number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const expiredCount = DEMO_DOCS.filter(d => d.status === 'expired').length;
  const expiringCount = DEMO_DOCS.filter(d => d.status === 'expiring').length;
  const validCount = DEMO_DOCS.filter(d => d.status === 'valid').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><FileText size={28} className="page-icon" /> Control Documental y Vencimientos</h1>
          <p className="page-subtitle">Monitoreo legal de RUTA, RTO, LNH, Seguros, SENASA y ART</p>
        </div>
        <button className="btn btn-primary"><Plus size={18} /> Cargar Documento</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-rose)' }}>{expiredCount}</span>
          <span className="kpi-label">Documentos Vencidos</span>
          <span className="kpi-trend negative"><AlertTriangle size={14} /> Riesgo operativo / multas</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-amber)' }}>{expiringCount}</span>
          <span className="kpi-label">Vencen en &lt; 30 días</span>
          <span className="kpi-trend neutral"><Clock size={14} /> Gestión de renovación</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>{validCount}</span>
          <span className="kpi-label">Documentos Vigentes</span>
          <span className="kpi-trend positive"><CheckCircle size={14} /> En regla</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">87.5%</span>
          <span className="kpi-label">Índice de Cumplimiento</span>
          <span className="kpi-trend positive">Semáforo Verde</span>
        </div>
      </div>

      <div className="table-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por unidad, chofer o tipo de documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="expired">🔴 Vencidos</option>
            <option value="expiring">🟡 Próximos a vencer</option>
            <option value="valid">🟢 Vigentes</option>
          </select>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Entidad / Titular</th>
              <th>Tipo de Documento</th>
              <th>Nro. Certificado</th>
              <th>Fecha Vencimiento</th>
              <th>Días Restantes</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id}>
                <td>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {d.category}
                  </span>
                </td>
                <td className="td-bold">{d.entity}</td>
                <td>{d.docType}</td>
                <td className="td-mono">{d.number}</td>
                <td>{new Date(d.expiryDate).toLocaleDateString('es-AR')}</td>
                <td>
                  {d.daysRemaining < 0 ? (
                    <span className="text-danger">Vencido hace {Math.abs(d.daysRemaining)} días</span>
                  ) : d.daysRemaining <= 30 ? (
                    <span className="text-warning">{d.daysRemaining} días</span>
                  ) : (
                    <span>{d.daysRemaining} días</span>
                  )}
                </td>
                <td>
                  {d.status === 'expired' && <span className="badge badge-danger">🔴 Vencido</span>}
                  {d.status === 'expiring' && <span className="badge badge-warning">🟡 Por Vencer</span>}
                  {d.status === 'valid' && <span className="badge badge-success">🟢 Vigente</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
