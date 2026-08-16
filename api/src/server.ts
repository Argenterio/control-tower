// Server.ts - Backend API para Control Tower
// Based on prompt maestro: SaaS Platform for Cargo Transportation Companies
// TypeScript with strong types - no 'any' as error hiding mechanism

import "dotenv/config";
import express from "express";
import cors from "cors";
import { dbService, rawDb } from "./database";
import type { DatabaseService } from "./database";
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
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: "10kb" }));

// Health check - returns typed response
app.get("/health", (req: express.Request, res: express.Response) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

// === COMPANIES ROUTES ===
// GET /api/companies
app.get("/api/companies", (req: express.Request, res: express.Response) => {
  const companies = dbService.getCompanies();
  res.json({ success: true, data: companies } as ApiResponse<Company[]>);
});

// GET /api/companies/:id
app.get("/api/companies/:id", (req: express.Request, res: express.Response) => {
  const company = dbService.getCompany(req.params.id);
  if (company) {
    res.json({ success: true, data: company });
  } else {
    res.status(404).json({ success: false, error: "Company not found" });
  }
});

// POST /api/companies
app.post("/api/companies", (req: express.Request, res: express.Response) => {
  const company = dbService.createCompany(req.body);
  res.status(201).json({ success: true, data: company });
});

// PUT /api/companies/:id
app.put("/api/companies/:id", (req: express.Request, res: express.Response) => {
  const company = dbService.updateCompany(req.params.id, req.body);
  if (company) {
    res.json({ success: true, data: company });
  } else {
    res.status(404).json({ success: false, error: "Company not found" });
  }
});

// === USERS ROUTES ===
app.get("/api/users", (req: express.Request, res: express.Response) => {
  const companyId: string = req.query.companyId as string;
  const users = dbService.getUsers(companyId);
  res.json({ success: true, data: users } as ApiResponse<User[]>);
});

app.get("/api/users/:id", (req: express.Request, res: express.Response) => {
  const user = dbService.getUser(req.params.id);
  if (user) {
    res.json({ success: true, data: user });
  } else {
    res.status(404).json({ success: false, error: "User not found" });
  }
});

app.post("/api/users", (req: express.Request, res: express.Response) => {
  const user = dbService.createUser(req.body);
  res.status(201).json({ success: true, data: user });
});

// === VEHICLES ROUTES ===
app.get("/api/vehicles", (req: express.Request, res: express.Response) => {
  const companyId: string = req.query.companyId as string;
  const vehicles = dbService.getVehicles(companyId);
  res.json({ success: true, data: vehicles } as ApiResponse<Vehicle[]>);
});

app.get("/api/vehicles/:id", (req: express.Request, res: express.Response) => {
  const vehicle = dbService.getVehicle(req.params.id);
  if (vehicle) {
    res.json({ success: true, data: vehicle });
  } else {
    res.status(404).json({ success: false, error: "Vehicle not found" });
  }
});

app.post("/api/vehicles", (req: express.Request, res: express.Response) => {
  const vehicle = dbService.createVehicle(req.body);
  res.status(201).json({ success: true, data: vehicle });
});

// === DRIVERS ROUTES ===
app.get("/api/drivers", (req: express.Request, res: express.Response) => {
  const companyId: string = req.query.companyId as string;
  const drivers = dbService.getDrivers(companyId);
  res.json({ success: true, data: drivers } as ApiResponse<Driver[]>);
});

app.get("/api/drivers/:id", (req: express.Request, res: express.Response) => {
  const driver = dbService.getDriver(req.params.id);
  if (driver) {
    res.json({ success: true, data: driver });
  } else {
    res.status(404).json({ success: false, error: "Driver not found" });
  }
});

app.post("/api/drivers", (req: express.Request, res: express.Response) => {
  const driver = dbService.createDriver(req.body);
  res.status(201).json({ success: true, data: driver });
});

// === CUSTOMERS ROUTES ===
app.get("/api/customers", (req: express.Request, res: express.Response) => {
  const companyId: string = req.query.companyId as string;
  const customers = dbService.getCustomers(companyId);
  res.json({ success: true, data: customers } as ApiResponse<Customer[]>);
});

app.post("/api/customers", (req: express.Request, res: express.Response) => {
  const customer = dbService.createCustomer(req.body);
  res.status(201).json({ success: true, data: customer });
});

// === TRIPS ROUTES ===
app.get("/api/trips", (req: express.Request, res: express.Response) => {
  const companyId: string = req.query.companyId as string;
  const filters: TripFilters = {};
  if (req.query.status) filters.status = req.query.status as string;
  if (req.query.vehicleId) filters.vehicleId = req.query.vehicleId as string;
  const trips = dbService.getTrips(companyId, filters);
  res.json({ success: true, data: trips } as ApiResponse<Trip[]>);
});

app.get("/api/trips/:id", (req: express.Request, res: express.Response) => {
  const trip = dbService.getTrip(req.params.id);
  if (trip) {
    res.json({ success: true, data: trip });
  } else {
    res.status(404).json({ success: false, error: "Trip not found" });
  }
});

app.post("/api/trips", (req: express.Request, res: express.Response) => {
  const trip = dbService.createTrip(req.body);
  res.status(201).json({ success: true, data: trip });
});

// GPS Position route
app.post("/api/gps-position", (req: express.Request, res: express.Response) => {
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

// ETA calculation route
app.post("/api/calculate-eta", (req: express.Request, res: express.Response) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ success: false, error: "origin and destination are required" });
  }

  const result = dbService.calculateETA(
    origin as string,
    destination as string,
    req.body.currentLocation as { latitude: number; longitude: number },
    req.body.speed as number
  );
  res.json({ success: true, data: result });
});

// Start server
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