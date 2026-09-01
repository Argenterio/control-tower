// Server.ts - Backend API para Control Tower
// Based on prompt maestro: SaaS Platform for Cargo Transportation Companies
// TypeScript with strong types - no 'any' as error hiding mechanism

import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import { dbService, rawDb } from "./database";
import type { DatabaseService } from "./database";
import {
  signToken,
  requireAuth,
  requireRole,
  requireCompanyAccess,
  requireAuthAndCompany,
  WRITE_ROLES,
  OPERATOR_WRITE_ROLES,
  ensureAdminUser,
  verifyPassword,
  type AuthPayload,
} from "./auth";
import { seedDemoData } from "./seed";
import { processIncomingWhatsappMessage } from "./whatsapp";
import { askFleetAssistant, summarizeOperation } from "./ai";
import { publicAIConfig, config } from "./config/env";
import { signupCompany, OnboardingError } from "./onboarding";
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
  ApiResponse,
  WhatsappIncomingPayload,
  WhatsappProcessResult
} from "./types";

// Initialize express
const app = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// ============================================================================
// CORS — whitelist configurable vía CORS_ORIGINS (separado por comas)
// En desarrollo, si CORS_ORIGINS está vacío, se permiten los orígenes comunes
// de localhost. En producción, se REQUIERE configurar CORS_ORIGINS.
// ============================================================================
function buildCorsOrigin(): string | string[] | boolean {
  const allowed = (process.env.CORS_ORIGINS || "").trim();
  const isProd = (process.env.NODE_ENV || "development").toLowerCase() === "production";

  if (!allowed) {
    if (isProd) {
      console.warn("[cors] ⚠️  CORS_ORIGINS no configurado en producción. Sólo same-origin.");
      return false; // same-origin only
    }
    // Dev: localhost comunes
    return ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"];
  }

  const list = allowed.split(",").map(s => s.trim()).filter(Boolean);
  if (list.length === 1) return list[0];
  return list;
}

app.use(cors({
  origin: buildCorsOrigin(),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Servir media descargado localmente (evidencia de WhatsApp: imágenes, audios, documentos)
// Las URLs firmadas de Evolution API expiran, por eso el backend las descarga y las sirve desde acá.
const MEDIA_DIRS = [
  process.env.UPLOAD_DIR,
  path.join(process.cwd(), "public", "uploads", "media"),
  path.join(process.cwd(), "uploads", "media"),
  path.join(process.cwd(), "uploads"),
  "/data/uploads/media"
].filter(Boolean) as string[];

// Compatibilidad hacia atrás: archivos legacy encriptados (.enc) sin extensión real.
// Si llegan al endpoint y existe un duplicado con extensión real (.jpg/.ogg/...), respondemos ese.
// Si NO existe un equivalente real, devolvemos 404 para que el frontend muestre el fallback limpio
// (en vez de servir bytes encriptados que el browser no puede renderizar como imagen).
function findRealMediaPath(file: string): { path: string | null; contentType: string; isLegacyEnc: boolean } {
  const lower = file.toLowerCase();

  // 1) Si el cliente pide un archivo .enc, NO lo servimos directamente: son bytes encriptados
  //    que ningún <img> / <audio> / <video> puede renderizar. Buscamos la versión real.
  if (lower.endsWith(".enc")) {
    const baseId = file.slice(0, -4); // sin ".enc"
    const candidates = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".ogg", ".mp3", ".m4a", ".wav", ".amr", ".pdf", ".mp4", ".webm"];
    for (const dir of MEDIA_DIRS) {
      for (const ext of candidates) {
        const alt = path.join(dir, baseId + ext);
        if (fs.existsSync(alt)) {
          const ct = (mime.lookup(ext) || "application/octet-stream") as string;
          console.warn(`[media] Compatibilidad: ${file} → servido como ${baseId + ext} (${ct})`);
          return { path: alt, contentType: ct, isLegacyEnc: true };
        }
      }
    }
    // No hay equivalente real → 404 (no servir bytes encriptados)
    return { path: null, contentType: "application/octet-stream", isLegacyEnc: true };
  }

  // 2) Cualquier otro archivo con extensión real se sirve tal cual.
  for (const dir of MEDIA_DIRS) {
    const candidate = path.join(dir, file);
    if (fs.existsSync(candidate)) {
      const ext = path.extname(file).toLowerCase();
      const ct = (ext && mime.lookup(ext)) || mime.lookup(file) || "application/octet-stream";
      return { path: candidate, contentType: ct as string, isLegacyEnc: false };
    }
  }

  return { path: null, contentType: "application/octet-stream", isLegacyEnc: false };
}

app.get("/api/media/:file", (req: express.Request, res: express.Response) => {
  const file = req.params.file || "";
  // Prevenir path traversal
  if (!/^[a-zA-Z0-9._-]+$/.test(file)) {
    res.status(400).json({ error: "Nombre de archivo inválido" });
    return;
  }

  const { path: foundPath, contentType, isLegacyEnc } = findRealMediaPath(file);

  if (!foundPath) {
    res.status(404).json({ error: "Media no encontrado", file });
    return;
  }

  const stat = fs.statSync(foundPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  if (isLegacyEnc) res.setHeader("X-Media-Compat", "true");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const stream = fs.createReadStream(foundPath, { start, end });
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": contentType,
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Accept-Ranges": "bytes",
      "Content-Type": contentType,
    });
    fs.createReadStream(foundPath).pipe(res);
  }
});


