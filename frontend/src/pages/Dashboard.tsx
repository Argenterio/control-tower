// Dashboard - Torre 360 (Sala de Operaciones)
// "Toda la operación me informa automáticamente y yo solo intervengo cuando hay una excepción."
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Vehicle, Trip, Driver, OperationSummary, OperationalAlert } from '../types';
import {
  Truck, Route, Users, AlertTriangle, Sparkles, ArrowRight,
  ChevronRight, Radio, MessageSquare, ShieldAlert
} from 'lucide-react';

export default function DashboardPage() {
  const { companyId } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [summary, setSummary] = useState<OperationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getVehicles(companyId).catch(() => []),
      api.getTrips(companyId).catch(() => []),
      api.getDrivers(companyId).catch(() => []),
      api.getOperationSummary(companyId).catch(() => null)
    ]).then(([v, t, d, s]) => {
      setVehicles(v);
      setTrips(t);
      setDrivers(d);
      setSummary(s);
      setLoading(false);
    });
  }, [companyId]);

  const totals = useMemo(() => {
    const fleetTotal = vehicles.length;
    const fleetActive = vehicles.filter(v => v.status === 'active').length;
    const activeTrips = trips.filter(t => ['en_route', 'loading', 'unloading', 'delayed', 'arrived'].includes(t.status));
    const delayedTrips = trips.filter(t => t.status === 'delayed');
    const criticalAlerts: OperationalAlert[] = summary?.requiresAttention.filter(a => a.level === 'critica') || [];
    return {
      fleetTotal, fleetActive,
      activeTrips: activeTrips.length,
      normalTrips: activeTrips.filter(t => !['delayed', 'arrived'].includes(t.status)).length,
      delayedTrips: delayedTrips.length,
      criticalAlerts
    };
  }, [vehicles, trips, summary]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>Cargando torre…</p>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      {/* Encabezado de marca */}
      <header className="tower-hero">
        <div className="tower-hero-brand">
          <Radio size={32} className="tower-hero-icon" />
          <div>
            <h1>Control Tower 360</h1>
            <p className="tower-hero-sub">Centro de Control Operativo, Flota y Comunicación Inteligente</p>
          </div>
        </div>
        <span className="live-indicator">
          <span className="live-dot" /> EN VIVO
        </span>
      </header>

      {/* ===== Resumen IA de la Torre ===== */}
      <section className="ai-summary">
        <div className="ai-summary-head">
          <Sparkles size={18} /> <strong>Resumen de la Torre</strong>
          <span className="badge badge-primary">IA</span>
        </div>
        <p className="ai-summary-narrative">{summary?.narrative || `Operación: ${totals.activeTrips} viajes activos.`}</p>
        <div className="ai-summary-stats">
          <div className="ai-stat">
            <span className="ai-stat-value">{totals.activeTrips}</span>
            <span className="ai-stat-label">viajes activos</span>
          </div>
          <div className="ai-stat ai-stat-ok">
            <span className="ai-stat-value">{totals.normalTrips}</span>
            <span className="ai-stat-label">operan normal</span>
          </div>
          <div className="ai-stat ai-stat-warn">
            <span className="ai-stat-value">{totals.delayedTrips}</span>
            <span className="ai-stat-label">demoras</span>
          </div>
          <div className="ai-stat ai-stat-alert">
            <span className="ai-stat-value">{summary?.totals.criticalOpen ?? 0}</span>
            <span className="ai-stat-label">crít/altas</span>
          </div>
          <div className="ai-stat">
            <span className="ai-stat-value">{summary?.totals.messagesToday ?? 0}</span>
            <span className="ai-stat-label">msj choferes 24h</span>
          </div>
          <div className="ai-stat">
            <span className="ai-stat-value">{summary?.totals.driversActiveToday ?? 0}</span>
            <span className="ai-stat-label">choferes activos</span>
          </div>
        </div>
      </section>

      {/* ===== ¿Qué requiere mi atención? ===== */}
      <section className="attention-section">
        <header className="section-head">
          <ShieldAlert size={20} className="text-alert" />
          <h2>¿Qué requiere tu atención?</h2>
          <a href="/alerts" className="section-link">Ver todas las alertas <ChevronRight size={14} /></a>
        </header>
        {summary && summary.requiresAttention.length === 0 ? (
          <div className="empty-attention">
            <Sparkles size={24} /> Sin excepciones — la operación se informa sola.
          </div>
        ) : (
          <div className="attention-list">
            {(summary?.requiresAttention || []).slice(0, 6).map(a => {
              const tone = a.level === 'critica' ? 'alert' : a.level === 'alta' ? 'warn' : a.level === 'atencion' ? 'amber' : 'info';
              const emoji = a.level === 'critica' ? '🔴' : a.level === 'alta' ? '🟠' : a.level === 'atencion' ? '🟡' : '🔵';
              return (
                <article key={a.id} className={`attention-card tone-${tone}`}>
                  <span className="attention-emoji">{emoji}</span>
                  <div className="attention-body">
                    <div className="attention-title">{a.title}</div>
                    <div className="attention-msg">{a.message}</div>
                    <div className="attention-meta">
                      {a.entityLabel && <span className="badge badge-soft">{a.entityLabel}</span>}
                      {a.driverName && <span className="badge badge-soft">👤 {a.driverName}</span>}
                    </div>
                  </div>
                  <a href="/alerts" className="btn btn-ghost btn-sm">Ver <ArrowRight size={12} /></a>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== Operación normal ===== */}
      <section className="ok-section">
        <header className="section-head">
          <Route size={20} className="text-ok" />
          <h2>Operación normal</h2>
          <a href="/trips" className="section-link">Ver viajes <ChevronRight size={14} /></a>
        </header>
        <div className="ok-grid">
          <div className="ok-card">
            <Truck size={22} />
            <div>
              <div className="ok-value">{totals.fleetActive} <span className="ok-sub">/ {totals.fleetTotal}</span></div>
              <div className="ok-label">Flota activa</div>
            </div>
          </div>
          <div className="ok-card">
            <Users size={22} />
            <div>
              <div className="ok-value">{drivers.filter(d => d.status === 'active').length} <span className="ok-sub">/ {drivers.length}</span></div>
              <div className="ok-label">Choferes activos</div>
            </div>
          </div>
          <div className="ok-card">
            <MessageSquare size={22} />
            <div>
              <div className="ok-value">{summary?.totals.messagesToday ?? 0}</div>
              <div className="ok-label">Mensajes WhatsApp (24h)</div>
            </div>
          </div>
          <div className="ok-card">
            <AlertTriangle size={22} />
            <div>
              <div className="ok-value">{summary?.totals.criticalOpen ?? 0}</div>
              <div className="ok-label">Alertas críticas abiertas</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
