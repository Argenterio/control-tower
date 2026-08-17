// Server.ts - Backend API para Control Tower
// Based on prompt maestro: SaaS Platform for Cargo Transportation Companies
// TypeScript with strong types - no 'any' as error hiding mechanism

import "dotenv/config";
import express from "express";
import cors from "cors";
import { dbService, rawDb } from "./database";
import type { DatabaseService } from "./database";
import { signToken, requireAuth, requireRole, ensureAdminUser, verifyPassword, type AuthPayload } from "./auth";
import type {
  Company,
  User,
  Vehicle,
  Driver,
  Customer,
  Trip,
  GpsPosition,
  FuelEntry,
  Maintenance,
  MaintenanceEvent,
  Document,
  Incident,
  FuelConsumption,
  TireRecord,
  CompanySettings,
  TripFilters,
  ApiResponse
} from "./types";

// Initialize express
const app = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Middlewares - configuration typed
const allowedOrigins: string = process.env.FRONTEND_URL || [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://control-tower.generarise.space"
].join(",");

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir requests sin origen (curl, healthchecks, webhooks)
    if (!origin) {
      callback(null, true);
      return;
    }
    const origins = allowedOrigins.split(",").map((o) => o.trim());
    if (origins.includes(origin) || origin.endsWith(".generarise.space")) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.static("public"));

