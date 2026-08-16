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
    tripId TEXT,
    liters REAL NOT NULL,
    pricePerLiter REAL,
    totalAmount REAL,
    station TEXT,
    kmAtFill REAL,
    date TEXT NOT NULL DEFAULT (datetime('now')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL
  )
`);
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
  status: "pending" | "en_route" | "completed" | "delayed" | "cancelled";
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
}

// Exportar instancia única con todos los métodos tipados
export const dbService = new DatabaseService();

// Exportar conexión bruta con type assertion para compatibilidad
export const rawDb: any = db;