// Health check - returns typed response
app.get("/health", (req: express.Request, res: express.Response) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

// Health check de IA — expone SOLO configuración segura (sin API keys).
app.get("/health/ai", (_req: express.Request, res: express.Response) => {
  res.json({ success: true, data: publicAIConfig() });
});

// POST /api/leads - Public lead capture endpoint from landing page
app.post("/api/leads", (req: express.Request, res: express.Response) => {
  const { name, companyName, fleetSize, phone, email, planRequested } = req.body || {};
  if (!name || !companyName || !phone) {
    res.status(400).json({ success: false, error: "Nombre, empresa y teléfono son requeridos." });
    return;
  }
  try {
    const lead = dbService.createLead({ name, companyName, fleetSize: fleetSize || "10-25", phone, email, planRequested });
    res.json({ success: true, data: lead, message: "¡Cotización solicitada con éxito! Un especialista logístico se contactará con vos en menos de 2 horas." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Error al registrar solicitud" });
  }
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

// POST /api/auth/demo-login - acceso libre a una demo interactiva pre-cargada para prospectos
app.post("/api/auth/demo-login", (req: express.Request, res: express.Response) => {
  const adminUser = dbService.getUserByEmail("admin@controltower.com");
  if (!adminUser) {
    res.status(404).json({ success: false, error: "Demo user not found" });
    return;
  }
  const token = signToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role, companyId: adminUser.companyId });
  res.json({
    success: true,
    data: {
      token,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        companyId: adminUser.companyId
      }
    }
  });
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
// SECURITY: cualquier usuario autenticado sólo puede ver/editar SU propia empresa.
app.get("/api/companies", requireAuth, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const company = dbService.getCompany(companyId);
  res.json({ success: true, data: company ? [company] : [] } as ApiResponse<Company[]>);
});

// GET /api/companies/:id — sólo permite ver la propia
app.get("/api/companies/:id", requireAuth, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  if (req.params.id !== companyId) {
    res.status(403).json({ success: false, error: "Acceso denegado a empresa" });
    return;
  }
  const company = dbService.getCompany(req.params.id);
  if (company) {
    res.json({ success: true, data: company });
  } else {
    res.status(404).json({ success: false, error: "Company not found" });
  }
});

// POST /api/companies — deshabilitado en runtime; el alta de empresa se hace vía
// /api/onboarding/signup (público). Mantener por compatibilidad pero requiere rol
// admin global (no hay superadmin en el sistema multi-tenant).
app.post("/api/companies", requireAuth, requireRole("admin"), (req: express.Request, res: express.Response) => {
  res.status(403).json({ success: false, error: "El alta de empresas se realiza vía /api/onboarding/signup" });
});

// PUT /api/companies/:id — sólo permite editar la propia empresa del token
app.put("/api/companies/:id", requireAuth, requireRole(...WRITE_ROLES), (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  if (req.params.id !== companyId) {
    res.status(403).json({ success: false, error: "Acceso denegado a empresa" });
    return;
  }
  const company = dbService.updateCompany(req.params.id, req.body);
  if (company) {
    res.json({ success: true, data: company });
  } else {
    res.status(404).json({ success: false, error: "Company not found" });
  }
});

// === USERS ROUTES ===
// SECURITY: los usuarios sólo se listan/crean dentro de la propia empresa del token.
app.get("/api/users", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const users = dbService.getUsers(companyId);
  res.json({ success: true, data: users } as ApiResponse<User[]>);
});

app.get("/api/users/:id", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const user = dbService.getUser(req.params.id);
  if (!user) {
    res.status(404).json({ success: false, error: "Usuario no encontrado" });
    return;
  }
  if (user.companyId !== companyId) {
    res.status(404).json({ success: false, error: "Usuario no encontrado" });
    return;
  }
  res.json({ success: true, data: user });
});

