// Customers Page
import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Customer } from '../types';
import { Building2, Plus, Search, X, Loader2, Edit, Trash2 } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function CustomersPage() {
  const { companyId } = useAuth();
  const { addToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    address: '',
    phone: '',
    email: '',
    status: 'active' as 'active' | 'inactive' | 'blocked',
  });

  useEffect(() => {
    api.getCustomers(companyId)
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.taxId || '').includes(search)
  );

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', taxId: '', address: '', phone: '', email: '', status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      taxId: customer.taxId || '',
      address: customer.address || '',
      phone: customer.phone || '',
      email: customer.email || '',
      status: customer.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('El nombre es obligatorio', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editingCustomer) {
        await api.patch<Customer>(`/api/customers/${editingCustomer.id}`, formData);
        addToast('Cliente actualizado', 'success');
      } else {
        await api.createCustomer({ ...formData, companyId });
        addToast('Cliente creado', 'success');
      }
      const updated = await api.getCustomers(companyId);
      setCustomers(updated);
      closeModal();
    } catch (err: any) {
      addToast(err.message || 'Error al guardar cliente', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`¿Eliminar cliente "${customer.name}"?`)) return;
    try {
      await api.patch(`/api/customers/${customer.id}`, { status: 'inactive' });
      addToast('Cliente desactivado', 'success');
      const updated = await api.getCustomers(companyId);
      setCustomers(updated);
    } catch (err: any) {
      addToast(err.message || 'Error al eliminar', 'error');
    }
  };

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /><p>Cargando clientes...</p></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Building2 size={28} className="page-icon" /> Clientes</h1>
          <p className="page-subtitle">{customers.length} clientes registrados</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}><Plus size={18} /> Nuevo Cliente</button>
      </div>
      <div className="table-controls">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Buscar por nombre o CUIT..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre / Razón Social</th>
              <th>CUIT</th>
              <th>Dirección</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Estado</th>
              <th style={{ width: '100px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td className="td-bold">{c.name}</td>
                <td className="td-mono">{c.taxId || '—'}</td>
                <td>{c.address || '—'}</td>
                <td>{c.phone || '—'}</td>
                <td>{c.email || '—'}</td>
                <td><span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{c.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-neutral" onClick={() => openEditModal(c)} title="Editar"><Edit size={14} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c)} title="Desactivar"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="td-empty">No se encontraron clientes</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            <h3 className="modal-title">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              <div className="form-group">
                <label>Nombre / Razón Social *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: YPF S.A." />
              </div>
              <div className="form-group">
                <label>CUIT</label>
                <input type="text" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} placeholder="30-12345678-9" />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Av. del Libertador 1000, CABA" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+54 11 4321-0000" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="compras@empresa.com" />
                </div>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as 'active'|'inactive'|'blocked'})}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }} disabled={submitting}>
                {submitting ? (<><Loader2 size={18} className="spinner" /> Guardando...</>) : (editingCustomer ? 'Actualizar' : 'Crear Cliente')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal styles (inline para no tocar CSS global)
const style = document.createElement('style');
style.textContent = `
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal-box { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); max-width: 500px; width: 100%; padding: 24px; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
.modal-close { position: absolute; top: 16px; right: 16px; color: var(--text-muted); padding: 4px; background: none; border: none; cursor: pointer; }
.modal-close:hover { color: var(--text-main); }
.modal-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; font-weight: 600; color: var(--text-muted); }
.form-group input, .form-group select { width: 100%; padding: 12px; background: var(--bg-main); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); color: var(--text-main); font-size: 14px; outline: none; }
.form-group input:focus, .form-group select:focus { border-color: var(--primary); }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(0,0,0,0.3); border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.btn-sm { padding: 6px 10px; font-size: 13px; }
.btn-neutral { background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); color: var(--text-muted); }
.btn-neutral:hover { background: rgba(255,255,255,0.08); }
.btn-danger { background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.2); color: var(--accent-rose); }
.btn-danger:hover { background: rgba(244,63,94,0.2); }
`;
if (typeof document !== 'undefined' && !document.querySelector('#customers-modal-styles')) {
  style.id = 'customers-modal-styles';
  document.head.appendChild(style);
}
