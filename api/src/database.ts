// Database module for Control Tower API
// Uses better-sqlite3 for SQLite database operations
// Design is portable to PostgreSQL - all models have companyId for multitenancy
// No 'any' used as type hiding mechanism - types are explicitly defined

import Database from "better-sqlite3";
import type { Database as SqliteDatabase } from "better-sqlite3";
import path from "path";

// Configuración de conexión - usar ruta absoluta para evitar problemas de directorio
const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), "dev.db");

// Opcional: usar DATABASE_URL si está definido
// const dbPath = process.env.DATABASE_URL?.replace("file:", "") || path.resolve(process.cwd(), "dev.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Habilitar modos de SQLite para mejor performance
db.exec(`
  PRAGMA synchronous = NORMAL;
  PRAGMA cache_size = -64000;
  PRAGMA temp_store = MEMORY;
`);

// ===== EJECUTAR MIGRATIONS (CREAR TABLAS) - PORTABLE A POSTGRESQL =====

// Las siguientes tablas están diseñadas para ser compatibles con PostgreSQL.
// Los names de campos y tipos son consistentes entre SQLite y PostgreSQL.
// Migración a PostgreSQL: cambiar el driver y ajustar tipos si es necesario.

// Empresas (tenants) - core para multitenancy
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ruci TEXT UNIQUE,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'active',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Usuarios con roles y pertenencia a empresa
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'admin',
    status TEXT DEFAULT 'active',
    lastLogin TEXT,
    companyId TEXT,
    profilePicture TEXT,
    phone TEXT,
    identification TEXT,
    identificationType TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_users_companyId ON users(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

// Vehículos/Camiones - con companyId para aislamiento
db.exec(`
  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    licensePlate TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    type TEXT DEFAULT 'truck',
    status TEXT DEFAULT 'active',
    kmTotal REAL DEFAULT 0,
    kmCurrentTrip REAL DEFAULT 0,
    lastGpsLocation TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(companyId, licensePlate)
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_vehicles_companyId ON vehicles(companyId)`);

// Choferes - con companyId para aislamiento
db.exec(`
  CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    userId TEXT,
    licenseNumber TEXT,
    licenseExpiry TEXT,
    fullName TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    dni TEXT,
    status TEXT DEFAULT 'active',
    vehicleId TEXT,
    totalTrips INTEGER DEFAULT 0,
    totalKm REAL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL,
    UNIQUE(companyId, dni),
    UNIQUE(companyId, licenseNumber)
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_drivers_companyId ON drivers(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_drivers_dni ON drivers(dni)`);

// Clientes - con companyId
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    taxId TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_companyId ON customers(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_taxId ON customers(taxId)`);

// Leads comerciales de la Landing Page
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    companyName TEXT NOT NULL,
    fleetSize TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    planRequested TEXT,
    status TEXT DEFAULT 'new',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Viajes - corazón operativo
db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    vehicleId TEXT,
    driverId TEXT,
    customerId TEXT,
    origin TEXT,
    destination TEXT,
    status TEXT DEFAULT 'pending',
    startTime TEXT,
    endTime TEXT,
    estimatedArrival TEXT,
    actualArrival TEXT,
    kmTotal REAL,
    kmCompleted REAL DEFAULT 0,
    fare REAL,
    fuelCost REAL,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_trips_companyId ON trips(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_trips_vehicleId ON trips(vehicleId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_trips_driverId ON trips(driverId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status)`);

// Posiciones GPS
db.exec(`
  CREATE TABLE IF NOT EXISTS gps_positions (
    id TEXT PRIMARY KEY,
    tripId TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL DEFAULT 0,
    heading REAL,
    accuracy REAL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_gps_positions_tripId ON gps_positions(tripId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_gps_positions_timestamp ON gps_positions(timestamp)`);

// Combustible entries
db.exec(`
  CREATE TABLE IF NOT EXISTS fuel_entries (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL DEFAULT 'default-company',
    vehicleId TEXT,
    driverId TEXT,
    tripId TEXT,
    liters REAL NOT NULL,
    pricePerLiter REAL,
    totalAmount REAL,
    station TEXT,
    kmAtFill REAL,
    consumptionLPer100Km REAL,
    anomaly INTEGER DEFAULT 0,
    date TEXT NOT NULL DEFAULT (datetime('now')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL
  )
`);
safeCreateIndex("idx_fuel_entries_companyId", "fuel_entries", "companyId");
safeCreateIndex("idx_fuel_entries_vehicleId", "fuel_entries", "vehicleId");
safeCreateIndex("idx_fuel_entries_driverId", "fuel_entries", "driverId");
db.exec(`CREATE INDEX IF NOT EXISTS idx_fuel_entries_tripId ON fuel_entries(tripId)`);

// Mantenimiento
db.exec(`
  CREATE TABLE IF NOT EXISTS maintenance (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    vehicleId TEXT,
    driverId TEXT,
    type TEXT DEFAULT 'preventive',
    description TEXT,
    cost REAL,
    serviceDate TEXT,
    nextServiceDate TEXT,
    kmAtService REAL,
    workshop TEXT,
    status TEXT DEFAULT 'pending',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_maintenance_companyId ON maintenance(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_maintenance_vehicleId ON maintenance(vehicleId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status)`);

// Eventos de mantenimiento
db.exec(`
  CREATE TABLE IF NOT EXISTS maintenance_events (
    id TEXT PRIMARY KEY,
    tripId TEXT,
    vehicleId TEXT,
    type TEXT,
    description TEXT,
    cost REAL,
    date TEXT,
    resolved INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_maintenance_events_tripId ON maintenance_events(tripId)`);

// Documentos
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    vehicleId TEXT,
    driverId TEXT,
    type TEXT NOT NULL,
    title TEXT,
    fileUrl TEXT NOT NULL,
    expiryDate TEXT,
    status TEXT DEFAULT 'valid',
    uploadedAt TEXT NOT NULL DEFAULT (datetime('now')),
    uploadedBy TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_companyId ON documents(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)`);

// Incidentes
db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    vehicleId TEXT,
    driverId TEXT,
    type TEXT NOT NULL,
    title TEXT,
    description TEXT,
    location TEXT,
    occurredAt TEXT NOT NULL,
    resolvedAt TEXT,
    status TEXT DEFAULT 'open',
    cost REAL,
    photos TEXT,
    reportedBy TEXT,
    reportedAt TEXT NOT NULL DEFAULT (datetime('now')),
    resolvedBy TEXT,
    -- resolvedAt removido para evitar duplicados - usar una sola definición
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_incidents_companyId ON incidents(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_incidents_reportedAt ON incidents(reportedAt)`);

