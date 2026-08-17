import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Customer } from '../types';
import { Building2, Plus, Search } from 'lucide-react';
import { AddCustomerForm } from '../components/Forms';
import { useToast } from '../components/Toast';

export default function CustomersPage() {
  const { companyId } = useAuth();
  const { addToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    api.getCustomers(companyId)
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers(prev => [newCustomer, ...prev]);
    addToast(`Cliente ${newCustomer.name} creado con éxito`, 'success');
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.taxId || '').includes(search)
  );

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /><p>Cargando clientes...</p></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Building2 size={28} className="page-icon" /> Clientes / Dadores de Carga</h1>
          <p className="page-subtitle">{customers.length} clientes registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <AddCustomerForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCustomerCreated}
      />
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
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="td-empty">No se encontraron clientes</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