app.post("/api/users", requireAuth, requireRole(...WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  // Forzar companyId del token, no del body
  const user = dbService.createUser({ ...req.body, companyId });
  res.status(201).json({ success: true, data: user });
});

// === VEHICLES ROUTES ===
app.get("/api/vehicles", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const vehicles = dbService.getVehicles(companyId);
  res.json({ success: true, data: vehicles } as ApiResponse<Vehicle[]>);
});

app.get("/api/vehicles/:id", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const vehicle = dbService.getVehicle(req.params.id);
  if (!vehicle) {
    res.status(404).json({ success: false, error: "Vehicle not found" });
    return;
  }
  if (vehicle.companyId !== companyId) {
    res.status(404).json({ success: false, error: "Vehicle not found" });
    return;
  }
  res.json({ success: true, data: vehicle });
});

app.post("/api/vehicles", requireAuth, requireRole(...WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const vehicle = dbService.createVehicle({ ...req.body, companyId });
  res.status(201).json({ success: true, data: vehicle });
});

// === DRIVERS ROUTES ===
app.get("/api/drivers", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const drivers = dbService.getDrivers(companyId);
  res.json({ success: true, data: drivers } as ApiResponse<Driver[]>);
});

app.get("/api/drivers/:id", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const driver = dbService.getDriver(req.params.id);
  if (!driver) {
    res.status(404).json({ success: false, error: "Driver not found" });
    return;
  }
  if (driver.companyId !== companyId) {
    res.status(404).json({ success: false, error: "Driver not found" });
    return;
  }
  res.json({ success: true, data: driver });
});

app.post("/api/drivers", requireAuth, requireRole(...WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const driver = dbService.createDriver({ ...req.body, companyId });
  res.status(201).json({ success: true, data: driver });
});

app.put("/api/drivers/:id", requireAuth, requireRole(...WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const driver = dbService.getDriver(req.params.id);
  if (!driver || driver.companyId !== companyId) {
    res.status(404).json({ success: false, error: "Driver not found" });
    return;
  }
  const updated = dbService.updateDriver(req.params.id, req.body);
  if (updated) {
    res.json({ success: true, data: updated });
  } else {
    res.status(404).json({ success: false, error: "Driver not found" });
  }
});

// === LEADS ROUTES (Landing Page Quotes) ===
app.get("/api/leads", requireAuth, requireRole("admin", "manager"), (req: express.Request, res: express.Response) => {
  try {
    const leads = dbService.getLeads();
    res.json({ success: true, data: leads });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/customers", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const customers = dbService.getCustomers(companyId);
  res.json({ success: true, data: customers } as ApiResponse<Customer[]>);
});

app.post("/api/customers", requireAuth, requireRole(...WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const customer = dbService.createCustomer({ ...req.body, companyId });
  res.status(201).json({ success: true, data: customer });
});

// === TRIPS ROUTES ===
app.get("/api/trips", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const filters: TripFilters = {};
  if (req.query.status) filters.status = req.query.status as string;
  if (req.query.vehicleId) filters.vehicleId = req.query.vehicleId as string;
  const trips = dbService.getTrips(companyId, filters);
  res.json({ success: true, data: trips } as ApiResponse<Trip[]>);
});

app.get("/api/trips/:id", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const trip = dbService.getTrip(req.params.id);
  if (!trip) {
    res.status(404).json({ success: false, error: "Trip not found" });
    return;
  }
  if (trip.companyId !== companyId) {
    res.status(404).json({ success: false, error: "Trip not found" });
    return;
  }
  res.json({ success: true, data: trip });
});

app.post("/api/trips", requireAuth, requireRole(...OPERATOR_WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const trip = dbService.createTrip({ ...req.body, companyId });
  res.status(201).json({ success: true, data: trip });
});

