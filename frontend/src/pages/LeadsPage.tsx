// LeadsPage.tsx - CRM de prospectos de la Landing Page
import { useState, useEffect } from 'react';
import api from '../api/client';
import { UserCheck, Search, Phone, Mail, Building, Truck, Calendar } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function LeadsPage() {
  const { addToast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getLeads()
      .then(setLeads)
      .catch(() => {
        addToast('Error al cargar prospectos comerciales', 'error');
        setLeads([]);
      })
      .finally(() => setLoading(false));
  }, [addToast]);

  const filtered = leads.filter(l =>
    (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.phone || '').includes(search)
  );

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /><p>Cargando prospectos comerciales...</p></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><UserCheck size={28} className="page-icon" /> Prospectos / Leads Comerciales</h1>
          <p className="page-subtitle">{leads.length} solicitudes de cotización recibidas desde la landing page</p>
        </div>
      </div>

      <div className="table-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, empresa o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card table-container">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <UserCheck size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>No hay prospectos registrados todavía. Probá completando el formulario en la landing page de tu dominio.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Contacto</th>
                <th>Empresa</th>
                <th>Flota</th>
                <th>Plan Solicitado</th>
                <th>Teléfono / WhatsApp</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                      <span>{new Date(lead.createdAt).toLocaleString('es-AR')}</span>
                    </div>
                  </td>
                  <td>
                    <strong>{lead.name}</strong>
                    {lead.email && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}><Mail size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{lead.email}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building size={14} style={{ color: 'var(--primary)' }} />
                      <span>{lead.companyName}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Truck size={14} style={{ color: 'var(--accent-blue)' }} />
                      <span>{lead.fleetSize}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-blue">{lead.planRequested || 'General'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} style={{ color: 'var(--accent-emerald)' }} />
                      <span>{lead.phone}</span>
                    </div>
                  </td>
                  <td>
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(lead.name)},%20te%20contactamos%20de%20Control%20Tower%20en%20relación%20a%20tu%20consulta%20por%20el%20plan%20${encodeURIComponent(lead.planRequested || 'Logística')}.`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-primary"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Phone size={14} /> Contactar WhatsApp
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
