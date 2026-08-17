// Sidebar Layout - Professional dark theme sidebar navigation
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  LayoutDashboard, Truck, Users, Route, Building2,
  Fuel, Wrench, FileText, AlertTriangle, Map,
  Settings, LogOut, ChevronLeft, ChevronRight, Radio
} from 'lucide-react';
import { AiCopilot } from '../AiCopilot/AiCopilot';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/map', label: 'Mapa Operativo', icon: Map },
  { to: '/trips', label: 'Viajes', icon: Route },
  { to: '/fleet', label: 'Flota', icon: Truck },
  { to: '/drivers', label: 'Choferes', icon: Users },
  { to: '/customers', label: 'Clientes', icon: Building2 },
  { to: '/fuel', label: 'Combustible', icon: Fuel },
  { to: '/maintenance', label: 'Mantenimiento', icon: Wrench },
  { to: '/documents', label: 'Documentos', icon: FileText },
  { to: '/alerts', label: 'Alertas', icon: AlertTriangle },
  { to: '/settings', label: 'Configuración', icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <Radio className="brand-icon" size={28} />
            {!collapsed && (
              <div className="brand-text">
                <span className="brand-name">Control Tower</span>
                <span className="brand-sub">Plataforma SaaS</span>
              </div>
            )}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={20} className="nav-icon" />
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info" title={user?.email}>
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            {!collapsed && (
              <div className="user-details">
                <span className="user-name">{user?.name || 'Admin'}</span>
                <span className="user-role">{user?.role || 'admin'}</span>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={18} />
            {!collapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      <AiCopilot />
    </div>
  );
}
