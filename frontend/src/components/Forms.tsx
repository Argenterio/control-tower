// Form components for creating/editing entities
import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import Modal from './Modal';
import type { Vehicle, Driver, Customer, Trip } from '../types';

// ─── Add Vehicle Form ───
interface VehicleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (v: Vehicle) => void;
}

interface VehicleFormState {
  licensePlate: string;
  brand: string;
  model: string;
  type: 'truck' | 'van' | 'motorcycle';
  status: 'active' | 'inactive' | 'maintenance' | 'out_of_service';
  kmTotal: number;
}

export function AddVehicleForm({ isOpen, onClose, onCreated }: VehicleFormProps) {
  const { companyId } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<VehicleFormState>({
    licensePlate: '',
    brand: '',
    model: '',
    type: 'truck',
    status: 'active',
    kmTotal: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.licensePlate) { setError('La patente es obligatoria'); return; }
    setSaving(true);
    setError('');
    try {
      const vehicle = await api.createVehicle({ ...form, companyId });
      onCreated(vehicle);
      onClose();
      setForm({ licensePlate: '', brand: '', model: '', type: 'truck', status: 'active', kmTotal: 0 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear vehículo';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Unidad" width="520px">
      <form onSubmit={handleSubmit} className="form-grid">
        {error && <div className="form-error">{error}</div>}
        <div className="form-row">
          <label>Patente *<input type="text" placeholder="AA 123 BB" value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value.toUpperCase() }))} required /></label>
          <label>Tipo<select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Vehicle['type'] }))}>
            <option value="truck">Camión</option>
            <option value="van">Utilitario</option>
            <option value="motorcycle">Motocicleta</option>
          </select></label>
        </div>
        <div className="form-row">
          <label>Marca<input type="text" placeholder="Scania, Mercedes..." value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></label>
          <label>Modelo<input type="text" placeholder="R500, Actros..." value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></label>
        </div>
        <div className="form-row">
          <label>Km Total<input type="number" value={form.kmTotal} onChange={e => setForm(f => ({ ...f, kmTotal: parseInt(e.target.value) || 0 }))} /></label>
          <label>Estado<select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Vehicle['status'] }))}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="maintenance">En mantenimiento</option>
          </select></label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar Unidad'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add Driver Form ───
interface DriverFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (d: Driver) => void;
}

interface DriverFormState {
  fullName: string;
  dni: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: 'active' | 'inactive' | 'suspended';
}

export function AddDriverForm({ isOpen, onClose, onCreated }: DriverFormProps) {
  const { companyId } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<DriverFormState>({
    fullName: '',
    dni: '',
    phone: '',
    email: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'active',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName) { setError('El nombre es obligatorio'); return; }
    if (!form.dni) { setError('El DNI es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      const driver = await api.createDriver({ ...form, companyId, totalTrips: 0, totalKm: 0 });
      onCreated(driver);
      onClose();
      setForm({ fullName: '', dni: '', phone: '', email: '', licenseNumber: '', licenseExpiry: '', status: 'active' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear chofer';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Chofer" width="560px">
      <form onSubmit={handleSubmit} className="form-grid">
        {error && <div className="form-error">{error}</div>}
        <div className="form-row">
          <label>Nombre Completo *<input type="text" placeholder="Juan Pérez" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required /></label>
          <label>DNI *<input type="text" placeholder="12345678" value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} required /></label>
        </div>
        <div className="form-row">
          <label>Teléfono<input type="tel" placeholder="+54 11 1234-5678" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></label>
          <label>Email<input type="email" placeholder="chofer@empresa.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></label>
        </div>
        <div className="form-row">
          <label>N° Licencia LNH<input type="text" placeholder="LNH-12345" value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} /></label>
          <label>Vencimiento Licencia<input type="date" value={form.licenseExpiry} onChange={e => setForm(f => ({ ...f, licenseExpiry: e.target.value }))} /></label>
        </div>
        <div className="form-row">
          <label>Estado<select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Driver['status'] }))}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="suspended">Suspendido</option>
          </select></label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar Chofer'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add Customer Form ───
interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (c: Customer) => void;
}

export function AddCustomerForm({ isOpen, onClose, onCreated }: CustomerFormProps) {
  const { companyId } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', taxId: '', address: '', phone: '', email: '',
    status: 'active' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      const customer = await api.createCustomer({ ...form, companyId });
      onCreated(customer);
      onClose();
      setForm({ name: '', taxId: '', address: '', phone: '', email: '', status: 'active' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear cliente';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Cliente / Dador de Carga" width="560px">
      <form onSubmit={handleSubmit} className="form-grid">
        {error && <div className="form-error">{error}</div>}
        <div className="form-row">
          <label>Razón Social *<input type="text" placeholder="Arcor S.A.I.C." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></label>
          <label>CUIT<input type="text" placeholder="30-12345678-9" value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} /></label>
        </div>
        <div className="form-row">
          <label>Dirección<input type="text" placeholder="Av. Corrientes 1234, CABA" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></label>
        </div>
        <div className="form-row">
          <label>Teléfono<input type="tel" placeholder="+54 11 1234-5678" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></label>
          <label>Email<input type="email" placeholder="compras@empresa.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar Cliente'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add Trip Form ───
interface TripFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (t: Trip) => void;
}

export function AddTripForm({ isOpen, onClose, onCreated }: TripFormProps) {
  const { companyId } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({
    origin: '', destination: '', vehicleId: '', driverId: '', customerId: '',
    fare: 0, kmTotal: 0, startTime: '', notes: '',
  });

  useEffect(() => {
    if (isOpen && companyId) {
      api.getVehicles(companyId).then(setVehicles).catch(() => {});
      api.getDrivers(companyId).then(setDrivers).catch(() => {});
      api.getCustomers(companyId).then(setCustomers).catch(() => {});
    }
  }, [isOpen, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.origin || !form.destination) { setError('Origen y destino son obligatorios'); return; }
    setSaving(true);
    setError('');
    try {
      const trip = await api.createTrip({
        ...form, companyId,
        status: 'pending',
        kmCompleted: 0,
        fare: form.fare || undefined,
        kmTotal: form.kmTotal || undefined,
        startTime: form.startTime || undefined,
      });
      onCreated(trip);
      onClose();
      setForm({ origin: '', destination: '', vehicleId: '', driverId: '', customerId: '', fare: 0, kmTotal: 0, startTime: '', notes: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear viaje';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Viaje" width="620px">
      <form onSubmit={handleSubmit} className="form-grid">
        {error && <div className="form-error">{error}</div>}
        <div className="form-row">
          <label>Origen *<input type="text" placeholder="Zárate, Bs. As." value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} required /></label>
          <label>Destino *<input type="text" placeholder="Rosario, Santa Fe" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} required /></label>
        </div>
        <div className="form-row">
          <label>Unidad
            <select value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {vehicles.filter(v => v.status === 'active').map(v => (
                <option key={v.id} value={v.id}>{v.licensePlate} - {v.brand} {v.model}</option>
              ))}
            </select>
          </label>
          <label>Chofer
            <select value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {drivers.filter(d => d.status === 'active').map(d => (
                <option key={d.id} value={d.id}>{d.fullName} - {d.dni}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>Cliente / Dador de Carga
            <select value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>Fecha de Salida<input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></label>
        </div>
        <div className="form-row">
          <label>Tarifa (ARS)<input type="number" placeholder="1500000" value={form.fare || ''} onChange={e => setForm(f => ({ ...f, fare: parseInt(e.target.value) || 0 }))} /></label>
          <label>Km Estimados<input type="number" placeholder="450" value={form.kmTotal || ''} onChange={e => setForm(f => ({ ...f, kmTotal: parseInt(e.target.value) || 0 }))} /></label>
        </div>
        <div className="form-row form-full">
          <label>Notas<textarea placeholder="Instrucciones especiales, remito, carga..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Crear Viaje'}</button>
        </div>
      </form>
    </Modal>
  );
}
