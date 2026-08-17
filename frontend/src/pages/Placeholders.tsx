// Placeholder pages for future development
import { Fuel, Wrench, FileText, AlertTriangle, Settings } from 'lucide-react';

function PlaceholderPage({ icon: Icon, title, description }: { icon: typeof Fuel; title: string; description: string }) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Icon size={28} className="page-icon" /> {title}</h1>
          <p className="page-subtitle">{description}</p>
        </div>
      </div>
      <div className="placeholder-content">
        <Icon size={64} className="placeholder-icon" />
        <h2>Próximamente</h2>
        <p>Este módulo se encuentra en desarrollo y estará disponible en la próxima actualización.</p>
      </div>
    </div>
  );
}

export function FuelPage() {
  return <PlaceholderPage icon={Fuel} title="Combustible" description="Control de cargas de combustible y consumo por unidad" />;
}

export function MaintenancePage() {
  return <PlaceholderPage icon={Wrench} title="Mantenimiento" description="Mantenimiento preventivo y correctivo de la flota" />;
}

export function DocumentsPage() {
  return <PlaceholderPage icon={FileText} title="Documentos" description="Control de documentación y vencimientos" />;
}

export function AlertsPage() {
  return <PlaceholderPage icon={AlertTriangle} title="Centro de Alertas" description="Alertas operativas, vencimientos y anomalías" />;
}

export function SettingsPage() {
  return <PlaceholderPage icon={Settings} title="Configuración" description="Configuración de la empresa y parámetros del sistema" />;
}
