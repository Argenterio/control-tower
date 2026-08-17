// Dashboard Page - Main control tower view with KPIs, charts, and recent activity
import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import type { Vehicle, Trip, Driver } from '../types';
import {
  Truck, Route, Users, AlertTriangle, TrendingUp,
  Clock, MapPin, Activity, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  en_route: '#3b82f6',
  maintenance: '#f59e0b',
  inactive: '#6b7280',
  pending: '#8b5cf6',
  delayed: '#ef4444',
  completed: '#10b981',
  loading: '#06b6d4',
  cancelled: '#6b7280',
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#6b7280'];

export default function DashboardPage() {
  const { companyId } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getVehicles(companyId).catch(() => []),
      api.getTrips(companyId).catch(() => []),
      api.getDrivers(companyId).catch(() => []),
    ]).then(([v, t, d]) => {
      setVehicles(v);
      setTrips(t);
      setDrivers(d);
      setLoading(false);
    });
  }, [companyId]);

  // Compute KPIs
  const fleetTotal = vehicles.length;
  const fleetActive = vehicles.filter(v => v.status === 'active').length;
  const fleetMaintenance = vehicles.filter(v => v.status === 'maintenance').length;
  const activeTrips = trips.filter(t => t.status === 'en_route').length;
  const delayedTrips = trips.filter(t => t.status === 'delayed').length;
  const completedTrips = trips.filter(t => t.status === 'completed').length;
  const pendingTrips = trips.filter(t => t.status === 'pending').length;
  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter(d => d.status === 'active').length;

  // Chart data
  const vehicleStatusData = [
    { name: 'Activos', value: fleetActive, color: '#22c55e' },
    { name: 'Mantenimiento', value: fleetMaintenance, color: '#f59e0b' },
    { name: 'Inactivos', value: vehicles.filter(v => v.status === 'inactive').length, color: '#6b7280' },
  ].filter(d => d.value > 0);

  const tripStatusData = [
    { name: 'Pendientes', value: pendingTrips },
    { name: 'En Ruta', value: activeTrips },
    { name: 'Demorados', value: delayedTrips },
    { name: 'Completados', value: completedTrips },
  ];

  // Simulated weekly revenue data for demo chart
  const weeklyData = [
    { day: 'Lun', ingresos: 2400000, costos: 1800000 },
    { day: 'Mar', ingresos: 1800000, costos: 1400000 },
    { day: 'Mié', ingresos: 3200000, costos: 2100000 },
    { day: 'Jue', ingresos: 2800000, costos: 1900000 },
    { day: 'Vie', ingresos: 3500000, costos: 2300000 },
    { day: 'Sáb', ingresos: 1200000, costos: 900000 },
    { day: 'Dom', ingresos: 800000, costos: 600000 },
  ];

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Centro de Control Operativo — Vista en tiempo real</p>
        </div>
        <div className="header-actions">
          <span className="live-indicator">
            <span className="live-dot" />
            EN VIVO
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Truck size={22} color="#3b82f6" />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{fleetTotal}</span>
            <span className="kpi-label">Unidades Totales</span>
          </div>
          <div className="kpi-trend positive">
            <ArrowUpRight size={14} />
            <span>{fleetActive} activas</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(34,197,94,0.15)' }}>
            <Route size={22} color="#22c55e" />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{activeTrips}</span>
            <span className="kpi-label">Viajes en Ruta</span>
          </div>
          <div className="kpi-trend neutral">
            <Activity size={14} />
            <span>{pendingTrips} pendientes</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle size={22} color="#ef4444" />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{delayedTrips}</span>
            <span className="kpi-label">Viajes Demorados</span>
          </div>
          <div className="kpi-trend negative">
            <ArrowDownRight size={14} />
            <span>Requieren atención</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <Users size={22} color="#8b5cf6" />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{totalDrivers}</span>
            <span className="kpi-label">Choferes</span>
          </div>
          <div className="kpi-trend positive">
            <ArrowUpRight size={14} />
            <span>{activeDrivers} activos</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Revenue Chart */}
        <div className="chart-card chart-wide">
          <div className="chart-header">
            <h3><TrendingUp size={18} /> Ingresos vs Costos — Última Semana</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCostos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                  formatter={(value: any) => [`$${((Number(value) || 0) / 1000000).toFixed(2)}M`, '']}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#3b82f6" fill="url(#colorIngresos)" strokeWidth={2} name="Ingresos" />
                <Area type="monotone" dataKey="costos" stroke="#ef4444" fill="url(#colorCostos)" strokeWidth={2} name="Costos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicle Status Pie */}
        <div className="chart-card">
          <div className="chart-header">
            <h3><Truck size={18} /> Estado de Flota</h3>
          </div>
          <div className="chart-body chart-centered">
            {vehicleStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={vehicleStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {vehicleStatusData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Sin datos de flota</div>
            )}
            <div className="pie-legend">
              {vehicleStatusData.map(d => (
                <div key={d.name} className="legend-item">
                  <span className="legend-dot" style={{ background: d.color }} />
                  <span>{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trip Status Bar Chart */}
      <div className="charts-grid">
        <div className="chart-card chart-wide">
          <div className="chart-header">
            <h3><Route size={18} /> Estado de Viajes</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tripStatusData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Cantidad">
                  {tripStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="chart-card">
          <div className="chart-header">
            <h3><Clock size={18} /> Actividad Reciente</h3>
          </div>
          <div className="activity-list">
            {trips.slice(0, 6).map(trip => (
              <div key={trip.id} className="activity-item">
                <div className="activity-dot" style={{ background: STATUS_COLORS[trip.status] || '#6b7280' }} />
                <div className="activity-content">
                  <span className="activity-title">{trip.origin} → {trip.destination}</span>
                  <span className="activity-meta">
                    <MapPin size={12} /> {trip.status === 'en_route' ? 'En ruta' : trip.status === 'delayed' ? 'Demorado' : trip.status === 'completed' ? 'Completado' : trip.status === 'pending' ? 'Pendiente' : trip.status}
                  </span>
                </div>
              </div>
            ))}
            {trips.length === 0 && (
              <div className="empty-activity">No hay viajes registrados</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