// === MAINTENANCE ROUTES ===
app.get("/api/maintenance", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const records = dbService.getMaintenance(companyId);
  res.json({ success: true, data: records });
});

app.post("/api/maintenance", requireAuth, requireRole(...OPERATOR_WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const record = dbService.createMaintenance({ ...req.body, companyId });
  res.status(201).json({ success: true, data: record, message: "Orden de mantenimiento registrada" });
});

app.put("/api/maintenance/:id", requireAuth, requireRole(...OPERATOR_WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const updated = dbService.updateMaintenance(req.params.id, req.body);
  if (updated) {
    res.json({ success: true, data: updated, message: "Orden actualizada" });
  } else {
    res.status(404).json({ success: false, error: "Orden no encontrada" });
  }
});

// === DOCUMENTS ROUTES ===
app.get("/api/documents", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const docs = dbService.getDocuments(companyId);
  res.json({ success: true, data: docs });
});

app.post("/api/documents", requireAuth, requireRole(...OPERATOR_WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const doc = dbService.createDocument({ ...req.body, companyId });
  res.status(201).json({ success: true, data: doc, message: "Documento cargado correctamente" });
});

// === FUEL ROUTES ===
app.get("/api/fuel", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const entries = dbService.getFuelEntries(companyId);
  res.json({ success: true, data: entries });
});

app.post("/api/fuel", requireAuth, requireRole(...OPERATOR_WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const entry = dbService.createFuelEntry({ ...req.body, companyId });
  res.status(201).json({ success: true, data: entry, message: "Ticket de combustible registrado" });
});

// === AI COPILOT ROUTE ===
app.post("/api/ai/chat", requireAuth, requireCompanyAccess, async (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const question = req.body.question || req.body.message;

  if (!question) {
    return res.status(400).json({ success: false, error: "Pregunta o mensaje es requerido" });
  }

  try {
    const result = await askFleetAssistant(companyId, question);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Error al consultar al copiloto IA" });
  }
});

