// LandingPage.tsx - Landing page profesional para Control Tower en Argentina
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio, ShieldCheck, Play, ArrowRight, AlertTriangle, Cpu,
  MessageSquare, MapPin, Fuel, FileText, Wrench, ShieldAlert,
  Check, X, Loader2
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
        <Link to="/" className="landing-logo">
          <Radio size={32} />
          <span className="landing-logo-text">Control Tower</span>
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
              <span>Logística Avanzada con Inteligencia Artificial</span>
            </div>
            <h1 className="hero-title">
              Controlá tu flota de camiones desde <span>WhatsApp</span>.
            </h1>
            <p className="hero-desc">
              La primera plataforma operativa en Argentina para flotas de carga propias de más de 10 unidades. Nuestro motor procesa automáticamente partes de viaje, ubicaciones en tiempo real, gastos de gasoil y alertas legales interpretando los audios y textos de tus choferes. Sin planillas, sin carga manual.
            </p>
            <div className="hero-actions">
              <Link to="/login" className="btn-cta btn-cta-primary">
                Ingresar al Sistema / Login
                <Play size={16} />
              </Link>
              <button onClick={() => openModal('Cotización Comercial')} className="btn-cta btn-cta-secondary" style={{ cursor: 'pointer' }}>
                Solicitar Cotización
              </button>
            </div>
            <div className="hero-trust">
              <p className="hero-trust-text">Compatible con los sistemas que ya usás</p>
              <div className="hero-trust-badges">
                <div className="trust-badge">
                  <ShieldCheck size={16} />
                  <span>Geotab / Wialon</span>
                </div>
                <div className="trust-badge">
                  <ShieldCheck size={16} />
                  <span>Sitrack / GPS</span>
                </div>
                <div className="trust-badge">
                  <ShieldCheck size={16} />
                  <span>WhatsApp API</span>
                </div>
              </div>
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

        {/* PAIN SECTION */}
        <section className="pain-section">
          <div className="section-title-area">
            <span className="section-tag">El dolor de la flota propia</span>
            <h2 className="section-title">¿Cansado del descontrol operativo y del caos de WhatsApp?</h2>
            <p className="section-subtitle">
              Gestionar más de 10 camiones propios con planillas de Excel y audios sueltos de WhatsApp genera pérdidas silenciosas de miles de dólares por mes.
            </p>
          </div>
          <div className="pain-grid">
            <div className="pain-card">
              <div className="pain-icon">
                <AlertTriangle size={24} />
              </div>
              <h3 className="pain-card-title">Carga de datos tardía</h3>
              <p className="pain-card-desc">
                Los choferes mandan partes por audio, pero hasta que el administrativo lo pasa a la planilla el viaje ya terminó, perdiendo trazabilidad real y facturación inmediata.
              </p>
            </div>
            <div className="pain-card">
              <div className="pain-icon" style={{ backgroundColor: 'rgba(244,63,94,0.08)', color: 'var(--accent-rose)' }}>
                <ShieldAlert size={24} />
              </div>
              <h3 className="pain-card-title">Vencimientos sorpresa</h3>
              <p className="pain-card-desc">
                Seguros, habilitaciones de RUTA, licencias LINTI de los choferes o revisiones técnicas que vencen sin aviso. Multas pesadas o camiones parados por falta de papeles.
              </p>
            </div>
            <div className="pain-card">
              <div className="pain-icon" style={{ backgroundColor: 'rgba(244,63,94,0.08)', color: 'var(--accent-rose)' }}>
                <Fuel size={24} />
              </div>
              <h3 className="pain-card-title">Gasoil descontrolado</h3>
              <p className="pain-card-desc">
                Consumos inflados o desvíos de combustible difíciles de detectar. Los tickets de las estaciones de servicio se cargan a fin de mes, cuando ya es tarde para reclamar.
              </p>
            </div>
          </div>
        </section>

        {/* PROCESS SECTION */}
        <section className="solution-section">
          <div className="section-title-area">
            <span className="section-tag">Cómo funciona</span>
            <h2 className="section-title">Control total en 3 pasos sencillos</h2>
            <p className="section-subtitle">
              No cambiamos el comportamiento de tus choferes. Ellos siguen usando WhatsApp; nosotros nos encargamos del resto de forma automatizada.
            </p>
          </div>
          <div className="process-steps">
            <div className="process-step">
              <div className="process-num">1</div>
              <h3 className="process-title">El chofer habla por WhatsApp</h3>
              <p className="process-desc">
                El chofer comparte su ubicación real, manda un audio informando su km o una foto del remito y del ticket de carga de gasoil directamente a nuestro bot corporativo.
              </p>
            </div>
            <div className="process-step">
              <div className="process-num">2</div>
              <h3 className="process-title">La IA interpreta y procesa</h3>
              <p className="process-desc">
                Nuestro motor (Groq/Llama) lee el mensaje, normaliza el texto, detecta la acción (salida, llegada, demora, taller) y extrae los datos clave en milisegundos.
              </p>
            </div>
            <div className="process-step">
              <div className="process-num">3</div>
              <h3 className="process-title">Consola de Control al instante</h3>
              <p className="process-desc">
                La información aparece organizada en tu panel: mapas en vivo actualizados por GPS WhatsApp, desvíos de combustible alertados, vencimientos al día y orden de taller automática.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section className="features-section">
          <div className="section-title-area">
            <span className="section-tag">Características Clave</span>
            <h2 className="section-title">Herramientas diseñadas para transportistas reales</h2>
            <p className="section-subtitle">
              Dejá de ser un apagador de incendios diarios y pasá a tener una gestión logística predictiva de tu flota propia.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">
                  <MessageSquare size={24} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">WhatsApp Integrado</h3>
                <p className="feature-desc">
                  Los reportes de viaje, paradas de combustible o fotos de remitos de los choferes alimentan el panel directamente. Sin que un administrativo tenga que copiar y pegar nada.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">
                  <Cpu size={24} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Copiloto IA de Flota</h3>
                <p className="feature-desc">
                  Un asistente interactivo inteligente al que podés preguntarle en español: "¿Qué camiones están demorados en Bahía Blanca?" o "¿Qué choferes tienen la licencia LINTI por vencer?".
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">
                  <Fuel size={24} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Control de Gasoil e Ineficiencias</h3>
                <p className="feature-desc">
                  Carga de tickets de combustible con cálculo automático de consumos (L/100KM) y alertas de desvío sobre la media histórica de cada unidad para evitar pérdidas.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">
                  <FileText size={24} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Trazabilidad Legal Activa</h3>
                <p className="feature-desc">
                  Semáforo de vencimientos para toda tu flota y plantel de conductores. Avisos predictivos 30 días antes del vencimiento de licencias, ART, seguros, RUTA y revisiones.
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
                <h3 className="feature-title">Mapa en Tiempo Real</h3>
                <p className="feature-desc">
                  Trazabilidad combinada: visualizá las últimas coordenadas compartidas por los choferes por WhatsApp e integrá tus marcas de GPS existentes en un único mapa unificado.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">
                  <Wrench size={24} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Mantenimiento Predictivo</h3>
                <p className="feature-desc">
                  Planificación de service por km, alertas automáticas de service próximo y gestión de órdenes de taller completas para asegurar que tus unidades estén siempre operativas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="pricing-section">
          <div className="section-title-area">
            <span className="section-tag">Estructura de Servicio</span>
            <h2 className="section-title">Planes adaptados al tamaño de tu flota propia</h2>
            <p className="section-subtitle" style={{ marginBottom: '16px' }}>
              Control Tower se adapta a la escala de tu operación logística. Evaluamos las necesidades de tu flota, nivel de integraciones y canales de soporte para diseñar una propuesta con retorno de inversión (ROI) garantizado en los primeros 30 días.
            </p>
          </div>
          <div className="pricing-grid">
            {/* Plan 1 */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <h3 className="pricing-plan-name">Starter (10-25 camiones)</h3>
                <div className="pricing-price">
                  <span className="price-num" style={{ fontSize: '32px' }}>A Medida</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '8px', fontWeight: 600 }}>
                  Abono mensual por unidad + Onboarding inicial
                </div>
              </div>
              <p className="pricing-desc">
                Diseñado para empresas familiares y transportistas que buscan dar el salto a la digitalización operativa de forma rápida con las herramientas esenciales.
              </p>
              <ul className="pricing-features">
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Hasta 25 Unidades de Flota Activas</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Procesamiento WhatsApp (IA)</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Mapa de Tránsito y Ubicaciones</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Control de Tickets de Combustible</span>
                </li>
                <li className="pricing-feature-item pricing-feature-item-disabled">
                  <Check size={16} />
                  <span>Copiloto IA de Tráfico</span>
                </li>
                <li className="pricing-feature-item pricing-feature-item-disabled">
                  <Check size={16} />
                  <span>Integración de GPS de Terceros</span>
                </li>
              </ul>
              <button onClick={() => openModal('Starter (10-25 camiones)')} className="pricing-btn pricing-btn-outline" style={{ cursor: 'pointer' }}>
                Solicitar Cotización Starter
              </button>
            </div>

            {/* Plan 2 */}
            <div className="pricing-card pricing-card-popular">
              <div className="pricing-badge">Recomendado</div>
              <div className="pricing-card-header">
                <h3 className="pricing-plan-name">Pro (25-70 camiones)</h3>
                <div className="pricing-price">
                  <span className="price-num" style={{ fontSize: '32px' }}>A Medida</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '8px', fontWeight: 700 }}>
                  Abono optimizado por escala + Capacitación In-Situ
                </div>
              </div>
              <p className="pricing-desc">
                Para empresas de logística medianas con flota propia que requieren trazabilidad activa, optimización de gasoil y copiloto de tráfico inteligente.
              </p>
              <ul className="pricing-features">
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Hasta 70 Unidades de Flota Activas</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Procesamiento WhatsApp (IA)</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Mapa Operativo Cruzado con GPS</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Control de Combustible con Desvíos</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span><strong>Copiloto IA de Tráfico Avanzado</strong></span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Alertas Predictivas Legales (Seguros/LINTI)</span>
                </li>
              </ul>
              <button onClick={() => openModal('Pro (25-70 camiones)')} className="pricing-btn pricing-btn-primary" style={{ cursor: 'pointer' }}>
                Solicitar Propuesta Pro
              </button>
            </div>

            {/* Plan 3 */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <h3 className="pricing-plan-name">Enterprise (+70 camiones)</h3>
                <div className="pricing-price">
                  <span className="price-num" style={{ fontSize: '32px' }}>A Medida</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '8px', fontWeight: 600 }}>
                  Integración dedicada + SLA Contractual
                </div>
              </div>
              <p className="pricing-desc">
                For corporaciones logísticas con flotas de gran escala, requerimientos estrictos de seguridad de datos e integraciones complejas con ERP (SAP/Oracle).
              </p>
              <ul className="pricing-features">
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Unidades Ilimitadas</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Integración nativa con su ERP actual</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Toda la IA + Canales WhatsApp dedicados</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Gerente de Cuenta & Onboarding dedicado</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Desarrollos a medida e Informes complejos</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>SLA Contractual de disponibilidad 99.9%</span>
                </li>
              </ul>
              <button onClick={() => openModal('Enterprise (+70 camiones)')} className="pricing-btn pricing-btn-outline" style={{ cursor: 'pointer' }}>
                Contactar a Ventas Enterprise
              </button>
            </div>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="cta-section">
          <div className="cta-box">
            <div className="cta-box-orb" />
            <h2 className="cta-title">¿Listo para transformar la gestión de tu flota propia?</h2>
            <p className="cta-desc">
              Implementá Control Tower en tu empresa de transporte y optimizá el control operativo, combustible, tráfico y documentación legal con Inteligencia Artificial.
            </p>
            <div className="hero-actions" style={{ justifyContent: 'center' }}>
              <button onClick={() => openModal('Demostración Corporativa')} className="btn-cta btn-cta-primary" style={{ cursor: 'pointer' }}>
                Solicitar Demostración Corporativa
                <ArrowRight size={16} />
              </button>
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
          <Link to="/" className="footer-logo">
            <Radio size={20} />
            <span>Control Tower</span>
          </Link>
          <span className="footer-text">
            © {new Date().getFullYear()} Control Tower. Todos los derechos reservados. SaaS de Gestión Logística Inteligente.
          </span>
        </div>
      </footer>
    </div>
  );
}