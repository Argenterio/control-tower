import { useState } from 'react';
import { Settings, Building, Phone, Radio, Save, Check } from 'lucide-react';

export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [companyName, setCompanyName] = useState('Transportes Pampeana S.A.');
  const [cuit, setCuit] = useState('30-71234567-8');
  const [email, setEmail] = useState('operaciones@transportespampeana.com.ar');
  const [phone, setPhone] = useState('+54 9 11 4820-9900');
  const [address, setAddress] = useState('Ruta Panamericana Km 52.5, Campana, Buenos Aires');
  const [gpsProvider, setGpsProvider] = useState('geotab');
  const [whatsappNumber, setWhatsappNumber] = useState('+54 9 11 5500-1122');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Settings size={28} className="page-icon" /> Configuración de la Empresa</h1>
          <p className="page-subtitle">Parámetros del tenant, integraciones telemáticas y canales de mensajería</p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840 }}>
        {/* Company Profile */}
        <div className="chart-card">
          <div className="chart-header">
            <h3><Building size={18} color="var(--primary)" /> Perfil Corporativo</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Razón Social / Nombre</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>CUIT</label>
              <input type="text" value={cuit} onChange={e => setCuit(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Email de Contacto Operativo</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Teléfono Central</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Dirección / Base de Operaciones</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Telemetry & Integrations */}
        <div className="chart-card">
          <div className="chart-header">
            <h3><Radio size={18} color="var(--accent-emerald)" /> Integración Telemática y GPS</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Proveedor Principal de GPS / Telemática</label>
              <select
                value={gpsProvider}
                onChange={e => setGpsProvider(e.target.value)}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '12px 16px', color: '#fff', outline: 'none' }}
              >
                <option value="geotab">Geotab Fleet Telematics</option>
                <option value="ituran">Ituran GPS Argentina</option>
                <option value="pointer">Pointer / PowerFleet</option>
                <option value="sitrack">Sitrack Logística</option>
                <option value="localsat">Localsat Rastreo</option>
                <option value="custom">API Genérica / Webhook REST</option>
              </select>
            </div>
            <div className="form-group">
              <label>Zona Horaria Operativa</label>
              <input type="text" value={timezone} onChange={e => setTimezone(e.target.value)} readOnly />
            </div>
          </div>
        </div>

        {/* WhatsApp Operativo */}
        <div className="chart-card">
          <div className="chart-header">
            <h3><Phone size={18} color="var(--accent-cyan)" /> Canal WhatsApp Choferes (n8n Webhook)</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Número WhatsApp Bot Operativo</label>
              <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Estado de la Conexión</label>
              <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#34d399', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="live-dot" /> Conectado con n8n Webhook Gateway
              </div>
            </div>
          </div>
        </div>

        <div>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: 15 }}>
            {saved ? <><Check size={18} /> Guardado con Éxito</> : <><Save size={18} /> Guardar Configuración</>}
          </button>
        </div>
      </form>
    </div>
  );
}