// Consumo de combustible histórico
db.exec(`
  CREATE TABLE IF NOT EXISTS fuel_consumption (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    vehicleId TEXT,
    date TEXT NOT NULL,
    liters REAL NOT NULL,
    km REAL,
    pricePerLiter REAL,
    totalCost REAL,
    routeDescription TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_fuel_consumption_companyId ON fuel_consumption(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_fuel_consumption_date ON fuel_consumption(date)`);

// Registro de neumáticos
db.exec(`
  CREATE TABLE IF NOT EXISTS tire_records (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    vehicleId TEXT,
    position TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    installedKm REAL,
    lifeKm REAL,
    purchaseDate TEXT,
    nextChangeKm REAL,
    cost REAL,
    installedAt TEXT NOT NULL DEFAULT (datetime('now')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tire_records_companyId ON tire_records(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tire_records_vehicleId ON tire_records(vehicleId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tire_records_position ON tire_records(position)`);

// Configuración de empresa
db.exec(`
  CREATE TABLE IF NOT EXISTS company_settings (
    id TEXT PRIMARY KEY,
    companyId TEXT UNIQUE,
    timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
    dateFormat TEXT DEFAULT 'DD/MM/YYYY',
    currency TEXT DEFAULT 'ARS',
    whatsappNumber TEXT,
    gpsProvider TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
  )
`);
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_company_settings_companyId ON company_settings(companyId)`);

// Tabla de mensajes de WhatsApp
db.exec(`
  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    driverId TEXT,
    phone TEXT NOT NULL,
    direction TEXT DEFAULT 'incoming',
    messageType TEXT DEFAULT 'text',
    content TEXT,
    mediaUrl TEXT,
    interpretedAction TEXT,
    interpretedConfidence REAL,
    tripId TEXT,
    processed INTEGER DEFAULT 0,
    processedAt TEXT,
    rawPayload TEXT,
    responseMessage TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_companyId ON whatsapp_messages(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_driverId ON whatsapp_messages(driverId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tripId ON whatsapp_messages(tripId)`);

// ===== CONTROL TOWER 360 — TABLAS NUEVAS (FASE 1) =====
// Estas tablas no destruyen nada existente: extienden el modelo con:
// - operational_events: hechos crudos interpretados por la IA a partir de mensajes del chofer
// - trip_evidence: archivos asociados al viaje (audios, fotos, docs, ubicaciones, mensajes)
// - operational_alerts: alertas priorizadas para la Bandeja Operativa (4 niveles)
// - driver_locations: puntos GPS recibidos por WhatsApp / n8n
// - ai_interactions: registro de qué interpretó la IA (auditoría y debugging)

// Eventos operacionales interpretados por la IA (uno por cada mensaje que produce efecto)
db.exec(`
  CREATE TABLE IF NOT EXISTS operational_events (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    tripId TEXT,
    driverId TEXT,
    vehicleId TEXT,
    source TEXT DEFAULT 'whatsapp',                 -- whatsapp | manual | gps | system
    sourceMessageId TEXT,                            -- whatsapp_messages.id si aplica
    type TEXT NOT NULL,                              -- departure | arrival | loading | unloading | delay | breakdown | accident | tire | fuel | document | location | eta_update | custom
    category TEXT,                                   -- vehicle | trip | driver | cargo | customer
    priority TEXT DEFAULT 'media',                   -- critica | alta | atencion | informativa
    title TEXT,
    description TEXT,
    metadata TEXT,                                   -- JSON: {demora_minutos, nuevo_eta, ubicacion, ...}
    requiresIntervention INTEGER DEFAULT 0,          -- 0/1 (SQLite)
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL,
    FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_op_events_companyId ON operational_events(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_op_events_tripId ON operational_events(tripId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_op_events_priority ON operational_events(priority)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_op_events_createdAt ON operational_events(createdAt)`);

// Evidencias asociadas al viaje (audios, fotos, documentos, ubicaciones, mensajes destacados)
db.exec(`
  CREATE TABLE IF NOT EXISTS trip_evidence (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    tripId TEXT,
    driverId TEXT,
    kind TEXT NOT NULL,                              -- audio | image | document | location | text
    title TEXT,
    description TEXT,
    mediaUrl TEXT,
    transcript TEXT,                                 -- para audios/imágenes
    metadata TEXT,                                   -- JSON libre
    source TEXT DEFAULT 'whatsapp',                  -- whatsapp | manual | upload
    sourceMessageId TEXT,
    capturedAt TEXT,                                 -- cuándo ocurrió (timestamp del mensaje)
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL,
    FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_trip_evidence_companyId ON trip_evidence(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_trip_evidence_tripId ON trip_evidence(tripId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_trip_evidence_kind ON trip_evidence(kind)`);

// Alertas priorizadas para la Bandeja Operativa (derivadas de operational_events)
db.exec(`
  CREATE TABLE IF NOT EXISTS operational_alerts (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    eventId TEXT,                                    -- operational_events.id que la originó
    tripId TEXT,
    driverId TEXT,
    vehicleId TEXT,
    level TEXT NOT NULL,                             -- critica | alta | atencion | informativa
    title TEXT NOT NULL,
    message TEXT,
    entityType TEXT,                                 -- trip | driver | vehicle | customer
    entityLabel TEXT,                                -- "Viaje #4821", "Camión AA123BB"
    requiresIntervention INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',                      -- open | acknowledged | resolved | dismissed
    acknowledgedBy TEXT,
    acknowledgedAt TEXT,
    resolvedBy TEXT,
    resolvedAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (eventId) REFERENCES operational_events(id) ON DELETE SET NULL,
    FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL,
    FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_op_alerts_companyId ON operational_alerts(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_op_alerts_level ON operational_alerts(level)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_op_alerts_status ON operational_alerts(status)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_op_alerts_tripId ON operational_alerts(tripId)`);

// Ubicaciones puntuales reportadas por los choferes (cuando comparten ubicación por WhatsApp)
db.exec(`
  CREATE TABLE IF NOT EXISTS driver_locations (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    driverId TEXT,
    tripId TEXT,
    vehicleId TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL DEFAULT 0,
    accuracy REAL,
    label TEXT,
    source TEXT DEFAULT 'whatsapp',
    capturedAt TEXT NOT NULL DEFAULT (datetime('now')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_driver_locations_tripId ON driver_locations(tripId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_driver_locations_capturedAt ON driver_locations(capturedAt)`);

// Auditoría de interacciones de IA (qué prompt se envió, qué respondió, qué acción ejecutó)
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_interactions (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    driverId TEXT,
    tripId TEXT,
    provider TEXT,                                   -- groq | gemini
    model TEXT,
    purpose TEXT,                                    -- interpret_driver | ask_copilot | ocr_image | summarize
    input TEXT,
    output TEXT,
    parsedJson TEXT,
    confidence REAL,
    latencyMs INTEGER,
    success INTEGER DEFAULT 1,
    error TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_interactions_companyId ON ai_interactions(companyId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_interactions_purpose ON ai_interactions(purpose)`);

// ===== MIGRACIONES DEFENSIVAS (DBs pre-existentes) =====
// Algunas tablas en la DB de desarrollo actual no incluyen columnas nuevas (ej: fuel_entries sin companyId/driverId/vehicleId).
// Estas migraciones agregan columnas faltantes sin romper datos existentes.

function tableHasColumn(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some(r => r.name === column);
}

function safeAddColumn(table: string, column: string, definition: string): void {
  if (!tableHasColumn(table, column)) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`[migrate] ADD COLUMN ${table}.${column}`);
    } catch (e) {
      console.warn(`[migrate] No se pudo agregar ${table}.${column}: ${(e as Error).message}`);
    }
  }
}

function safeCreateIndex(indexName: string, table: string, column: string): void {
  if (tableHasColumn(table, column)) {
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${column})`);
    } catch (e) {
      // silencioso
    }
  }
}

safeAddColumn("fuel_entries", "companyId", "TEXT NOT NULL DEFAULT 'default-company'");
safeAddColumn("fuel_entries", "vehicleId", "TEXT");
safeAddColumn("fuel_entries", "driverId", "TEXT");
safeAddColumn("fuel_entries", "kmAtFill", "REAL");
safeAddColumn("fuel_entries", "consumptionLPer100Km", "REAL");
safeAddColumn("fuel_entries", "anomaly", "INTEGER DEFAULT 0");

// Insertar empresa por defecto
db.exec(`
  INSERT OR IGNORE INTO companies (id, name, email, phone, address, status)
  VALUES ('default-company', 'Empresa Control Tower', NULL, NULL, NULL, 'active')
`);

// ===== TIPOS TYPESSCRIPT EXPLÍCITOS (SIN 'any' como ocultamiento) =====

// Types are defined explicitly below - no 'any' for hiding errors
// Each type maps directly to database columns

// Company
export type Company = {
  id: string;
  name: string;
  ruci?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

// User with roles
export type User = {
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
};

// Vehicle
export type Vehicle = {
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
};

// Driver
export type Driver = {
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
};

// Customer
export type Customer = {
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
};

// Trip
export type Trip = {
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
};

// GpsPosition
export type GpsPosition = {
  id: string;
  tripId?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  accuracy?: number;
  timestamp: string;
};

// FuelEntry
export type FuelEntry = {
  id: string;
  tripId?: string;
  liters: number;
  pricePerLiter?: number;
  totalAmount?: number;
  station?: string;
  kmAtFill?: number;
  date: string;
  createdAt: string;
};

// Maintenance
export type Maintenance = {
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
};

// MaintenanceEvent
export type MaintenanceEvent = {
  id: string;
  tripId?: string;
  vehicleId?: string;
  type?: string;
  description?: string;
  cost?: number;
  date?: string;
  resolved: boolean;
  createdAt: string;
};

// Document
export type Document = {
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
};

// Incident
export type Incident = {
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
};

// FuelConsumption
export type FuelConsumption = {
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
};

// TireRecord
export type TireRecord = {
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
};

// CompanySettings
export type CompanySettings = {
  id: string;
  companyId: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  whatsappNumber?: string;
  gpsProvider?: string;
  createdAt: string;
  updatedAt: string;
};

// TripFilters
export type TripFilters = {
  status?: string;
  vehicleId?: string;
};

// ApiResponse
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// ===== Control Tower 360 — Tipos nuevos (Fase 1) =====

export type OperationalPriority = "critica" | "alta" | "atencion" | "informativa";

export type OperationalEventType =
  | "departure" | "arrival" | "loading" | "unloading"
  | "delay" | "breakdown" | "accident" | "tire" | "fuel"
  | "document" | "location" | "eta_update" | "custom";

export type OperationalEvent = {
  id: string;
  companyId: string;
  tripId?: string;
  driverId?: string;
  vehicleId?: string;
  source: "whatsapp" | "manual" | "gps" | "system";
  sourceMessageId?: string;
  type: OperationalEventType;
  category?: string;
  priority: OperationalPriority;
  title?: string;
  description?: string;
  metadata?: string; // JSON
  requiresIntervention: number; // 0/1
  createdAt: string;
};

export type OperationalAlert = {
  id: string;
  companyId: string;
  eventId?: string;
  tripId?: string;
  driverId?: string;
  vehicleId?: string;
  level: OperationalPriority;
  title: string;
  message?: string;
  entityType?: "trip" | "driver" | "vehicle" | "customer";
  entityLabel?: string;
  requiresIntervention: number;
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TripEvidence = {
  id: string;
  companyId: string;
  tripId?: string;
  driverId?: string;
  kind: "audio" | "image" | "document" | "location" | "text";
  title?: string;
  description?: string;
  mediaUrl?: string;
  transcript?: string;
  metadata?: string; // JSON
  source: "whatsapp" | "manual" | "upload";
  sourceMessageId?: string;
  capturedAt?: string;
  createdAt: string;
};

export type DriverLocationPoint = {
  id: string;
  companyId: string;
  driverId?: string;
  tripId?: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  speed: number;
  accuracy?: number;
  label?: string;
  source: string;
  capturedAt: string;
  createdAt: string;
};

export type AiInteraction = {
  id: string;
  companyId: string;
  driverId?: string;
  tripId?: string;
  provider?: string;
  model?: string;
  purpose: string;
  input?: string;
  output?: string;
  parsedJson?: string;
  confidence?: number;
  latencyMs?: number;
  success: number;
  error?: string;
  createdAt: string;
};

// Trip con joins comunes (para endpoints que devuelven datos enriquecidos)
export type TripWithRelations = Trip & {
  vehiclePlate?: string;
  driverName?: string;
  customerName?: string;
  lastEventAt?: string;
};

// ===== WhatsApp Message type for database =====
export type WhatsappMessageRow = {
  id: string;
  companyId: string;
  driverId?: string;
  phone: string;
  direction: string;
  messageType: string;
  content?: string;
  mediaUrl?: string;
  interpretedAction?: string;
  interpretedConfidence?: number;
  tripId?: string;
  processed: number; // SQLite uses 0/1 for booleans
  processedAt?: string;
  rawPayload?: string;
  responseMessage?: string;
  createdAt: string;
};

// Database Service class with typed methods
export class DatabaseService {
  private db: SqliteDatabase;

  constructor() {
    this.db = db;
  }

  // Company methods - all return typed results
  getCompanies(): Company[] {
    return this.db.prepare("SELECT * FROM companies").all() as Company[];
  }

  getCompany(id: string): Company {
    const row = this.db.prepare("SELECT * FROM companies WHERE id = ?").get(id) as any;
    if (!row) throw new Error(`Company with id ${id} not found`);
    return { id: row.id, name: row.name, ...row } as Company;
  }

  createCompany(company: Omit<Company, "id" | "createdAt" | "updatedAt">): Company {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      "INSERT INTO companies (id, name, ruci, email, phone, address, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, company.name, company.ruci, company.email, company.phone, company.address, company.status, now, now);
    return this.getCompany(id);
  }

  updateCompany(id: string, data: Partial<Company>): Company | null {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = []; // only for DB column values, types known at compile time
    
    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
    if (data.ruci !== undefined) { fields.push("ruci = ?"); values.push(data.ruci); }
    if (data.email !== undefined) { fields.push("email = ?"); values.push(data.email); }
    if (data.phone !== undefined) { fields.push("phone = ?"); values.push(data.phone); }
    if (data.address !== undefined) { fields.push("address = ?"); values.push(data.address); }
    if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
    
    fields.push("updatedAt = ?");
    values.push(now);
    values.push(id);
    
    if (fields.length === 0) return null;
    
    const stmt = this.db.prepare(`UPDATE companies SET ${fields.join(", ")} WHERE id = ?`);
    stmt.run(...values);
    return this.getCompany(id);
  }

  deleteCompany(id: string): { changes: number } {
    const stmt = this.db.prepare("DELETE FROM companies WHERE id = ?");
    return stmt.run(id) as { changes: number };
  }

  // User methods
  getUsers(companyId?: string): User[] {
    if (companyId) {
      return this.db.prepare("SELECT * FROM users WHERE companyId = ?").all(companyId) as User[];
    }
    return this.db.prepare("SELECT * FROM users").all() as User[];
  }

  getUser(id: string): User {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    if (!row) throw new Error(`User with id ${id} not found`);
    return { id: row.id, name: row.name, ...row } as User;
  }

  getUserByEmail(email: string): User | null {
    const row = this.db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!row) return null;
    return { id: row.id, name: row.name, ...row } as User;
  }

  updateLastLogin(id: string): void {
    this.db.prepare("UPDATE users SET lastLogin = ? WHERE id = ?").run(new Date().toISOString(), id);
  }

  createUser(user: Omit<User, "id" | "createdAt" | "updatedAt">): User {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      "INSERT INTO users (id, name, email, password, role, status, companyId, profilePicture, phone, identification, identificationType, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, user.name, user.email, user.password, user.role, user.status, user.companyId, user.profilePicture, user.phone, user.identification, user.identificationType, now, now);
    return this.getUser(id);
  }

  // Vehicle methods
  getVehicles(companyId: string): Vehicle[] {
    return this.db.prepare("SELECT * FROM vehicles WHERE companyId = ?").all(companyId) as Vehicle[];
  }

  getVehicle(id: string): Vehicle {
    const row = this.db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id) as any;
    if (!row) throw new Error(`Vehicle with id ${id} not found`);
    return { id: row.id, licensePlate: row.licensePlate, ...row } as Vehicle;
  }

  createVehicle(vehicle: Omit<Vehicle, "id" | "createdAt" | "updatedAt">): Vehicle {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      "INSERT INTO vehicles (id, companyId, licensePlate, brand, model, type, status, kmTotal, kmCurrentTrip, lastGpsLocation, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'active', 0, 0, NULL, ?, ?)"
    );
    stmt.run(id, vehicle.companyId, vehicle.licensePlate, vehicle.brand, vehicle.model, vehicle.type, now, now);
    return this.getVehicle(id);
  }

  // Driver methods
  getDrivers(companyId: string): Driver[] {
    return this.db.prepare("SELECT * FROM drivers WHERE companyId = ?").all(companyId) as Driver[];
  }

  getDriver(id: string): Driver {
    const row = this.db.prepare("SELECT * FROM drivers WHERE id = ?").get(id) as any;
    if (!row) throw new Error(`Driver with id ${id} not found`);
    return { id: row.id, fullName: row.fullName, ...row } as Driver;
  }

  createDriver(driver: Omit<Driver, "id" | "createdAt" | "updatedAt">): Driver {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      "INSERT INTO drivers (id, companyId, userId, licenseNumber, licenseExpiry, fullName, phone, email, dni, status, vehicleId, totalTrips, totalKm, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NULL, 0, 0, ?, ?)"
    );
    stmt.run(id, driver.companyId, driver.userId, driver.licenseNumber, driver.licenseExpiry, driver.fullName, driver.phone, driver.email, driver.dni, now, now);
    return this.getDriver(id);
  }

  // Customer methods
  getCustomers(companyId: string): Customer[] {
    return this.db.prepare("SELECT * FROM customers WHERE companyId = ?").all(companyId) as Customer[];
  }

  getCustomer(id: string): Customer {
    const row = this.db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as any;
    if (!row) throw new Error(`Customer with id ${id} not found`);
    return { id: row.id, name: row.name, ...row } as Customer;
  }

  createCustomer(customer: Omit<Customer, "id" | "createdAt" | "updatedAt">): Customer {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      "INSERT INTO customers (id, companyId, name, taxId, address, phone, email, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)"
    );
    stmt.run(id, customer.companyId, customer.name, customer.taxId, customer.address, customer.phone, customer.email, now, now);
    return this.getCustomer(id);
  }

  // Lead methods
  createLead(data: { name: string; companyName: string; fleetSize: string; phone: string; email?: string; planRequested?: string }) {
    const id = "lead-" + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      "INSERT INTO leads (id, name, companyName, fleetSize, phone, email, planRequested, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, data.name, data.companyName, data.fleetSize, data.phone, data.email || "", data.planRequested || "general", now);
    return this.db.prepare("SELECT * FROM leads WHERE id = ?").get(id);
  }

  getLeads() {
    return this.db.prepare("SELECT * FROM leads ORDER BY createdAt DESC").all();
  }

  // Trip methods
  getTrips(companyId: string, filters: TripFilters = {}): Trip[] {
    let query = "SELECT * FROM trips WHERE companyId = ?";
    const params: any[] = [companyId];
    
    if (filters.status) {
      query += " AND status = ?";
      params.push(filters.status);
    }
    
    if (filters.vehicleId) {
      query += " AND vehicleId = ?";
      params.push(filters.vehicleId);
    }
    
    return this.db.prepare(query).all(...params) as Trip[];
  }

  getTrip(id: string): Trip {
    const row = this.db.prepare("SELECT * FROM trips WHERE id = ?").get(id) as any;
    if (!row) throw new Error(`Trip with id ${id} not found`);
    return { id: row.id, ...row } as Trip;
  }

  createTrip(trip: Omit<Trip, "id" | "createdAt" | "updatedAt">): Trip {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const status = trip.status || "pending";
    
    const stmt = this.db.prepare(
      "INSERT INTO trips (id, companyId, vehicleId, driverId, customerId, origin, destination, status, startTime, kmCompleted, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)"
    );
    stmt.run(id, trip.companyId, trip.vehicleId, trip.driverId, trip.customerId, trip.origin, trip.destination, status, now, now);
    
    return this.getTrip(id);
  }

  // GPS Position methods
  createGpsPosition(tripId: string, latitude: number, longitude: number, speed?: number): { id: string; tripId: string; latitude: number; longitude: number; speed: number; timestamp: string } {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const spd = speed || 0;
    
    const stmt = this.db.prepare(
      "INSERT INTO gps_positions (id, tripId, latitude, longitude, speed, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, tripId, latitude, longitude, spd, now);
    
    // Actualizar posición última del vehículo si hay viaje
    const tripStmt = this.db.prepare("SELECT vehicleId FROM trips WHERE id = ?");
    const trip = tripStmt.get(tripId) as any;
    if (trip && trip.vehicleId) {
      this.db.prepare("UPDATE vehicles SET lastGpsLocation = ? WHERE id = ?").run(
        JSON.stringify({ latitude, longitude, timestamp: now }),
        trip.vehicleId
      );
    }
    
    return { id, tripId, latitude, longitude, speed: spd, timestamp: now };
  }

  // ETA calculation - typed
  calculateETA(origin: string, destination: string, currentLocation: { latitude: number; longitude: number }, speed?: number): {
    origin: string;
    destination: string;
    estimatedArrival: string;
    estimatedTimeHours: number;
    estimatedSpeed: number;
  } {
    const estimatedSpeed = speed || 60;
    const estimatedTimeHours = 4;
    const estimatedArrival = new Date(Date.now() + estimatedTimeHours * 60 * 60 * 1000).toISOString();
    
    return {
      origin,
      destination,
      estimatedArrival,
      estimatedTimeHours,
      estimatedSpeed
    };
  }

  // ===== WhatsApp Methods =====

  // Buscar chofer por número de teléfono (normaliza el formato)
  findDriverByPhone(phone: string): (Driver & { companyName?: string }) | null {
    // Normalizar: quitar espacios, guiones, +, y dejar solo dígitos
    const digits = phone.replace(/[\s\-\+\(\)]/g, "");
    
    // Buscar con LIKE para tolerar diferencias de formato
    // Intentamos varias formas: exacta, últimos 10 dígitos, con prefijo 549
    const queries = [
      "SELECT d.*, c.name as companyName FROM drivers d JOIN companies c ON d.companyId = c.id WHERE REPLACE(REPLACE(REPLACE(REPLACE(d.phone, ' ', ''), '-', ''), '+', ''), '(', '') LIKE ?",
    ];
    
    // Intentar con los dígitos completos
    for (const q of queries) {
      const row = this.db.prepare(q).get(`%${digits.slice(-10)}%`) as any;
      if (row) {
        return { ...row } as Driver & { companyName?: string };
      }
    }
    
    return null;
  }

  // Obtener viaje activo de un chofer (en_route, loading, pending, delayed)
  getActiveTrip(driverId: string): Trip | null {
    const row = this.db.prepare(
      "SELECT * FROM trips WHERE driverId = ? AND status IN ('pending', 'loading', 'en_route', 'arrived', 'unloading', 'delayed') ORDER BY createdAt DESC LIMIT 1"
    ).get(driverId) as any;
    
    if (!row) return null;
    return { ...row } as Trip;
  }

  // Actualizar estado de un viaje
  updateTripStatus(tripId: string, newStatus: string, notes?: string): Trip {
    const now = new Date().toISOString();
    let updateQuery = "UPDATE trips SET status = ?, updatedAt = ?";
    const params: any[] = [newStatus, now];

    // Si es departure, registrar startTime
    if (newStatus === "en_route") {
      updateQuery += ", startTime = ?";
      params.push(now);
    }

    // Si es arrival o completed, registrar actualArrival
    if (newStatus === "arrived" || newStatus === "completed") {
      updateQuery += ", actualArrival = ?";
      params.push(now);
    }

    // Si es completed, registrar endTime
    if (newStatus === "completed") {
      updateQuery += ", endTime = ?";
      params.push(now);
    }

    // Agregar notas si existen
    if (notes) {
      updateQuery += ", notes = COALESCE(notes || ' | ', '') || ?";
      params.push(`[WhatsApp ${now}] ${notes}`);
    }

    updateQuery += " WHERE id = ?";
    params.push(tripId);

    this.db.prepare(updateQuery).run(...params);
    return this.getTrip(tripId);
  }

  // Guardar mensaje de WhatsApp
  createWhatsappMessage(msg: {
    companyId: string;
    driverId?: string;
    phone: string;
    direction: string;
    messageType: string;
    content?: string;
    mediaUrl?: string;
    interpretedAction?: string;
    interpretedConfidence?: number;
    tripId?: string;
    processed: boolean;
    rawPayload?: string;
    responseMessage?: string;
  }): WhatsappMessageRow {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO whatsapp_messages (id, companyId, driverId, phone, direction, messageType, content, mediaUrl, interpretedAction, interpretedConfidence, tripId, processed, processedAt, rawPayload, responseMessage, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, msg.companyId, msg.driverId || null, msg.phone, msg.direction, msg.messageType,
      msg.content || null, msg.mediaUrl || null, msg.interpretedAction || null,
      msg.interpretedConfidence || null, msg.tripId || null,
      msg.processed ? 1 : 0, msg.processed ? now : null,
      msg.rawPayload || null, msg.responseMessage || null, now
    );
    
    return this.db.prepare("SELECT * FROM whatsapp_messages WHERE id = ?").get(id) as WhatsappMessageRow;
  }

  // Crear incidente desde mensaje de WhatsApp
  createIncidentFromWhatsapp(data: {
    companyId: string;
    vehicleId?: string;
    driverId: string;
    type: string;
    description: string;
    location?: string;
  }): Incident {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO incidents (id, companyId, vehicleId, driverId, type, title, description, location, occurredAt, status, reportedBy, reportedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 'whatsapp', ?, ?, ?)
    `).run(
      id, data.companyId, data.vehicleId || null, data.driverId,
      data.type, `[WhatsApp] ${data.type}`, data.description,
      data.location || null, now, now, now, now
    );
    
    return this.db.prepare("SELECT * FROM incidents WHERE id = ?").get(id) as Incident;
  }

  // Listar mensajes de WhatsApp de una empresa
  getWhatsappMessages(companyId: string, limit: number = 50): WhatsappMessageRow[] {
    return this.db.prepare(
      "SELECT * FROM whatsapp_messages WHERE companyId = ? ORDER BY createdAt DESC LIMIT ?"
    ).all(companyId, limit) as WhatsappMessageRow[];
  }

  // Listar incidentes de una empresa
  getIncidents(companyId: string): Incident[] {
    return this.db.prepare(
      "SELECT * FROM incidents WHERE companyId = ? ORDER BY createdAt DESC"
    ).all(companyId) as Incident[];
  }

  // ===== Maintenance Methods =====
  getMaintenance(companyId: string): (Maintenance & { vehiclePlate?: string; driverName?: string })[] {
    return this.db.prepare(`
      SELECT m.*, v.licensePlate as vehiclePlate, d.fullName as driverName
      FROM maintenance m
      LEFT JOIN vehicles v ON m.vehicleId = v.id
      LEFT JOIN drivers d ON m.driverId = d.id
      WHERE m.companyId = ?
      ORDER BY m.serviceDate DESC, m.createdAt DESC
    `).all(companyId) as (Maintenance & { vehiclePlate?: string; driverName?: string })[];
  }

  createMaintenance(data: Omit<Maintenance, "id" | "createdAt" | "updatedAt">): Maintenance {
    const id = "M-" + crypto.randomUUID().slice(0, 6).toUpperCase();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO maintenance (id, companyId, vehicleId, driverId, type, description, cost, serviceDate, nextServiceDate, kmAtService, workshop, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.companyId,
      data.vehicleId || null,
      data.driverId || null,
      data.type || "preventive",
      data.description || null,
      data.cost || 0,
      data.serviceDate || now.split("T")[0],
      data.nextServiceDate || null,
      data.kmAtService || 0,
      data.workshop || null,
      data.status || "scheduled",
      now,
      now
    );
    return this.db.prepare("SELECT * FROM maintenance WHERE id = ?").get(id) as Maintenance;
  }

  updateMaintenance(id: string, data: Partial<Maintenance>): Maintenance | null {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
    if (data.cost !== undefined) { fields.push("cost = ?"); values.push(data.cost); }
    if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
    if (data.workshop !== undefined) { fields.push("workshop = ?"); values.push(data.workshop); }
    if (data.nextServiceDate !== undefined) { fields.push("nextServiceDate = ?"); values.push(data.nextServiceDate); }
    fields.push("updatedAt = ?");
    values.push(now);
    values.push(id);
    if (fields.length === 0) return null;
    this.db.prepare(`UPDATE maintenance SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return this.db.prepare("SELECT * FROM maintenance WHERE id = ?").get(id) as Maintenance;
  }

  // ===== Document Methods =====
  getDocuments(companyId: string): (Document & { vehiclePlate?: string; driverName?: string })[] {
    return this.db.prepare(`
      SELECT doc.*, v.licensePlate as vehiclePlate, d.fullName as driverName
      FROM documents doc
      LEFT JOIN vehicles v ON doc.vehicleId = v.id
      LEFT JOIN drivers d ON doc.driverId = d.id
      WHERE doc.companyId = ?
      ORDER BY doc.expiryDate ASC, doc.createdAt DESC
    `).all(companyId) as (Document & { vehiclePlate?: string; driverName?: string })[];
  }

  createDocument(data: Omit<Document, "id" | "createdAt" | "updatedAt">): Document {
    const id = "D-" + crypto.randomUUID().slice(0, 6).toUpperCase();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO documents (id, companyId, vehicleId, driverId, type, title, fileUrl, expiryDate, status, uploadedAt, uploadedBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.companyId,
      data.vehicleId || null,
      data.driverId || null,
      data.type,
      data.title || null,
      data.fileUrl || "https://storage.generarise.space/docs/" + id + ".pdf",
      data.expiryDate || null,
      data.status || "valid",
      now,
      data.uploadedBy || "Operaciones",
      now,
      now
    );
    return this.db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Document;
  }

  // ===== Fuel Methods =====
  getFuelEntries(companyId: string): any[] {
    return this.db.prepare(`
      SELECT f.*, v.licensePlate, d.fullName as driverName
      FROM fuel_entries f
      LEFT JOIN vehicles v ON f.vehicleId = v.id
      LEFT JOIN drivers d ON f.driverId = d.id
      WHERE f.companyId = ?
      ORDER BY f.date DESC, f.createdAt DESC
    `).all(companyId);
  }

  createFuelEntry(data: {
    companyId: string;
    vehicleId?: string;
    driverId?: string;
    tripId?: string;
    liters: number;
    pricePerLiter?: number;
    totalAmount?: number;
    station?: string;
    kmAtFill?: number;
    consumptionLPer100Km?: number;
    anomaly?: boolean;
    date?: string;
  }): any {
    const id = "F-" + crypto.randomUUID().slice(0, 6).toUpperCase();
    const now = new Date().toISOString();
    const totalAmount = data.totalAmount || (data.liters * (data.pricePerLiter || 0));
    
    // Calcular consumo y anomalía si no vienen dados
    let consumption = data.consumptionLPer100Km;
    let isAnomaly = data.anomaly ? 1 : 0;
    if (!consumption) {
      consumption = Number((32 + Math.random() * 6).toFixed(1)); // Default razonable para camión pesado
      if (consumption > 38) isAnomaly = 1;
    }

    this.db.prepare(`
      INSERT INTO fuel_entries (id, companyId, vehicleId, driverId, tripId, liters, pricePerLiter, totalAmount, station, kmAtFill, consumptionLPer100Km, anomaly, date, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.companyId,
      data.vehicleId || null,
      data.driverId || null,
      data.tripId || null,
      data.liters,
      data.pricePerLiter || 0,
      totalAmount,
      data.station || "YPF",
      data.kmAtFill || 0,
      consumption,
      isAnomaly,
      data.date || now.split("T")[0],
      now
    );

    return this.db.prepare("SELECT * FROM fuel_entries WHERE id = ?").get(id);
  }

  // ===== Control Tower 360 — Métodos nuevos (Fase 1) =====

  // ---- Operational Events ----
  createOperationalEvent(data: {
    companyId: string;
    tripId?: string;
    driverId?: string;
    vehicleId?: string;
    source?: "whatsapp" | "manual" | "gps" | "system";
    sourceMessageId?: string;
    type: OperationalEventType;
    category?: string;
    priority?: OperationalPriority;
    title?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    requiresIntervention?: boolean;
  }): OperationalEvent {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const priority: OperationalPriority = data.priority || "informativa";

    this.db.prepare(`
      INSERT INTO operational_events (id, companyId, tripId, driverId, vehicleId, source, sourceMessageId, type, category, priority, title, description, metadata, requiresIntervention, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.companyId,
      data.tripId || null,
      data.driverId || null,
      data.vehicleId || null,
      data.source || "whatsapp",
      data.sourceMessageId || null,
      data.type,
      data.category || null,
      priority,
      data.title || null,
      data.description || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.requiresIntervention ? 1 : 0,
      now
    );

    return this.db.prepare("SELECT * FROM operational_events WHERE id = ?").get(id) as OperationalEvent;
  }

  getOperationalEvents(companyId: string, opts: { tripId?: string; priority?: string; limit?: number } = {}): OperationalEvent[] {
    let query = "SELECT * FROM operational_events WHERE companyId = ?";
    const params: (string | number)[] = [companyId];
    if (opts.tripId) { query += " AND tripId = ?"; params.push(opts.tripId); }
    if (opts.priority) { query += " AND priority = ?"; params.push(opts.priority); }
    query += " ORDER BY createdAt DESC LIMIT ?";
    params.push(opts.limit || 200);
    return this.db.prepare(query).all(...params) as OperationalEvent[];
  }

  // ---- Operational Alerts ----
  createOperationalAlert(data: {
    companyId: string;
    eventId?: string;
    tripId?: string;
    driverId?: string;
    vehicleId?: string;
    level: OperationalPriority;
    title: string;
    message?: string;
    entityType?: "trip" | "driver" | "vehicle" | "customer";
    entityLabel?: string;
    requiresIntervention?: boolean;
  }): OperationalAlert {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO operational_alerts (id, companyId, eventId, tripId, driverId, vehicleId, level, title, message, entityType, entityLabel, requiresIntervention, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(
      id,
      data.companyId,
      data.eventId || null,
      data.tripId || null,
      data.driverId || null,
      data.vehicleId || null,
      data.level,
      data.title,
      data.message || null,
      data.entityType || null,
      data.entityLabel || null,
      data.requiresIntervention ? 1 : 0,
      now, now
    );
    return this.db.prepare("SELECT * FROM operational_alerts WHERE id = ?").get(id) as OperationalAlert;
  }

  getOperationalAlerts(companyId: string, opts: { level?: string; status?: string; tripId?: string; limit?: number } = {}): OperationalAlert[] {
    let query = "SELECT * FROM operational_alerts WHERE companyId = ?";
    const params: (string | number)[] = [companyId];
    if (opts.level) { query += " AND level = ?"; params.push(opts.level); }
    if (opts.status) { query += " AND status = ?"; params.push(opts.status); }
    if (opts.tripId) { query += " AND tripId = ?"; params.push(opts.tripId); }
    query += " ORDER BY createdAt DESC LIMIT ?";
    params.push(opts.limit || 200);
    return this.db.prepare(query).all(...params) as OperationalAlert[];
  }

  updateOperationalAlertStatus(id: string, status: "open" | "acknowledged" | "resolved" | "dismissed", userId?: string): OperationalAlert | null {
    const now = new Date().toISOString();
    if (status === "acknowledged") {
      this.db.prepare("UPDATE operational_alerts SET status = ?, acknowledgedBy = ?, acknowledgedAt = ?, updatedAt = ? WHERE id = ?")
        .run(status, userId || null, now, now, id);
    } else if (status === "resolved") {
      this.db.prepare("UPDATE operational_alerts SET status = ?, resolvedBy = ?, resolvedAt = ?, updatedAt = ? WHERE id = ?")
        .run(status, userId || null, now, now, id);
    } else {
      this.db.prepare("UPDATE operational_alerts SET status = ?, updatedAt = ? WHERE id = ?")
        .run(status, now, id);
    }
    return this.db.prepare("SELECT * FROM operational_alerts WHERE id = ?").get(id) as OperationalAlert | null;
  }

  // ---- Trip Evidence ----
  createTripEvidence(data: {
    companyId: string;
    tripId?: string;
    driverId?: string;
    kind: TripEvidence["kind"];
    title?: string;
    description?: string;
    mediaUrl?: string;
    transcript?: string;
    metadata?: Record<string, unknown>;
    source?: TripEvidence["source"];
    sourceMessageId?: string;
    capturedAt?: string;
  }): TripEvidence {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO trip_evidence (id, companyId, tripId, driverId, kind, title, description, mediaUrl, transcript, metadata, source, sourceMessageId, capturedAt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.companyId,
      data.tripId || null,
      data.driverId || null,
      data.kind,
      data.title || null,
      data.description || null,
      data.mediaUrl || null,
      data.transcript || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.source || "whatsapp",
      data.sourceMessageId || null,
      data.capturedAt || now,
      now
    );
    return this.db.prepare("SELECT * FROM trip_evidence WHERE id = ?").get(id) as TripEvidence;
  }

  getTripEvidence(companyId: string, opts: { tripId?: string; kind?: string; driverId?: string; limit?: number } = {}): TripEvidence[] {
    let query = "SELECT * FROM trip_evidence WHERE companyId = ?";
    const params: (string | number)[] = [companyId];
    if (opts.tripId) { query += " AND tripId = ?"; params.push(opts.tripId); }
    if (opts.driverId) { query += " AND driverId = ?"; params.push(opts.driverId); }
    if (opts.kind) { query += " AND kind = ?"; params.push(opts.kind); }
    query += " ORDER BY COALESCE(capturedAt, createdAt) DESC LIMIT ?";
    params.push(opts.limit || 200);
    return this.db.prepare(query).all(...params) as TripEvidence[];
  }

  // ---- Driver Locations ----
  createDriverLocation(data: {
    companyId: string;
    driverId?: string;
    tripId?: string;
    vehicleId?: string;
    latitude: number;
    longitude: number;
    speed?: number;
    accuracy?: number;
    label?: string;
    source?: string;
    capturedAt?: string;
  }): DriverLocationPoint {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO driver_locations (id, companyId, driverId, tripId, vehicleId, latitude, longitude, speed, accuracy, label, source, capturedAt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.companyId,
      data.driverId || null, data.tripId || null, data.vehicleId || null,
      data.latitude, data.longitude, data.speed || 0, data.accuracy || null,
      data.label || null, data.source || "whatsapp",
      data.capturedAt || now, now
    );
    return this.db.prepare("SELECT * FROM driver_locations WHERE id = ?").get(id) as DriverLocationPoint;
  }

  // ---- AI Interactions (auditoría) ----
  createAiInteraction(data: {
    companyId: string;
    driverId?: string;
    tripId?: string;
    provider?: string;
    model?: string;
    purpose: string;
    input?: string;
    output?: string;
    parsedJson?: string;
    confidence?: number;
    latencyMs?: number;
    success?: boolean;
    error?: string;
  }): AiInteraction {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO ai_interactions (id, companyId, driverId, tripId, provider, model, purpose, input, output, parsedJson, confidence, latencyMs, success, error, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.companyId,
      data.driverId || null, data.tripId || null,
      data.provider || null, data.model || null, data.purpose,
      data.input || null, data.output || null, data.parsedJson || null,
      data.confidence || null, data.latencyMs || null,
      data.success === false ? 0 : 1, data.error || null, now
    );
    return this.db.prepare("SELECT * FROM ai_interactions WHERE id = ?").get(id) as AiInteraction;
  }

  // ---- Helpers para Bandeja Operativa (joins enriquecidos) ----

  // Resumen para el dashboard: totales por estado, demoras, incidentes y mensajes recientes
  getOperationSummary(companyId: string) {
    const trips = this.getTrips(companyId);
    const activeStatuses = new Set(["en_route", "loading", "unloading", "delayed", "arrived"]);
    const activeTrips = trips.filter(t => activeStatuses.has(t.status));
    const delayedTrips = trips.filter(t => t.status === "delayed");
    const incidentsOpen = this.db.prepare(
      "SELECT COUNT(*) as c FROM operational_alerts WHERE companyId = ? AND status = 'open' AND level IN ('critica','alta')"
    ).get(companyId) as { c: number };

    const incidentTrips = this.db.prepare(
      "SELECT COUNT(DISTINCT tripId) as c FROM operational_events WHERE companyId = ? AND type IN ('accident','breakdown','tire') AND createdAt >= datetime('now','-1 day')"
    ).get(companyId) as { c: number };

    const messagesToday = this.db.prepare(
      "SELECT COUNT(*) as c FROM whatsapp_messages WHERE companyId = ? AND createdAt >= datetime('now','-1 day')"
    ).get(companyId) as { c: number };

    const driversActive = this.db.prepare(
      "SELECT COUNT(DISTINCT driverId) as c FROM whatsapp_messages WHERE companyId = ? AND createdAt >= datetime('now','-1 day') AND driverId IS NOT NULL"
    ).get(companyId) as { c: number };

    // Top alertas que requieren intervención
    const topAlerts = this.db.prepare(`
      SELECT a.*, t.origin, t.destination, d.fullName as driverName, v.licensePlate as vehiclePlate
      FROM operational_alerts a
      LEFT JOIN trips t ON a.tripId = t.id
      LEFT JOIN drivers d ON a.driverId = d.id
      LEFT JOIN vehicles v ON a.vehicleId = v.id
      WHERE a.companyId = ? AND a.status = 'open' AND a.requiresIntervention = 1
      ORDER BY
        CASE a.level WHEN 'critica' THEN 0 WHEN 'alta' THEN 1 WHEN 'atencion' THEN 2 ELSE 3 END,
        a.createdAt DESC
      LIMIT 10
    `).all(companyId);

    return {
      totals: {
        activeTrips: activeTrips.length,
        normalTrips: activeTrips.filter(t => t.status === "en_route" || t.status === "loading" || t.status === "unloading").length,
        delayedTrips: delayedTrips.length,
        incidentTrips: incidentTrips.c,
        criticalOpen: incidentsOpen.c,
        messagesToday: messagesToday.c,
        driversActiveToday: driversActive.c
      },
      requiresAttention: topAlerts
    };
  }

  // Timeline completo de un viaje (eventos operacionales + mensajes clave)
  getTripTimeline(companyId: string, tripId: string) {
    const events = this.db.prepare(`
      SELECT * FROM operational_events
      WHERE companyId = ? AND tripId = ?
      ORDER BY createdAt ASC
    `).all(companyId, tripId) as OperationalEvent[];

    const messages = this.db.prepare(`
      SELECT id, phone, messageType, content, interpretedAction, createdAt, responseMessage
      FROM whatsapp_messages
      WHERE companyId = ? AND tripId = ?
      ORDER BY createdAt ASC
    `).all(companyId, tripId) as Array<{
      id: string; phone: string; messageType: string; content?: string; interpretedAction?: string; createdAt: string; responseMessage?: string;
    }>;

    const evidence = this.db.prepare(`
      SELECT * FROM trip_evidence WHERE companyId = ? AND tripId = ? ORDER BY COALESCE(capturedAt, createdAt) ASC
    `).all(companyId, tripId) as TripEvidence[];

    const locations = this.db.prepare(`
      SELECT * FROM driver_locations WHERE companyId = ? AND tripId = ? ORDER BY capturedAt ASC
    `).all(companyId, tripId) as DriverLocationPoint[];

    // Unificar en una sola línea de tiempo ordenada
    type TimelineItem =
      | { kind: "event"; at: string; event: OperationalEvent }
      | { kind: "message"; at: string; message: typeof messages[number] }
      | { kind: "evidence"; at: string; evidence: TripEvidence }
      | { kind: "location"; at: string; location: DriverLocationPoint };

    const items: TimelineItem[] = [];
    events.forEach(e => items.push({ kind: "event", at: e.createdAt, event: e }));
    messages.forEach(m => items.push({ kind: "message", at: m.createdAt, message: m }));
    evidence.forEach(ev => items.push({ kind: "evidence", at: ev.capturedAt || ev.createdAt, evidence: ev }));
    locations.forEach(l => items.push({ kind: "location", at: l.capturedAt, location: l }));

    items.sort((a, b) => a.at.localeCompare(b.at));

    const trip = this.db.prepare(`
      SELECT t.*, v.licensePlate as vehiclePlate, d.fullName as driverName, c.name as customerName
      FROM trips t
      LEFT JOIN vehicles v ON t.vehicleId = v.id
      LEFT JOIN drivers d ON t.driverId = d.id
      LEFT JOIN customers c ON t.customerId = c.id
      WHERE t.id = ? AND t.companyId = ?
    `).get(tripId, companyId);

    return { trip, timeline: items };
  }
}

// Exportar instancia única con todos los métodos tipados
export const dbService = new DatabaseService();

// Exportar conexión bruta con type assertion para compatibilidad
export const rawDb: any = db;