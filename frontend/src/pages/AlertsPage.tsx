// Centro de Alertas - Control Tower 360
// 4 niveles: 🔴 Crítica · 🟠 Alta · 🟡 Atención · 🔵 Informativa
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { OperationalAlert, OperationalPriority } from '../types';
import {
  AlertTriangle, RefreshCw, Filter, CheckCircle2, Eye, EyeOff,
  Clock, ChevronRight, Sparkles
} from 'lucide-react';

const LEVEL_META: Record<OperationalPriority, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  critica:      { label: 'CRÍTICA',      emoji: '🔴', color: '#fca5a5', bg: 'rgba(239,68,68,0.12)',  border: '#ef4444' },
  alta:         { label: 'ALTA',         emoji: '🟠', color: '#fdba74', bg: 'rgba(249,115,22,0.12)', border: '#f97316' },
  atencion:     { label: 'ATENCIÓN',     emoji: '🟡', color: '#fde68a', bg: 'rgba(234,179,8,0.10)',  border: '#eab308' },
  informativa:  { label: 'INFORMATIVA',  emoji: '🔵', color: '#93c5fd', bg: 'rgba(59,130,246,0.10)', border: '#3b82f6' }
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function AlertsPage() {
  const { companyId } = useAuth();
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | OperationalPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'open' | 'acknowledged' | 'resolved' | 'dismissed' | 'all'>('open');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getOperationalAlerts(companyId, { status: statusFilter === 'all' ? undefined : statusFilter, limit: 200 });
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId, statusFilter]);

  const filtered = useMemo(() => {
    if (filter === 'all') return alerts;
    return alerts.filter(a => a.level === filter);
  }, [alerts, filter]);

  const grouped = useMemo(() => {
    const order: OperationalPriority[] = ['critica', 'alta', 'atencion', 'informativa'];
    const out: Record<OperationalPriority, OperationalAlert[]> = { critica: [], alta: [], atencion: [], informativa: [] };
    filtered.forEach(a => out[a.level].push(a));
    return order.map(l => ({ level: l, items: out[l] }));
  }, [filtered]);

  const counts = useMemo(() => {
    return {
      critica: alerts.filter(a => a.level === 'critica').length,
      alta: alerts.filter(a => a.level === 'alta').length,
      atencion: alerts.filter(a => a.level === 'atencion').length,
      informativa: alerts.filter(a => a.level === 'informativa').length,
      total: alerts.length
    };
  }, [alerts]);

  async function changeStatus(id: string, status: 'open' | 'acknowledged' | 'resolved' | 'dismissed') {
    await api.updateOperationalAlert(id, status);
    await load();
  }

  return (
    <div className="page alerts-page">
      <div className="page-header">
        <div>
          <h1><AlertTriangle size={28} className="page-icon" /> Centro de Alertas</h1>
          <p className="page-subtitle">Excepciones detectadas por la IA — solo interviene cuando algo requiere tu atención</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* Resumen por nivel */}
      <div className="alert-summary">
        {(['critica', 'alta', 'atencion', 'informativa'] as OperationalPriority[]).map(lv => {
          const meta = LEVEL_META[lv];
          return (
            <button
              key={lv}
              className={`alert-summary-card ${filter === lv ? 'active' : ''}`}
              onClick={() => setFilter(filter === lv ? 'all' : lv)}
              style={{ borderColor: meta.border, background: meta.bg }}
            >
              <div className="alert-summary-emoji">{meta.emoji}</div>
              <div className="alert-summary-body">
                <div className="alert-summary-value">{counts[lv]}</div>
                <div className="alert-summary-label">{meta.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-pills">
          {[
            { v: 'all', l: 'Todos los estados' },
            { v: 'open', l: 'Abiertas' },
            { v: 'acknowledged', l: 'Reconocidas' },
            { v: 'resolved', l: 'Resueltas' },
            { v: 'dismissed', l: 'Descartadas' }
          ].map(p => (
            <button
              key={p.v}
              className={`pill ${statusFilter === p.v ? 'pill-active' : ''}`}
              onClick={() => setStatusFilter(p.v as any)}
            >{p.l}</button>
          ))}
        </div>
        {filter !== 'all' && (
          <button className="pill pill-clear" onClick={() => setFilter('all')}>
            <Filter size={12} /> Quitar filtro
          </button>
        )}
      </div>

      {/* Listado agrupado por severidad */}
      <div className="alert-list">
        {loading && <div className="inbox-empty">Cargando alertas…</div>}
        {!loading && alerts.length === 0 && (
          <div className="inbox-empty">
            <Sparkles size={20} /> No hay alertas {statusFilter === 'open' ? 'abiertas' : 'en este estado'} — la operación se informa sola.
          </div>
        )}
        {grouped.map(group => {
          if (group.items.length === 0) return null;
          const meta = LEVEL_META[group.level];
          return (
            <section key={group.level} className="alert-group">
              <header className="alert-group-head">
                <span className="alert-group-emoji">{meta.emoji}</span>
                <span className="alert-group-label">{meta.label}</span>
                <span className="alert-group-count">{group.items.length}</span>
              </header>
              <div className="alert-group-body">
                {group.items.map(a => (
                  <article key={a.id} className="alert-card" style={{ borderLeftColor: meta.border, background: meta.bg }}>
                    <header className="alert-card-head">
                      <div className="alert-card-title">{a.title}</div>
                      <span className="alert-card-time"><Clock size={11} /> {formatTime(a.createdAt)}</span>
                    </header>
                    {a.message && <p className="alert-card-msg">{a.message}</p>}
                    <div className="alert-card-meta">
                      <span className="badge badge-soft">{a.entityLabel}</span>
                      {a.driverName && <span className="badge badge-soft">👤 {a.driverName}</span>}
                      {a.requiresIntervention ? (
                        <span className="badge badge-danger">⚠️ Requiere intervención</span>
                      ) : (
                        <span className="badge badge-soft">Automática</span>
                      )}
                      {a.status !== 'open' && <span className="badge badge-soft">{a.status}</span>}
                    </div>
                    <footer className="alert-card-actions">
                      {a.status === 'open' && (
                        <button className="btn btn-ghost" onClick={() => changeStatus(a.id, 'acknowledged')}>
                          <Eye size={14} /> Reconocer
                        </button>
                      )}
                      {a.status !== 'resolved' && (
                        <button className="btn btn-primary" onClick={() => changeStatus(a.id, 'resolved')}>
                          <CheckCircle2 size={14} /> Resolver
                        </button>
                      )}
                      {a.status !== 'dismissed' && a.status !== 'resolved' && (
                        <button className="btn btn-ghost" onClick={() => changeStatus(a.id, 'dismissed')}>
                          <EyeOff size={14} /> Descartar
                        </button>
                      )}
                      {a.tripId && (
                        <a className="btn btn-ghost" href={`/trips`}>
                          Ver viaje <ChevronRight size={14} />
                        </a>
                      )}
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