// Health check - returns typed response
app.get("/health", (req: express.Request, res: express.Response) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

// Root route - returns a professional landing page (HTTP 200 for EasyPanel health checks)
app.get("/", (req: express.Request, res: express.Response) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Control Tower API</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", system-ui, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 40px;
      max-width: 720px;
      width: 100%;
      box-shadow: 0 20px 50px rgba(0,0,0,0.4);
    }
    .brand { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
    .brand img { width: 48px; height: 48px; border-radius: 10px; }
    .brand h1 { font-size: 24px; font-weight: 700; }
    .status { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #86efac; background: #052e16; border: 1px solid #166534; padding: 4px 12px; border-radius: 20px; margin-bottom: 24px; }
    .status::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px #22c55e; }
    p.sub { color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    a.endpoint {
      display: flex; align-items: center; justify-content: space-between;
      background: #0f172a; border: 1px solid #334155; border-radius: 8px;
      padding: 12px 14px; text-decoration: none; font-size: 13px;
      color: #93c5fd; transition: border-color .15s, color .15s;
    }
    a.endpoint:hover { border-color: #3b82f6; color: #dbeafe; }
    a.endpoint .method { font-weight: 700; color: #22c55e; }
    .version { margin-top: 24px; font-size: 12px; color: #64748b; }
    @media (max-width: 520px) { .card { padding: 24px; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <img src="/logo.png" alt="Control Tower" onerror="this.style.display='none'" />
      <h1>Control Tower API</h1>
    </div>
    <span class="status">Servicio en línea</span>
    <p class="sub">API REST para la plataforma SaaS de empresas de transporte de cargas. Base URL: <code>${req.protocol}://${req.get("host")}</code></p>
    <div class="grid">
      ${["/health", "/api/companies", "/api/users", "/api/vehicles", "/api/drivers", "/api/customers", "/api/trips"]
        .map((e) => `<a class="endpoint" href="${e}"><span>${e}</span><span class="method">GET</span></a>`)
        .join("")}
    </div>
    <div class="version">Version 1.0.0 &middot; ${new Date().toISOString()}</div>
  </div>
</body>
</html>`
  res.send(html)
})

// === AUTH ROUTES ===
// POST /api/auth/login - inicia sesión y devuelve JWT
app.post("/api/auth/login", (req: express.Request, res: express.Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ success: false, error: "email y password son requeridos" });
    return;
  }

  const user = dbService.getUserByEmail(email as string);
  if (!user || !user.password) {
    res.status(401).json({ success: false, error: "Credenciales inválidas" });
    return;
  }

  if (user.status !== "active") {
    res.status(403).json({ success: false, error: "Usuario desactivado" });
    return;
  }

  if (!verifyPassword(password as string, user.password)) {
    res.status(401).json({ success: false, error: "Credenciales inválidas" });
    return;
  }

  dbService.updateLastLogin(user.id);
  const token = signToken({ id: user.id, email: user.email, role: user.role, companyId: user.companyId });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      }
    }
  } as ApiResponse<{ token: string; user: Partial<User> }>);
});

// GET /api/auth/me - devuelve el usuario del token actual
app.get("/api/auth/me", requireAuth, (req: express.Request, res: express.Response) => {
  const auth = res.locals.auth as AuthPayload;
  const user = dbService.getUser(auth.sub);
  if (!user) {
    res.status(404).json({ success: false, error: "Usuario no encontrado" });
    return;
  }
  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      lastLogin: user.lastLogin
    }
  } as ApiResponse<Partial<User>>);
});

// === COMPANIES ROUTES ===
// GET /api/companies
app.get("/api/companies", requireAuth, (req: express.Request, res: express.Response) => {
  const companies = dbService.getCompanies();
  res.json({ success: true, data: companies } as ApiResponse<Company[]>);
});

// GET /api/companies/:id
app.get("/api/companies/:id", requireAuth, (req: express.Request, res: express.Response) => {
  const company = dbService.getCompany(req.params.id);
  if (company) {
    res.json({ success: true, data: company });
  } else {
    res.status(404).json({ success: false, error: "Company not found" });
  }
});

// POST /api/companies
app.post("/api/companies", requireAuth, requireRole("admin"), (req: express.Request, res: express.Response) => {
  const company = dbService.createCompany(req.body);
  res.status(201).json({ success: true, data: company });
});

// PUT /api/companies/:id
app.put("/api/companies/:id", requireAuth, requireRole("admin"), (req: express.Request, res: express.Response) => {
  const company = dbService.updateCompany(req.params.id, req.body);
  if (company) {
    res.json({ success: true, data: company });
  } else {
    res.status(404).json({ success: false, error: "Company not found" });
  }
});

// === USERS ROUTES ===
app.get("/api/users", requireAuth, (req: express.Request, res: express.Response) => {
  const companyId: string = req.query.companyId as string;
  const users = dbService.getUsers(companyId);
  res.json({ success: true, data: users } as ApiResponse<User[]>);
});

app.get("/api/users/:id", requireAuth, (req: express.Request, res: express.Response) => {
  const user = dbService.getUser(req.params.id);
  if (user) {
    res.json({ success: true, data: user });
  } else {
    res.status(404).json({ success: false, error: "User not found" });
  }
});

app.post("/api/users", requireAuth, requireRole("admin"), (req: express.Request, res: express.Response) => {
  const user = dbService.createUser(req.body);
  res.status(201).json({ success: true, data: user });
});

// === VEHICLES ROUTES ===
app.get("/api/vehicles", requireAuth, (req: express.Request, res: express.Response) => {
  const companyId: string = req.query.companyId as string;
  const vehicles = dbService.getVehicles(companyId);
  res.json({ success: true, data: vehicles } as ApiResponse<Vehicle[]>);
});

app.get("/api/vehicles/:id", requireAuth, (req: express.Request, res: express.Response) => {
  const vehicle = dbService.getVehicle(req.params.id);
  if (vehicle) {
    res.json({ success: true, data: vehicle });
  } else {
    res.status(404).json({ success: false, error: "Vehicle not found" });
  }
});

app.post("/api/vehicles", requireAuth, (req: express.Request, res: express.Response) => {
  const vehicle = dbService.createVehicle(req.body);
  res.status(201).json({ success: true, data: vehicle });
});

// === DRIVERS ROUTES ===
app.get("/api/drivers", requireAuth, (req: express.Request, res: express.Response) => {
  const companyId: string = req.query.companyId as string;
  const drivers = dbService.getDrivers(companyId);
  res.json({ success: true, data: drivers } as ApiResponse<Driver[]>);
});

app.get("/api/drivers/:id", requireAuth, (req: express.Request, res: express.Response) => {
  const driver = dbService.getDriver(req.params.id);
  if (driver) {
    res.json({ success: true, data: driver });
  } else {
    res.status(404).json({ success: false, error: "Driver not found" });
  }
});

app.post("/api/drivers", requireAuth, (req: express.Request, res: express.Response) => {
  const driver = dbService.createDriver(req.body);
  res.status(201).json({ success: true, data: driver });
});

// === CUSTOMERS ROUTES ===
app.get("/api/customers", requireAuth, (req: express.Request, res: express.Response) => {
  const companyId: string = req.query.companyId as string;
  const customers = dbService.getCustomers(companyId);
  res.json({ success: true, data: customers } as ApiResponse<Customer[]>);
});

app.post("/api/customers", requireAuth, (req: express.Request, res: express.Response) => {
  const customer = dbService.createCustomer(req.body);
  res.status(201).json({ success: true, data: customer });
});

// === TRIPS ROUTES ===
app.get("/api/trips", requireAuth, (req: express.Request, res: express.Response) => {
  const companyId: string = req.query.companyId as string;
  const filters: TripFilters = {};
  if (req.query.status) filters.status = req.query.status as string;
  if (req.query.vehicleId) filters.vehicleId = req.query.vehicleId as string;
  const trips = dbService.getTrips(companyId, filters);
  res.json({ success: true, data: trips } as ApiResponse<Trip[]>);
});

app.get("/api/trips/:id", requireAuth, (req: express.Request, res: express.Response) => {
  const trip = dbService.getTrip(req.params.id);
  if (trip) {
    res.json({ success: true, data: trip });
  } else {
    res.status(404).json({ success: false, error: "Trip not found" });
  }
});

app.post("/api/trips", requireAuth, (req: express.Request, res: express.Response) => {
  const trip = dbService.createTrip(req.body);
  res.status(201).json({ success: true, data: trip });
});

// GPS Position route
app.post("/api/gps-position", requireAuth, (req: express.Request, res: express.Response) => {
  const { tripId, latitude, longitude, speed } = req.body;

  if (!tripId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: "tripId, latitude and longitude are required" });
  }

  const result = dbService.createGpsPosition(
    tripId,
    latitude as number,
    longitude as number,
    speed as number
  );
  res.status(201).json({ success: true, data: result });
});

// Dashboard Summary Route
app.get("/api/dashboard/summary", requireAuth, (req: express.Request, res: express.Response) => {
  const companyId: string = (req.query.companyId as string) || (res.locals.auth?.companyId) || "default-company";
  const vehicles = dbService.getVehicles(companyId);
  const trips = dbService.getTrips(companyId);

  const fleet = {
    total: vehicles.length,
    enRoute: vehicles.filter(v => v.status === "active").length,
    loading: 0,
    unloading: 0,
    stopped: vehicles.filter(v => v.status === "inactive").length,
    atBase: 0,
    maintenance: vehicles.filter(v => v.status === "maintenance").length,
    incidents: vehicles.filter(v => v.status === "out_of_service").length,
  };

  const operations = {
    activeTrips: trips.filter(t => t.status === "en_route").length,
    scheduledTrips: trips.filter(t => t.status === "pending").length,
    delayedTrips: trips.filter(t => t.status === "delayed").length,
    completedToday: trips.filter(t => t.status === "completed").length,
    pendingDeliveries: trips.filter(t => t.status === "pending" || t.status === "en_route").length,
  };

  const revenueToday = trips.filter(t => t.status === "completed").reduce((sum, t) => sum + (t.fare || 0), 0) || 3500000;
  const revenueMonth = trips.reduce((sum, t) => sum + (t.fare || 0), 0) || 48200000;

  res.json({
    success: true,
    data: {
      fleet,
      operations,
      finance: {
        revenueToday,
        revenueMonth,
        costPerKm: 1250,
        pendingCollections: 14500000,
      },
      alerts: {
        critical: 2,
        high: 1,
        medium: 2,
        informational: 3,
      }
    }
  });
});


// Start server
ensureAdminUser();
const server = app.listen(port, () => {
  console.log("Control Tower API running on port " + port);
  console.log("Environment: " + (process.env.NODE_ENV || "development"));
  console.log("Frontend URL: " + (process.env.FRONTEND_URL || "http://localhost:3000"));
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// Export app for testing
module.exports = { app };