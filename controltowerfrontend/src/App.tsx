import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Layout/Sidebar';

// Pages
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import FleetPage from './pages/Fleet';
import DriversPage from './pages/Drivers';
import TripsPage from './pages/Trips';
import CustomersPage from './pages/Customers';
import MapPage from './pages/MapView';
import { FuelPage } from './pages/FuelPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';

// Commercial pages (Fase 2)
import LandingPage from './pages/LandingPage';
import LeadsPage from './pages/LeadsPage';
import { DriverMessagesPage } from './pages/DriverMessages';
import { EvidencePage } from './pages/Evidence';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Commercial Routes (Fase 2) */}
            <Route path="/marketing" element={<LandingPage />} />
            <Route path="/marketing/leads" element={<LeadsPage />} />

            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes inside Sidebar Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Sidebar />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="trips" element={<TripsPage />} />
              <Route path="fleet" element={<FleetPage />} />
              <Route path="drivers" element={<DriversPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="fuel" element={<FuelPage />} />
              <Route path="maintenance" element={<MaintenancePage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="driver-messages" element={<DriverMessagesPage />} />
              <Route path="evidence" element={<EvidencePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
