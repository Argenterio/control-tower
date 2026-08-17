// Types compartidos entre frontend y backend
// Basado en el prompt maestro: Plataforma SaaS para Empresas de Transporte de Cargas

export interface Company {
  id: string;
  name: string;
  ruci?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'dispatcher' | 'driver' | 'viewonly';
  status: 'active' | 'inactive';
  lastLogin?: string;
  companyId?: string;
  profilePicture?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  companyId: string;
  licensePlate: string;
  brand?: string;
  model?: string;
  type: 'truck' | 'van' | 'motorcycle';
  status: 'active' | 'inactive' | 'maintenance' | 'out_of_service';
  kmTotal: number;
  kmCurrentTrip: number;
  lastGpsLocation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  companyId: string;
  userId?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  fullName: string;
  phone?: string;
  email?: string;
  dni?: string;
  status: 'active' | 'inactive' | 'suspended';
  vehicleId?: string;
  totalTrips: number;
  totalKm: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  companyId: string;
  vehicleId?: string;
  driverId?: string;
  customerId?: string;
  origin: string;
  destination: string;
  status: 'pending' | 'loading' | 'en_route' | 'delayed' | 'unloading' | 'completed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  kmTotal?: number;
  kmCompleted: number;
  fare?: number;
  fuelCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  vehicle?: Vehicle;
  driver?: Driver;
  customer?: Customer;
}

export interface GpsPosition {
  id: string;
  tripId?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  accuracy?: number;
  timestamp: string;
}

export interface DashboardSummary {
  fleet: {
    total: number;
    enRoute: number;
    loading: number;
    unloading: number;
    stopped: number;
    atBase: number;
    maintenance: number;
    incidents: number;
  };
  operations: {
    activeTrips: number;
    scheduledTrips: number;
    delayedTrips: number;
    completedToday: number;
    pendingDeliveries: number;
  };
  finance: {
    revenueToday: number;
    revenueMonth: number;
    costPerKm: number;
    pendingCollections: number;
  };
  alerts: {
    critical: number;
    high: number;
    medium: number;
    informational: number;
  };
}

export interface Alert {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'informational';
  title: string;
  message: string;
  entityType: 'vehicle' | 'driver' | 'trip' | 'document' | 'fuel' | 'maintenance';
  entityId: string;
  createdAt: string;
  read: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