// GPS Position route
app.post("/api/gps-position", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const { tripId, latitude, longitude, speed } = req.body;

  if (!tripId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: "tripId, latitude and longitude are required" });
  }

  const companyId = res.locals.companyId as string;
  const trip = dbService.getTrip(tripId);
  if (!trip || trip.companyId !== companyId) {
    res.status(404).json({ success: false, error: "Trip not found" });
    return;
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
app.get("/api/dashboard/summary", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
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

// === COMPANY SETTINGS ===
app.get("/api/company-settings", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  try {
    const settings = dbService.getCompanySettings(companyId);
    res.json({ success: true, data: settings || {
      companyId,
      timezone: "America/Argentina/Buenos_Aires",
      dateFormat: "DD/MM/YYYY",
      currency: "ARS",
      whatsappNumber: config.whatsapp.botPhone,
      gpsProvider: "geotab",
    }});
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/company-settings", requireAuth, requireRole(...WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  try {
    dbService.upsertCompanySettings(companyId, req.body);
    const settings = dbService.getCompanySettings(companyId);
    res.json({ success: true, data: settings, message: "Configuración guardada" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// === WHATSAPP BOT & WEBHOOK ROUTES ===

// POST /api/whatsapp/incoming - Webhook receptor de mensajes desde n8n / Evolution API
app.post("/api/whatsapp/incoming", async (req: express.Request, res: express.Response) => {
  try {
    const webhookSecret = config.whatsapp.webhookSecret;
    const providedSecret = req.headers["x-webhook-secret"] as string;

    // Validación opcional de secreto si está configurado en env
    if (webhookSecret && providedSecret !== webhookSecret) {
      return res.status(401).json({ success: false, error: "Token de webhook no autorizado" });
    }

    const payload = req.body as WhatsappIncomingPayload;
    if (!payload.phone) {
      return res.status(400).json({ success: false, error: "El campo 'phone' es requerido" });
    }

    // Log diagnóstico: ver qué campos envía n8n realmente
    console.log(`[webhook] phone=${payload.phone} messageType=${payload.messageType} mediaUrl=${payload.mediaUrl ? payload.mediaUrl.substring(0, 80) + "..." : "MISSING"} fromMe=${payload.fromMe} messageId=${payload.messageId || "MISSING"}`);

    const result = await processIncomingWhatsappMessage(payload);
    res.json({
      success: true,
      data: result,
      responseMessage: result.interpretation.responseMessage
    });
  } catch (error) {
    console.error("Error procesando webhook de WhatsApp:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error interno al procesar mensaje"
    });
  }
});

// GET /api/whatsapp/messages - Historial de mensajes de WhatsApp de la empresa
app.get("/api/whatsapp/messages", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const messages = dbService.getWhatsappMessages(companyId, limit);
  res.json({ success: true, data: messages });
});

// GET /api/whatsapp/status - Estado del canal de WhatsApp
app.get("/api/whatsapp/status", requireAuth, (req: express.Request, res: express.Response) => {
  const companyId = (res.locals.auth as AuthPayload | undefined)?.companyId || "default-company";
  res.json({
    success: true,
    data: {
      status: "online",
      botPhone: config.whatsapp.botPhone,
      n8nUrl: "https://manager.generarise.space",
      evolutionUrl: "https://trafic.generarise.space/manager",
      apiUrl: "https://api.generarise.space/api/whatsapp/incoming",
      activeCompanyId: companyId,
      supportedTypes: ["text", "image", "location", "document"],
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/whatsapp/send - Enviar mensaje manual a un chofer vía Evolution API
app.post("/api/whatsapp/send", requireAuth, requireCompanyAccess, async (req: express.Request, res: express.Response) => {
  try {
    const { phone, message, instanceName, driverId, tripId } = req.body;
    const companyId = res.locals.companyId as string;

    if (!phone || !message) {
      return res.status(400).json({ success: false, error: "Los campos 'phone' y 'message' son requeridos" });
    }

    // Si se indica driverId, validar que pertenece a la empresa del token
    if (driverId) {
      const driver = dbService.getDriver(driverId);
      if (!driver || driver.companyId !== companyId) {
        res.status(404).json({ success: false, error: "Driver not found" });
        return;
      }
    }
    // Si se indica tripId, validar pertenencia
    if (tripId) {
      const trip = dbService.getTrip(tripId);
      if (!trip || trip.companyId !== companyId) {
        res.status(404).json({ success: false, error: "Trip not found" });
        return;
      }
    }

    // Normalizar teléfono (solo números) y asegurar instancia en minúsculas
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const instance = (instanceName || config.whatsapp.evolutionInstance || "control-tower").toLowerCase();
    const evolutionBaseUrl = (config.whatsapp.evolutionApiUrl || "https://trafic.generarise.space").replace(/\/+$/, "");
    const evolutionApiKey = config.whatsapp.evolutionApiKey || "";

    // 1. Enviar mensaje a Evolution API v2 (formato simplificado con "text")
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response: Response;
    try {
      response = await fetch(`${evolutionBaseUrl}/message/sendText/${instance}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(evolutionApiKey ? { "apikey": evolutionApiKey } : {})
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: message
        }),
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const msg = fetchErr.name === "AbortError" ? "Evolution API no responde (timeout 10s)" : `Error de conexión con Evolution API: ${fetchErr.message}`;
      console.error(`[whatsapp-send] fetch failed:`, msg);
      res.status(400).json({ success: false, error: msg });
      return;
    }
    clearTimeout(timeout);

    const responseData: any = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg = responseData?.response?.message?.[0] || responseData?.message || responseData?.error?.message || `Evolution API respondió con status ${response.status}`;
      console.error(`[whatsapp-send] Evolution API error ${response.status}:`, errMsg);
      res.status(400).json({
        success: false,
        error: `Error al enviar mensaje vía WhatsApp: ${errMsg}`
      });
      return;
    }

    // 2. Guardar mensaje saliente en la base de datos para auditoría
    dbService.createWhatsappMessage({
      companyId,
      driverId,
      phone: cleanPhone,
      direction: "outgoing",
      messageType: "text",
      content: message,
      tripId,
      processed: true,
      rawPayload: JSON.stringify(responseData),
      responseMessage: message
    });

    res.json({
      success: true,
      message: "Mensaje enviado al WhatsApp del chofer",
      data: responseData
    });
  } catch (error) {
    console.error("Error al enviar WhatsApp manual:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error al enviar mensaje vía Evolution API"
    });
  }
});

// POST /api/whatsapp/simulate - Endpoint para simular mensaje de chofer desde el Frontend
app.post("/api/whatsapp/simulate", requireAuth, requireCompanyAccess, async (req: express.Request, res: express.Response) => {
  try {
    const { phone, message, messageType, mediaUrl, latitude, longitude, pushName } = req.body;
    // SECURITY: companyId SIEMPRE del token, NO del body.
    const companyId = res.locals.companyId as string;
    const payload: WhatsappIncomingPayload = {
      phone: phone || "+54 9 11 4455-1122",
      message: message || "Salí hacia Córdoba",
      messageType: messageType || (mediaUrl ? "image" : "text"),
      mediaUrl: mediaUrl || undefined,
      pushName: pushName || undefined,
      companyId,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
      rawPayload: JSON.stringify({
        simulated: true,
        mediaUrl: mediaUrl || undefined,
        messageType: messageType || undefined,
        timestamp: new Date().toISOString()
      })
    };

    const result = await processIncomingWhatsappMessage(payload);
    res.json({
      success: true,
      data: result,
      responseMessage: result.interpretation.responseMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error al simular mensaje"
    });
  }
});


// =====================================================
// CONTROL TOWER 360 — ENDPOINTS NUEVOS (FASE 1)
// =====================================================

// POST /api/onboarding/signup - Alta pública de empresa + admin inicial.
// SECURITY: este endpoint es PÚBLICO (no requireAuth). Rate-limit debe
// configurarse en proxy reverso / WAF en producción.
app.post("/api/onboarding/signup", async (req: express.Request, res: express.Response) => {
  try {
    const result = await signupCompany(req.body || {});
    res.status(201).json({
      success: true,
      data: {
        company: result.company,
        admin: result.admin,
        token: result.token
      },
      message: "Empresa y administrador creados con éxito"
    });
  } catch (err) {
    if (err instanceof OnboardingError) {
      const status = err.code === "duplicate_email" ? 409 : 400;
      res.status(status).json({ success: false, error: err.message, code: err.code });
      return;
    }
    console.error("[onboarding] error:", err);
    res.status(500).json({ success: false, error: "Error al crear la empresa" });
  }
});

// GET /api/operation/summary - Resumen IA de la torre (totales + requiere atención + narrativa)
app.get("/api/operation/summary", requireAuth, requireCompanyAccess, async (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  try {
    const summary = await summarizeOperation(companyId);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/operational-alerts - Bandeja de alertas priorizadas
app.get("/api/operational-alerts", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const level = req.query.level as string | undefined;
  const status = (req.query.status as string) || "open";
  const tripId = req.query.tripId as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

  const alerts = dbService.getOperationalAlerts(companyId, { level, status, tripId, limit });

  // Enriquecer con nombre de chofer y patente
  const enriched = alerts.map(a => {
    const driver = a.driverId ? dbService.getDriver(a.driverId) : null;
    const trip = a.tripId ? dbService.getTrip(a.tripId) : null;
    return {
      ...a,
      driverName: driver?.fullName,
      driverPhone: driver?.phone,
      tripOrigin: trip?.origin,
      tripDestination: trip?.destination
    };
  });

  res.json({ success: true, data: enriched });
});

// PATCH /api/operational-alerts/:id - Actualizar estado de alerta
app.patch("/api/operational-alerts/:id", requireAuth, requireRole(...OPERATOR_WRITE_ROLES), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { status } = req.body as { status?: "open" | "acknowledged" | "resolved" | "dismissed" };
  const auth = res.locals.auth as AuthPayload;
  if (!status) {
    res.status(400).json({ success: false, error: "status requerido" });
    return;
  }
  const updated = dbService.updateOperationalAlertStatus(id, status, auth?.sub);
  if (!updated) {
    res.status(404).json({ success: false, error: "Alerta no encontrada" });
    return;
  }
  res.json({ success: true, data: updated });
});

// GET /api/operational-events - Eventos operacionales crudos
app.get("/api/operational-events", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const tripId = req.query.tripId as string | undefined;
  const priority = req.query.priority as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;
  const events = dbService.getOperationalEvents(companyId, { tripId, priority, limit });
  res.json({ success: true, data: events });
});

// GET /api/trip-evidence - Evidencias del viaje (audios, fotos, docs, ubicaciones)
app.get("/api/trip-evidence", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const tripId = req.query.tripId as string | undefined;
  const kind = req.query.kind as string | undefined;
  const driverId = req.query.driverId as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;
  const evidence = dbService.getTripEvidence(companyId, { tripId, kind, driverId, limit });
  res.json({ success: true, data: evidence });
});

// GET /api/trips/:id/timeline - Línea de tiempo completa del viaje
app.get("/api/trips/:id/timeline", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const data = dbService.getTripTimeline(companyId, req.params.id);
  res.json({ success: true, data });
});

// POST /api/operation/dedupe - Limpia duplicados existentes en whatsapp_messages
// Estrategia: para cada (companyId, messageId) con duplicados, deja solo el más reciente
// y borra el resto. Si NO hay messageId, borra duplicados que tengan el mismo (phone, content, createdAt-truncado-a-segundo).
app.post("/api/operation/dedupe", requireAuth, requireRole("admin"), requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  try {
    const beforeCount = (dbService.getWhatsappMessages(companyId, 100000) as unknown as { length: number }).length;

    // 1. Borrar duplicados por (companyId, messageId) dejando el más reciente
    rawDb.exec(`
      DELETE FROM whatsapp_messages
      WHERE companyId = '${companyId}'
        AND messageId IS NOT NULL
        AND messageId != ''
        AND id NOT IN (
          SELECT MAX(id) FROM whatsapp_messages
          WHERE companyId = '${companyId}' AND messageId IS NOT NULL AND messageId != ''
          GROUP BY companyId, messageId
        )
    `);

    // 2. Borrar duplicados "huérfanos" (sin messageId) por phone+contenido+minuto
    rawDb.exec(`
      DELETE FROM whatsapp_messages
      WHERE companyId = '${companyId}'
        AND (messageId IS NULL OR messageId = '')
        AND id NOT IN (
          SELECT MAX(id) FROM whatsapp_messages
          WHERE companyId = '${companyId}' AND (messageId IS NULL OR messageId = '')
          GROUP BY phone, COALESCE(content, ''), substr(createdAt, 1, 16)
        )
    `);

    // 3. Crear el índice único para evitar futuros duplicados
    try {
      rawDb.exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_company_msgid ON whatsapp_messages(companyId, messageId) WHERE messageId IS NOT NULL AND messageId != ''`);
    } catch (e) {
      console.warn("[dedupe] No se pudo crear unique index:", (e as Error).message);
    }

    const afterCount = (dbService.getWhatsappMessages(companyId, 100000) as unknown as { length: number }).length;
    res.json({
      success: true,
      data: {
        companyId,
        beforeCount,
        afterCount,
        removed: beforeCount - afterCount
      },
      message: `Se eliminaron ${beforeCount - afterCount} mensajes duplicados.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});
app.get("/api/operation/inbox", requireAuth, requireCompanyAccess, (req: express.Request, res: express.Response) => {
  const companyId = res.locals.companyId as string;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;

  const messages = dbService.getWhatsappMessages(companyId, limit);
  const enriched = messages.map(m => {
    const driver = m.driverId ? dbService.getDriver(m.driverId) : null;
    const trip = m.tripId ? dbService.getTrip(m.tripId) : null;
    const vehicle = driver?.vehicleId ? dbService.getVehicle(driver.vehicleId) : null;
    let parsedMetadata: Record<string, unknown> | null = null;
    if (m.rawPayload) {
      try { parsedMetadata = JSON.parse(m.rawPayload); } catch { /* ignore */ }
    }
    return {
      id: m.id,
      createdAt: m.createdAt,
      phone: m.phone,
      direction: m.direction,
      messageType: m.messageType,
      content: m.content,
      mediaUrl: m.mediaUrl,
      interpretedAction: m.interpretedAction,
      interpretedConfidence: m.interpretedConfidence,
      processed: !!m.processed,
      responseMessage: m.responseMessage,
      driver: driver ? { id: driver.id, fullName: driver.fullName, phone: driver.phone, dni: driver.dni } : null,
      vehicle: vehicle ? { id: vehicle.id, licensePlate: vehicle.licensePlate } : null,
      trip: trip ? {
        id: trip.id,
        origin: trip.origin,
        destination: trip.destination,
        status: trip.status,
        estimatedArrival: trip.estimatedArrival
      } : null,
      pushName: (parsedMetadata?.pushName as string | undefined) || undefined,
      messageId: (parsedMetadata?.messageId as string | undefined) || undefined
    };
  });

  res.json({ success: true, data: enriched });
});


// Start server
ensureAdminUser();
seedDemoData();
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
