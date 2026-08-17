// Tipos principales del sistema Control Tower
// Basado en el prompt maestro: Plataforma SaaS para Empresas de Transporte de Cargas

// Company (Tenant)
export interface Company {
  id: string;
  name: string;
  ruci?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// User with roles
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "dispatcher" | "driver" | "viewonly";
  status: "active" | "inactive";
  lastLogin?: string;
  companyId?: string;
  profilePicture?: string;
  phone?: string;
  identification?: string;
  identificationType?: "DNI" | "LC" | "LE" | "CUIT";
  createdAt: string;
  updatedAt: string;
}

// Vehicle/Camión
export interface Vehicle {
  id: string;
  companyId: string;
  licensePlate: string;
  brand?: string;
  model?: string;
  type: "truck" | "van" | "motorcycle";
  status: "active" | "inactive" | "maintenance" | "out_of_service";
  kmTotal: number;
  kmCurrentTrip: number;
  lastGpsLocation?: string;
  createdAt: string;
  updatedAt: string;
}

// Chofer/Driver
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
  status: "active" | "inactive" | "suspended";
  vehicleId?: string;
  totalTrips: number;
  totalKm: number;
  createdAt: string;
  updatedAt: string;
}

// Cliente/Dador de carga
export interface Customer {
  id: string;
  companyId: string;
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// Viaje/Trip
export interface Trip {
  id: string;
  companyId: string;
  vehicleId?: string;
  driverId?: string;
  customerId?: string;
  origin: string;
  destination: string;
  status: "pending" | "loading" | "en_route" | "arrived" | "unloading" | "completed" | "delayed" | "cancelled";
  startTime?: string;
  endTime?: string;
  estimatedArrival: string;
  actualArrival?: string;
  kmTotal?: number;
  kmCompleted: number;
  fare?: number;
  fuelCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Posición GPS
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

// Combustible entry
export interface FuelEntry {
  id: string;
  tripId?: string;
  liters: number;
  pricePerLiter?: number;
  totalAmount?: number;
  station?: string;
  kmAtFill?: number;
  date: string;
  createdAt: string;
}

// Mantenimiento
export interface Maintenance {
  id: string;
  companyId: string;
  vehicleId?: string;
  driverId?: string;
  type: "preventive" | "corrective";
  description?: string;
  cost?: number;
  serviceDate?: string;
  nextServiceDate?: string;
  kmAtService?: number;
  workshop?: string;
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

// Evento de mantenimiento
export interface MaintenanceEvent {
  id: string;
  tripId?: string;
  vehicleId?: string;
  type?: string;
  description?: string;
  cost?: number;
  date?: string;
  resolved: boolean;
  createdAt: string;
}

// Documento
export interface Document {
  id: string;
  companyId: string;
  vehicleId?: string;
  driverId?: string;
  type: string;
  title: string;
  fileUrl: string;
  expiryDate?: string;
  status: "valid" | "expired" | "pending";
  uploadedAt: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Incidente/Incident
export interface Incident {
  id: string;
  companyId: string;
  vehicleId?: string;
  driverId?: string;
  type: "accident" | "breakdown" | "delay" | "tire" | "fuel" | "document" | "cargo" | "security";
  title?: string;
  description?: string;
  location?: string;
  occurredAt: string;
  status: "open" | "resolved" | "closed";
  cost?: number;
  photos?: string;
  reportedBy?: string;
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Consumo de combustible histórico
export interface FuelConsumption {
  id: string;
  companyId: string;
  vehicleId?: string;
  date: string;
  liters: number;
  km?: number;
  pricePerLiter?: number;
  totalCost?: number;
  routeDescription?: string;
  createdAt: string;
}

// Registro de neumáticos
export interface TireRecord {
  id: string;
  companyId: string;
  vehicleId?: string;
  position: "front-left" | "front-right" | "rear-left" | "rear-right" | "spare";
  brand?: string;
  model?: string;
  installedKm?: number;
  lifeKm?: number;
  purchaseDate?: string;
  nextChangeKm?: number;
  cost?: number;
  installedAt: string;
  createdAt: string;
}

// Configuración de empresa
export interface CompanySettings {
  id: string;
  companyId: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  whatsappNumber?: string;
  gpsProvider?: string;
  createdAt: string;
  updatedAt: string;
}

// Query filters
export interface TripFilters {
  status?: string;
  vehicleId?: string;
}

// Subscription/Pricing
export interface SubscriptionPlan {
  id: string;
  name: string;
  maxUnits: number;
  monthlyPrice: number;
  features: string[];
}

// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ===== WhatsApp Integration Types =====

// Tipos de mensaje soportados
export type WhatsappMessageType = "text" | "image" | "audio" | "location" | "document" | "video" | "sticker" | "contact";

// Dirección del mensaje
export type WhatsappDirection = "incoming" | "outgoing";

// Acciones interpretadas del mensaje del chofer
export type InterpretedAction =
  | "trip_departure"    // "Salí", "Arrancando", "En camino"
  | "trip_arrival"      // "Llegué", "Estoy en destino"
  | "loading"           // "Estoy cargando"
  | "unloading"         // "Estoy descargando"
  | "delay"             // "Demora", "Estoy parado", "Tránsito"
  | "breakdown"         // "Se rompió", "Avería", "Problema mecánico"
  | "accident"          // "Accidente", "Choque"
  | "tire_issue"        // "Cubierta", "Goma pinchada"
  | "fuel_stop"         // "Cargando combustible", "Estación de servicio"
  | "document_upload"   // Foto de remito, ticket, etc.
  | "location_share"    // Ubicación compartida
  | "greeting"          // "Hola", "Buenos días"
  | "status_query"      // "¿Cómo va mi viaje?", "¿Qué viaje tengo?"
  | "unknown";          // No se pudo interpretar

// Mensaje de WhatsApp almacenado
export interface WhatsappMessage {
  id: string;
  companyId: string;
  driverId?: string;
  phone: string;
  direction: WhatsappDirection;
  messageType: WhatsappMessageType;
  content?: string;
  mediaUrl?: string;
  interpretedAction?: InterpretedAction;
  interpretedConfidence?: number;
  tripId?: string;
  processed: boolean;
  processedAt?: string;
  rawPayload?: string;
  responseMessage?: string;
  createdAt: string;
}

// Payload que llega desde n8n con el mensaje de Evolution API
export interface WhatsappIncomingPayload {
  phone: string;          // Número del remitente (ej: "5491144551122")
  message?: string;       // Contenido de texto
  messageType: WhatsappMessageType;
  mediaUrl?: string;      // URL del archivo si es imagen/audio/doc
  latitude?: number;      // Si es ubicación
  longitude?: number;     // Si es ubicación
  timestamp?: string;     // Timestamp del mensaje
  pushName?: string;      // Nombre del contacto en WhatsApp
  messageId?: string;     // ID del mensaje en WhatsApp
  instanceName?: string;  // Nombre de la instancia en Evolution API
  rawPayload?: string;    // JSON completo original
}

// Resultado de interpretar un mensaje
export interface MessageInterpretation {
  action: InterpretedAction;
  confidence: number;        // 0.0 a 1.0
  tripUpdate?: {
    tripId: string;
    newStatus: string;
  };
  incident?: {
    type: string;
    description: string;
  };
  gpsPosition?: {
    latitude: number;
    longitude: number;
  };
  responseMessage: string;   // Mensaje de vuelta al chofer
}

// Respuesta del endpoint de WhatsApp
export interface WhatsappProcessResult {
  messageId: string;
  driverFound: boolean;
  driverName?: string;
  companyId?: string;
  interpretation: MessageInterpretation;
  tripUpdated: boolean;
  incidentCreated: boolean;
}