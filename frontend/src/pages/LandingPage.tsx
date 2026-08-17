// LandingPage.tsx - Landing page profesional para Control Tower en Argentina
import { Link } from 'react-router-dom';
import {
  Radio, ShieldCheck, Play, ArrowRight, AlertTriangle, Cpu,
  MessageSquare, MapPin, Fuel, FileText, Wrench, ShieldAlert,
  Check
} from 'lucide-react';

export default function LandingPage() {
  const handleScrollToPricing = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('pricing');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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
              <a href="#pricing" onClick={handleScrollToPricing} className="btn-cta btn-cta-primary">
                Ver Planes y Demo
                <Play size={16} />
              </a>
              <Link to="/login" className="btn-cta btn-cta-secondary">
                Consola Demo
              </Link>
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
            <span className="section-tag">Planes a Medida</span>
            <h2 className="section-title">Inversión transparente para tu rentabilidad</h2>
            <p className="section-subtitle" style={{ marginBottom: '16px' }}>
              SaaS ágil y robusto para flotas propias en Argentina. Recuperás el costo de la suscripción mensual controlando solo 1 viaje perdido o detectando 1 desvío de combustible.
            </p>
            <p style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 600 }}>
              * Los abonos mensuales se calculan multiplicando el valor del camión por la cantidad total de unidades de tu flota propia.
            </p>
          </div>
          <div className="pricing-grid">
            {/* Plan 1 */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <h3 className="pricing-plan-name">Starter (10-25 camiones)</h3>
                <div className="pricing-price">
                  <span className="price-num">USD 35</span>
                  <span className="price-unit">/ camión / mes</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--accent-amber)', marginTop: '8px', fontWeight: 600 }}>
                  Alta (Setup): USD 600 (pago único)
                </div>
              </div>
              <p className="pricing-desc">
                Ideal para digitalizarse rápido con lo esencial. <br />
                <strong>Ejemplo:</strong> 10 camiones = USD 350/mes de abono recurrente.
              </p>
              <ul className="pricing-features">
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Hasta 25 Unidades de Flota</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Procesamiento WhatsApp (IA)</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Mapa de Tránsito en Vivo</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Control de Combustible</span>
                </li>
                <li className="pricing-feature-item pricing-feature-item-disabled">
                  <Check size={16} />
                  <span>Copiloto IA de Tráfico</span>
                </li>
                <li className="pricing-feature-item pricing-feature-item-disabled">
                  <Check size={16} />
                  <span>Integración GPS del Camión</span>
                </li>
              </ul>
              <Link to="/login" className="pricing-btn pricing-btn-outline">
                Solicitar Piloto
              </Link>
            </div>

            {/* Plan 2 */}
            <div className="pricing-card pricing-card-popular">
              <div className="pricing-badge">Recomendado</div>
              <div className="pricing-card-header">
                <h3 className="pricing-plan-name">Pro (25-70 camiones)</h3>
                <div className="pricing-price">
                  <span className="price-num">USD 55</span>
                  <span className="price-unit">/ camión / mes</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '8px', fontWeight: 700 }}>
                  Alta (Setup): USD 1.200 (pago único, incluye capacitación)
                </div>
              </div>
              <p className="pricing-desc">
                El plan más elegido. Control total con inteligencia operativa predictiva. <br />
                <strong>Ejemplo:</strong> 30 camiones = USD 1.650/mes de abono recurrente.
              </p>
              <ul className="pricing-features">
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Hasta 70 Unidades de Flota</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Procesamiento WhatsApp (IA)</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Mapa Operativo Cruzado</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Control Combustible Avanzado</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span><strong>Copiloto IA de Tráfico</strong></span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Alertas Predictivas Legales</span>
                </li>
              </ul>
              <Link to="/login" className="pricing-btn pricing-btn-primary">
                Comenzar Prueba
              </Link>
            </div>

            {/* Plan 3 */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <h3 className="pricing-plan-name">Enterprise (+70 camiones)</h3>
                <div className="pricing-price">
                  <span className="price-num">A Medida</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '8px', fontWeight: 600 }}>
                  Alta e Integración: Cotización a medida
                </div>
              </div>
              <p className="pricing-desc">
                Para grandes empresas que exigen integraciones complejas con ERP y soporte premium 24h.
              </p>
              <ul className="pricing-features">
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Unidades Ilimitadas</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Integración nativa ERP/SAP</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Toda la IA + WhatsApp dedicados</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Gerente de Cuenta Onboarding</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>Desarrollos e Informes a Medida</span>
                </li>
                <li className="pricing-feature-item">
                  <Check size={16} />
                  <span>SLA Contractual de 99.9%</span>
                </li>
              </ul>
              <Link to="/login" className="pricing-btn pricing-btn-outline">
                Hablar con Ventas
              </Link>
            </div>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="cta-section">
          <div className="cta-box">
            <div className="cta-box-orb" />
            <h2 className="cta-title">¿Listo para recuperar el control de tu logística?</h2>
            <p className="cta-desc">
              Conectá tu flota hoy y obtené 30 días de prueba bonificados con tu propia base de camiones y choferes. Descubrí el valor de la Inteligencia Artificial operativa.
            </p>
            <div className="hero-actions" style={{ justifyContent: 'center' }}>
              <Link to="/login" className="btn-cta btn-cta-primary">
                Iniciar Demo Gratis
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

      </main>

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
