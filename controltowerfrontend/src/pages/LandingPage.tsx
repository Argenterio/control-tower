// LandingPage.tsx - Landing page profesional para Control Tower 360 en Argentina
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio, ShieldCheck, ArrowRight, AlertTriangle, Cpu,
  MapPin,
  X, Loader2, Truck, Users, ClipboardList,
  Smartphone
} from 'lucide-react';

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Starter (10-25 camiones)');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [fleetSize, setFleetSize] = useState('10-25 camiones');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const openModal = (planName: string) => {
    setSelectedPlan(planName);
    setSuccessMsg('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name || !companyName || !phone) {
      setErrorMsg('Por favor completá los campos obligatorios (Nombre, Empresa y Teléfono).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('https://api.generarise.space/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          companyName,
          fleetSize,
          phone,
          email,
          planRequested: selectedPlan
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || '¡Solicitud enviada con éxito! Nos pondremos en contacto a la brevedad.');
        setName('');
        setCompanyName('');
        setPhone('');
        setEmail('');
      } else {
        setErrorMsg(data.error || 'Error al enviar la solicitud. Por favor intentá nuevamente.');
      }
    } catch {
      setErrorMsg('Error de conexión con el servidor. Verificá tu red e intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToDemo = () => {
    const demoSection = document.getElementById('demo');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      openModal('Demostración Corporativa');
    }
  };

  return (
    <div className="landing-container">
      {/* Background Orbs */}
      <div className="landing-bg-effects">
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="landing-orb landing-orb-3" />
      </div>

      {/* Header */}
      <header className="landing-header">
        <Link to="/marketing" className="landing-logo">
          <Radio size={32} />
          <span className="landing-logo-text">Control Tower 360</span>
        </Link>
        <div className="landing-nav-actions">
          <Link to="/login" className="landing-nav-btn landing-nav-btn-outline">
            Ingresar a Consola
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="landing-content">
        
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-text-area">
            <div className="hero-tag">
              <Cpu size={14} />
              <span>Nuevo SaaS Logístico</span>
            </div>
            <h1 className="hero-title">
              Control-Tower 360
            </h1>
            <p className="hero-desc">
              Centralizá choferes, unidades, clientes y viajes en una sola plataforma.
              Diseñado para empresas de transporte que necesitan visibilidad y control operativo.
            </p>
            <div className="hero-actions">
              <button onClick={scrollToDemo} className="btn-cta btn-cta-primary" style={{ cursor: 'pointer' }}>
                Solicitar demostración
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="hero-graphic">
            <div className="hero-mockup-wrapper">
              <div className="hero-mockup">
                <div className="mockup-header">
                  <div className="mockup-dot mockup-dot-red" />
                  <div className="mockup-dot mockup-dot-yellow" />
                  <div className="mockup-dot mockup-dot-green" />
                </div>
                <div className="mockup-body">
                  <div className="mockup-grid">
                    <div className="mockup-card">
                      <div className="mockup-title">Unidades Activas</div>
                      <div className="mockup-val">24 / 28</div>
                    </div>
                    <div className="mockup-card">
                      <div className="mockup-title">Viajes en Ruta</div>
                      <div className="mockup-val">12</div>
                    </div>
                    <div className="mockup-card">
                      <div className="mockup-title">Alertas Críticas</div>
                      <div className="mockup-val" style={{ color: 'var(--accent-rose)' }}>2</div>
                    </div>
                  </div>
                  <div className="mockup-chat">
                    <div className="mockup-bubble mockup-bubble-driver">
                      <strong>Chofer (Esteban):</strong> "Saliendo de planta Campana con carga completa. Destino: Bahía Blanca. KM 102.400"
                    </div>
                    <div className="mockup-bubble mockup-bubble-bot">
                      <strong>Control Tower IA:</strong> "Registrado. Viaje #402 en curso. Estado: En Ruta. Estimado de llegada Bahía Blanca: Martes 14:30. Manejá con cuidado, Esteban."
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEM SECTION - ANTES / DESPUÉS */}
        <section className="pain-section">
          <div className="section-title-area">
            <span className="section-tag">El problema actual</span>
            <h2 className="section-title">¿Tu operación sigue dependiendo de planillas?</h2>
            <p className="section-subtitle">
              Información dispersa, llamados constantes y poca visibilidad del estado real de cada viaje.
            </p>
          </div>
          <div className="pain-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="pain-card">
              <div className="pain-icon">
                <AlertTriangle size={24} />
              </div>
              <h3 className="pain-card-title">Antes: Operación dispersa</h3>
              <p className="pain-card-desc">
                Choferes en Excel, documentación en carpetas y viajes coordinados por WhatsApp.
                Sin trazabilidad real ni visibilidad centralizada.
              </p>
            </div>

            <div className="pain-card" style={{ borderColor: 'rgba(56, 189, 248, 0.3)', backgroundColor: 'rgba(56, 189, 248, 0.01)' }}>
              <div className="pain-icon" style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', color: 'var(--primary)', borderColor: 'rgba(56, 189, 248, 0.15)' }}>
                <ShieldCheck size={24} />
              </div>
              <h3 className="pain-card-title">Después: Control-Tower 360</h3>
              <p className="pain-card-desc">
                Toda la operación unificada en un tablero único para tráfico, administración y dirección.
                Visibilidad total en tiempo real.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES GRID SECTION - 4 MODULES */}
        <section className="features-section">
          <div className="section-title-area">
            <span className="section-tag">Módulos principales</span>
            <h2 className="section-title">Todo lo que necesitás para operar</h2>
            <p className="section-subtitle">
              Cada módulo fue pensado para el trabajo diario del transporte terrestre.
            </p>
          </div>
          <div className="features-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">
                  <Truck size={24} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Flota</h3>
                <p className="feature-desc">
                  Documentación, vencimientos y estado de cada unidad. Control total de tu parque vehicular.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">
                  <MapPin size={24} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Viajes</h3>
                <p className="feature-desc">
                  Seguimiento operativo y control del recorrido. Trazabilidad completa de cada viaje.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">
                  <Users size={24} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Choferes</h3>
                <p className="feature-desc">
                  Legajos, licencias y asignaciones centralizadas. Gestión de personal de conducción.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">
                  <ClipboardList size={24} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Clientes</h3>
                <p className="feature-desc">
                  Historial, órdenes y trazabilidad comercial. Gestión comercial integrada.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* IMPLEMENTATION STEPS */}
        <section className="solution-section" id="demo">
          <div className="section-title-area">
            <span className="section-tag">Implementación asistida</span>
            <h2 className="section-title">Implementación asistida sin fricción</h2>
            <p className="section-subtitle">
              No necesitás cargar todo manualmente ni abrir tu sistema administrativo.
            </p>
          </div>
          <div className="process-steps">
            <div className="process-step">
              <div className="process-num">1</div>
              <h3 className="process-title">Exportan Excel</h3>
              <p className="process-desc">
                Choferes, clientes y unidades desde el sistema que ya utilizan.
              </p>
            </div>
            <div className="process-step">
              <div className="process-num">2</div>
              <h3 className="process-title">Nosotros migramos</h3>
              <p className="process-desc">
                Importamos la información y configuramos Control-Tower 360.
              </p>
            </div>
            <div className="process-step">
              <div className="process-num">3</div>
              <h3 className="process-title">Empiezan a operar</h3>
              <p className="process-desc">
                Validan los datos y el equipo comienza a trabajar inmediatamente.
              </p>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="cta-section">
          <div className="cta-box">
            <div className="cta-box-orb" />
            <h2 className="cta-title">Solicitá una demostración de 20 minutos</h2>
            <p className="cta-desc">
              Analizamos tu operación y te mostramos cómo quedaría Control-Tower 360 con los datos de tu empresa.
            </p>
            <div className="hero-actions" style={{ justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button onClick={() => openModal('Demostración Corporativa')} className="btn-cta btn-cta-primary" style={{ cursor: 'pointer' }}>
                Solicitar Demostración
                <ArrowRight size={16} />
              </button>
              <a href="https://wa.me/5491122543534" target="_blank" rel="noopener noreferrer" className="btn-cta btn-cta-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={16} />
                Hablar por WhatsApp
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* LEAD CAPTURE MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)', maxWidth: '500px', width: '100%',
            padding: '32px', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute', top: '20px', right: '20px', background: 'transparent',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Solicitar Propuesta Comercial</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Estás consultando por el plan: <strong style={{ color: 'var(--primary)' }}>{selectedPlan}</strong>. Completá tus datos y un ejecutivo técnico se comunicará con vos.
            </p>

            {successMsg ? (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--accent-emerald)', padding: '20px', borderRadius: 'var(--radius-md)',
                textAlign: 'center', fontSize: '15px', fontWeight: '600', marginBottom: '20px'
              }}>
                {successMsg}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="btn-cta btn-cta-primary"
                  style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitLead} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {errorMsg && (
                  <div style={{
                    backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: 'var(--accent-rose)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px'
                  }}>
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Nombre y Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Carlos Gómez"
                    style={{
                      width: '100%', padding: '12px', backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                      color: 'var(--text-main)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Empresa de Logística / Transporte *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ej: Transportes Pampeana S.A."
                    style={{
                      width: '100%', padding: '12px', backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                      color: 'var(--text-main)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                      Cantidad de Camiones
                    </label>
                    <select
                      value={fleetSize}
                      onChange={(e) => setFleetSize(e.target.value)}
                      style={{
                        width: '100%', padding: '12px', backgroundColor: 'var(--bg-main)',
                        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                        color: 'var(--text-main)', fontSize: '14px', outline: 'none'
                      }}
                    >
                      <option value="10-25 camiones">10 a 25 camiones</option>
                      <option value="25-50 camiones">25 a 50 camiones</option>
                      <option value="50-100 camiones">50 a 100 camiones</option>
                      <option value="+100 camiones">+100 camiones</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej: +54 9 11 5500-1122"
                      style={{
                        width: '100%', padding: '12px', backgroundColor: 'var(--bg-main)',
                        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                        color: 'var(--text-main)', fontSize: '14px', outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Email Corporativo
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contacto@tuempresa.com.ar"
                    style={{
                      width: '100%', padding: '12px', backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                      color: 'var(--text-main)', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-cta btn-cta-primary"
                  style={{ width: '100%', marginTop: '8px', justifyContent: 'center', cursor: 'pointer' }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      Enviando solicitud...
                    </>
                  ) : (
                    'Enviar Solicitud de Propuesta'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <Link to="/marketing" className="footer-logo">
            <Radio size={20} />
            <span>Control Tower 360</span>
          </Link>
          <span className="footer-text">
            © {new Date().getFullYear()} Control Tower 360 · Plataforma de gestión logística para transporte terrestre.
          </span>
        </div>
      </footer>
    </div>
  );
}