// Script de Seed con datos hiper-realistas para demostración comercial
// Empresa: Transportes Pampeana S.A.
// Rutas: Principales corredores de logística terrestre de Argentina (RN9, RN7, RN14, RN3, RN34)

import { rawDb } from "./database";
import { hashPassword } from "./auth";

export function seedDemoData() {
  console.log("🚚 Iniciando verificación / carga de datos demo para Control Tower...");
  const companyId = "default-company";

  // 1. Asegurar Empresa Principal
  try {
    rawDb.prepare(`
      INSERT OR REPLACE INTO companies (id, name, ruci, email, phone, address, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      companyId,
      "Transportes Pampeana S.A.",
      "30-71234567-8",
      "operaciones@transportespampeana.com.ar",
      "+54 9 11 4820-9900",
      "Ruta Panamericana Km 52.5, Campana, Buenos Aires",
      "active"
    );
    console.log("✅ Empresa configurada: Transportes Pampeana S.A.");
  } catch (err) {
    console.error("Error al configurar empresa:", err);
  }

  // 2. Asegurar Usuarios
  try {
    rawDb.prepare(`
      INSERT OR REPLACE INTO users (id, name, email, password, role, status, companyId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      "usr-admin",
      "Gustavo (Director Operativo)",
      "admin@controltower.com",
      hashPassword("admin123"),
      "admin",
      "active",
      companyId
    );
    console.log("✅ Usuario Admin verificado: admin@controltower.com / admin123");
  } catch (err) {
    console.error("Error al configurar usuario:", err);
  }

  // 3. Clientes Principales Dadores de Carga
  const customers = [
    { id: "cust-01", name: "Arcor S.A.I.C.", taxId: "30-50279317-5", address: "Av. Fulvio Pagani 487, Arroyito, Córdoba", phone: "+54 3576 450000", email: "logistica@arcor.com" },
    { id: "cust-02", name: "Molinos Río de la Plata", taxId: "30-50085862-8", address: "Av. Uruguay 4075, Victoria, Buenos Aires", phone: "+54 11 4340-1100", email: "despachos@molinos.com.ar" },
    { id: "cust-03", name: "Cervecería y Maltería Quilmes", taxId: "30-50349487-2", address: "12 de Octubre y Gran Canaria, Quilmes", phone: "+54 11 4349-1000", email: "transporte@quilmes.com.ar" },
    { id: "cust-04", name: "Ternium Argentina (Siderar)", taxId: "30-50001038-6", address: "Av. Savio s/n, San Nicolás de los Arroyos", phone: "+54 336 438-0000", email: "logistica.acero@ternium.com" },
    { id: "cust-05", name: "Loma Negra C.I.A.S.A.", taxId: "30-50053085-1", address: "Planta Olavarría, Buenos Aires", phone: "+54 2284 49-5000", email: "cargas@lomanegra.com" },
    { id: "cust-06", name: "Mastellone Hnos (La Serenísima)", taxId: "30-50043187-0", address: "Almte. Brown 957, Gral. Rodríguez", phone: "+54 237 485-9000", email: "fletes.lacteos@laserenisima.com.ar" },
    { id: "cust-07", name: "Unilever de Argentina", taxId: "30-50111197-6", address: "Fraga 1163, CABA", phone: "+54 11 4789-5000", email: "centro.distribucion@unilever.com" },
    { id: "cust-08", name: "Aceitera General Deheza (AGD)", taxId: "30-50060086-7", address: "Ruta Nac. 158 Km 227, Gral. Deheza, Córdoba", phone: "+54 358 405-5555", email: "granos@agd.com.ar" },
  ];

  for (const c of customers) {
    rawDb.prepare(`
      INSERT OR REPLACE INTO customers (id, companyId, name, taxId, address, phone, email, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
    `).run(c.id, companyId, c.name, c.taxId, c.address, c.phone, c.email);
  }

  // 4. Camiones con Posiciones GPS en Corredores Logísticos Argentinos
  const vehicles = [
    { id: "veh-01", plate: "AF 342 KL", brand: "Scania", model: "R450 Highline 6x2", type: "truck", status: "active", km: 145200, lat: -33.6800, lng: -59.6600 }, // RN9 San Pedro
    { id: "veh-02", plate: "AE 819 BC", brand: "Mercedes-Benz", model: "Actros 2045 LS", type: "truck", status: "active", km: 219400, lat: -32.6500, lng: -62.3000 }, // RN9 Leones (Cba)
    { id: "veh-03", plate: "AG 105 OP", brand: "Iveco", model: "Stralis Hi-Way 460", type: "truck", status: "maintenance", km: 98500, lat: -31.4201, lng: -64.1888 }, // Córdoba Capital (Taller)
    { id: "veh-04", plate: "AD 990 ZZ", brand: "Volvo", model: "FH 500 I-Shift", type: "truck", status: "active", km: 315000, lat: -34.6037, lng: -58.3816 }, // CABA Puerto
    { id: "veh-05", plate: "AF 228 PQ", brand: "Scania", model: "G410 XT 4x2", type: "truck", status: "active", km: 178300, lat: -32.9468, lng: -60.6393 }, // Rosario Sur
    { id: "veh-06", plate: "AE 510 TR", brand: "Mercedes-Benz", model: "Axor 1933", type: "truck", status: "active", km: 285100, lat: -34.5800, lng: -60.9500 }, // RN7 Junín
    { id: "veh-07", plate: "AG 440 LM", brand: "Volvo", model: "FM 380 Globetrotter", type: "truck", status: "active", km: 112000, lat: -33.3000, lng: -58.5200 }, // RN14 Gualeguaychú
    { id: "veh-08", plate: "AF 670 BN", brand: "Scania", model: "R500 V8", type: "truck", status: "active", km: 134500, lat: -32.8908, lng: -68.8272 }, // Mendoza Terminal
    { id: "veh-09", plate: "AD 120 XC", brand: "Iveco", model: "Tector 17-280", type: "truck", status: "active", km: 340200, lat: -36.7800, lng: -59.8500 }, // RN3 Azul
    { id: "veh-10", plate: "AF 890 UI", brand: "Mercedes-Benz", model: "Actros 2651 6x4", type: "truck", status: "active", km: 165000, lat: -38.7183, lng: -62.2660 }, // Bahía Blanca
    { id: "veh-11", plate: "AE 330 JK", brand: "Volvo", model: "FH 460", type: "truck", status: "active", km: 245000, lat: -26.8241, lng: -65.2226 }, // Tucumán RN38
    { id: "veh-12", plate: "AG 712 WS", brand: "Scania", model: "R450 Super", type: "truck", status: "active", km: 82000, lat: -34.1600, lng: -58.9600 }, // Campana Base
    { id: "veh-13", plate: "AD 450 HH", brand: "Iveco", model: "Stralis Cursor 13", type: "truck", status: "inactive", km: 410000, lat: -34.1600, lng: -58.9600 }, // Campana Base
    { id: "veh-14", plate: "AF 560 PL", brand: "Mercedes-Benz", model: "Atego 1726", type: "truck", status: "active", km: 154000, lat: -31.6333, lng: -60.7000 }, // Santa Fe Capital
    { id: "veh-15", plate: "AE 920 MN", brand: "Volvo", model: "FM 420", type: "truck", status: "active", km: 210000, lat: -33.8900, lng: -60.5700 }, // Pergamino
    { id: "veh-16", plate: "AG 880 TY", brand: "Scania", model: "G450 6x2", type: "truck", status: "active", km: 95000, lat: -34.9205, lng: -57.9536 }, // La Plata
    { id: "veh-17", plate: "AF 110 ZZ", brand: "Iveco", model: "Hi-Road 360", type: "truck", status: "active", km: 188000, lat: -38.0000, lng: -57.5500 }, // Mar del Plata
    { id: "veh-18", plate: "AD 780 ER", brand: "Mercedes-Benz", model: "Actros 2045", type: "truck", status: "active", km: 325000, lat: -33.3000, lng: -66.3300 }, // San Luis RN7
    { id: "veh-19", plate: "AE 640 CV", brand: "Volvo", model: "FH 540 Globetrotter", type: "truck", status: "active", km: 198000, lat: -31.3900, lng: -58.0200 }, // Concordia RN14
    { id: "veh-20", plate: "AG 230 QP", brand: "Scania", model: "R540 V8 6x4", type: "truck", status: "maintenance", km: 104000, lat: -34.1600, lng: -58.9600 }, // Taller Central
  ];

  for (const v of vehicles) {
    const gpsLocation = JSON.stringify({
      latitude: v.lat,
      longitude: v.lng,
      speed: v.status === "active" ? 78 : 0,
      timestamp: new Date().toISOString()
    });

    rawDb.prepare(`
      INSERT OR REPLACE INTO vehicles (id, companyId, licensePlate, brand, model, type, status, kmTotal, kmCurrentTrip, lastGpsLocation, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))
    `).run(v.id, companyId, v.plate, v.brand, v.model, v.type, v.status, v.km, gpsLocation);
  }

  // 5. Choferes Profesionales
  const drivers = [
    { id: "drv-01", name: "Gustavo (Director/Chofer Demo)", dni: "28.349.120", phone: "+54 9 11 2390-6673", license: "LNH-28349120", expiry: "2026-11-20", trips: 142, km: 185000 },
    { id: "drv-02", name: "Martín Benítez", dni: "31.902.441", phone: "+54 9 341 556-3344", license: "LNH-31902441", expiry: "2026-08-28", trips: 118, km: 154000 },
    { id: "drv-03", name: "Lucas Gómez", dni: "33.102.941", phone: "+54 9 351 667-8899", license: "LNH-33102941", expiry: "2027-05-10", trips: 94, km: 122000 },
    { id: "drv-04", name: "Fernando Maidana", dni: "26.419.002", phone: "+54 9 11 6789-0011", license: "LNH-26419002", expiry: "2026-12-15", trips: 210, km: 290000 },
    { id: "drv-05", name: "Diego Álvarez", dni: "29.883.112", phone: "+54 9 221 445-6677", license: "LNH-29883112", expiry: "2027-01-22", trips: 135, km: 176000 },
    { id: "drv-06", name: "Carlos Rodríguez", dni: "27.550.319", phone: "+54 9 11 4455-1122", license: "LNH-27550319", expiry: "2026-10-30", trips: 165, km: 220000 },
    { id: "drv-07", name: "Mariano Soria", dni: "34.220.891", phone: "+54 9 261 554-1122", license: "LNH-34220891", expiry: "2027-03-18", trips: 82, km: 98000 },
    { id: "drv-08", name: "Jorge Carrizo", dni: "25.109.448", phone: "+54 9 381 442-9900", license: "LNH-25109448", expiry: "2026-09-14", trips: 240, km: 340000 },
    { id: "drv-09", name: "Pablo Romero", dni: "30.441.782", phone: "+54 9 291 556-7788", license: "LNH-30441782", expiry: "2027-04-05", trips: 110, km: 140000 },
    { id: "drv-10", name: "Esteban Mansilla", dni: "32.880.194", phone: "+54 9 11 5566-4433", license: "LNH-32880194", expiry: "2026-11-12", trips: 98, km: 130000 },
  ];

  for (const d of drivers) {
    rawDb.prepare(`
      INSERT OR REPLACE INTO drivers (id, companyId, fullName, dni, phone, licenseNumber, licenseExpiry, status, totalTrips, totalKm, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))
    `).run(d.id, companyId, d.name, d.dni, d.phone, d.license, d.expiry, d.trips, d.km);
  }

  // 6. Viajes Operativos en Rutas Estratégicas
  const trips = [
    { id: "trip-482", vehicleId: "veh-01", driverId: "drv-01", customerId: "cust-01", origin: "CABA (Centro de Distribución)", destination: "Córdoba Capital (Arcor)", status: "delayed", fare: 3850000, km: 710 },
    { id: "trip-483", vehicleId: "veh-02", driverId: "drv-02", customerId: "cust-02", origin: "Rosario (Molinos)", destination: "Mendoza (Bodegas)", status: "en_route", fare: 4200000, km: 860 },
    { id: "trip-484", vehicleId: "veh-04", driverId: "drv-04", customerId: "cust-04", origin: "San Nicolás (Siderar)", destination: "Bahía Blanca (Polo Petroquímico)", status: "en_route", fare: 3900000, km: 680 },
    { id: "trip-485", vehicleId: "veh-05", driverId: "drv-05", customerId: "cust-03", origin: "Quilmes (Planta)", destination: "Rosario (Depósito)", status: "en_route", fare: 2100000, km: 310 },
    { id: "trip-486", vehicleId: "veh-06", driverId: "drv-06", customerId: "cust-07", origin: "Tortuguitas (Unilever)", destination: "San Luis Capital", status: "en_route", fare: 4100000, km: 790 },
    { id: "trip-487", vehicleId: "veh-07", driverId: "drv-07", customerId: "cust-08", origin: "Gualeguaychú", destination: "Puerto de Rosario", status: "en_route", fare: 2400000, km: 340 },
    { id: "trip-488", vehicleId: "veh-08", driverId: "drv-08", customerId: "cust-05", origin: "Olavarría (Loma Negra)", destination: "Tucumán (Obras)", status: "pending", fare: 5200000, km: 1250 },
    { id: "trip-489", vehicleId: "veh-09", driverId: "drv-09", customerId: "cust-06", origin: "Gral. Rodríguez (La Serenísima)", destination: "Mar del Plata", status: "completed", fare: 2300000, km: 420 },
    { id: "trip-490", vehicleId: "veh-10", driverId: "drv-10", customerId: "cust-02", origin: "Zárate", destination: "Córdoba Capital", status: "completed", fare: 3600000, km: 650 },
  ];

  for (const t of trips) {
    rawDb.prepare(`
      INSERT OR REPLACE INTO trips (id, companyId, vehicleId, driverId, customerId, origin, destination, status, fare, kmTotal, kmCompleted, estimatedArrival, startTime, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+6 hours'), datetime('now', '-2 hours'), datetime('now'), datetime('now'))
    `).run(t.id, companyId, t.vehicleId, t.driverId, t.customerId, t.origin, t.destination, t.status, t.fare, t.km, t.status === "completed" ? t.km : Math.round(t.km * 0.45));
  }

  // 7. Mantenimiento y Servicios
  const maintenanceOrders = [
    { id: "M-01", vehicleId: "veh-01", type: "preventive", description: "Service 150.000 km (Aceite sintético, filtros motor y secador)", workshop: "Taller Central Campana", date: "2026-08-10", nextDate: "2026-11-10", km: 145000, cost: 890000, status: "completed" },
    { id: "M-02", vehicleId: "veh-02", type: "corrective", description: "Cambio de pastillas y discos de freno eje delantero", workshop: "Frenos San Martín (Rosario)", date: "2026-08-14", nextDate: null, km: 219000, cost: 1250000, status: "completed" },
    { id: "M-03", vehicleId: "veh-03", type: "corrective", description: "Reparación de fuelle neumático y sensor de ABS", workshop: "Iveco Oficial Córdoba", date: "2026-08-16", nextDate: null, km: 98500, cost: 620000, status: "in_progress" },
    { id: "M-04", vehicleId: "veh-04", type: "preventive", description: "Rotación y alineación de 10 neumáticos", workshop: "Gomería Rutas Pampeanas", date: "2026-08-20", nextDate: "2026-12-20", km: 315000, cost: 340000, status: "scheduled" },
    { id: "M-05", vehicleId: "veh-05", type: "preventive", description: "Control de baterías y sistema de inyección", workshop: "Taller Central Campana", date: "2026-08-22", nextDate: "2026-11-22", km: 178000, cost: 410000, status: "scheduled" },
  ];

  for (const m of maintenanceOrders) {
    rawDb.prepare(`
      INSERT OR REPLACE INTO maintenance (id, companyId, vehicleId, type, description, workshop, serviceDate, nextServiceDate, kmAtService, cost, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(m.id, companyId, m.vehicleId, m.type, m.description, m.workshop, m.date, m.nextDate, m.km, m.cost, m.status);
  }

  // 8. Control Documental Legal
  const legalDocs = [
    { id: "D-01", vehicleId: "veh-01", driverId: null, type: "RTO / VTV", title: "RTO-88934-BA", fileUrl: "https://storage.generarise.space/docs/rto-01.pdf", expiryDate: "2026-09-02", status: "expiring" },
    { id: "D-02", vehicleId: "veh-02", driverId: null, type: "RUTA", title: "RUTA-299104", fileUrl: "https://storage.generarise.space/docs/ruta-02.pdf", expiryDate: "2027-02-15", status: "valid" },
    { id: "D-03", vehicleId: "veh-03", driverId: null, type: "Póliza de Seguro", title: "POL-CHUBB-9921", fileUrl: "https://storage.generarise.space/docs/seg-03.pdf", expiryDate: "2026-08-12", status: "expired" },
    { id: "D-04", vehicleId: null, driverId: "drv-01", type: "Licencia LNH", title: "LNH-29831920", fileUrl: "https://storage.generarise.space/docs/lnh-01.pdf", expiryDate: "2026-11-20", status: "valid" },
    { id: "D-05", vehicleId: null, driverId: "drv-02", type: "Psicofísico", title: "PSICO-CNRT-884", fileUrl: "https://storage.generarise.space/docs/psico-02.pdf", expiryDate: "2026-08-28", status: "expiring" },
    { id: "D-06", vehicleId: null, driverId: "drv-03", type: "Licencia LNH", title: "LNH-33102941", fileUrl: "https://storage.generarise.space/docs/lnh-03.pdf", expiryDate: "2027-05-10", status: "valid" },
    { id: "D-07", vehicleId: null, driverId: null, type: "ART", title: "ART-ASOC-99281", fileUrl: "https://storage.generarise.space/docs/art-01.pdf", expiryDate: "2026-12-31", status: "valid" },
    { id: "D-08", vehicleId: "veh-04", driverId: null, type: "Habilitación SENASA", title: "SENASA-CAT-301", fileUrl: "https://storage.generarise.space/docs/senasa-04.pdf", expiryDate: "2026-10-15", status: "valid" },
  ];

  for (const doc of legalDocs) {
    rawDb.prepare(`
      INSERT OR REPLACE INTO documents (id, companyId, vehicleId, driverId, type, title, fileUrl, expiryDate, status, uploadedAt, uploadedBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'Sistema', datetime('now'), datetime('now'))
    `).run(doc.id, companyId, doc.vehicleId, doc.driverId, doc.type, doc.title, doc.fileUrl, doc.expiryDate, doc.status);
  }

  // 9. Cargas de Combustible
  const fuelEntries = [
    { id: "F-101", vehicleId: "veh-01", driverId: "drv-01", station: "YPF Directo Zárate", liters: 480, pricePerLiter: 1120, totalAmount: 537600, kmAtFill: 142500, consumption: 34.2, anomaly: 0, date: "2026-08-16" },
    { id: "F-102", vehicleId: "veh-02", driverId: "drv-02", station: "Shell Leones (RN9)", liters: 520, pricePerLiter: 1150, totalAmount: 598000, kmAtFill: 218900, consumption: 35.8, anomaly: 0, date: "2026-08-15" },
    { id: "F-103", vehicleId: "veh-03", driverId: "drv-03", station: "Axion San Nicolás", liters: 610, pricePerLiter: 1130, totalAmount: 689300, kmAtFill: 98400, consumption: 42.1, anomaly: 1, date: "2026-08-15" },
    { id: "F-104", vehicleId: "veh-04", driverId: "drv-04", station: "Puma Rosario Sur", liters: 450, pricePerLiter: 1090, totalAmount: 490500, kmAtFill: 312000, consumption: 33.9, anomaly: 0, date: "2026-08-14" },
    { id: "F-105", vehicleId: "veh-05", driverId: "drv-05", station: "YPF Villa María", liters: 490, pricePerLiter: 1120, totalAmount: 548800, kmAtFill: 176300, consumption: 34.5, anomaly: 0, date: "2026-08-14" },
  ];

  for (const f of fuelEntries) {
    rawDb.prepare(`
      INSERT OR REPLACE INTO fuel_entries (id, companyId, vehicleId, driverId, station, liters, pricePerLiter, totalAmount, kmAtFill, consumptionLPer100Km, anomaly, date, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(f.id, companyId, f.vehicleId, f.driverId, f.station, f.liters, f.pricePerLiter, f.totalAmount, f.kmAtFill, f.consumption, f.anomaly, f.date);
  }

  // 10. Evidencias Multimedia de Viajes (Fotos, Remitos, Audios, Ubicaciones)
  const tripEvidence = [
    {
      id: "ev-01",
      tripId: "trip-482",
      driverId: "drv-01",
      kind: "image",
      title: "Remito de Entrega Firmado",
      description: "Remito de descarga en planta Arcor Arroyito firmado por recepción y control de calidad.",
      mediaUrl: "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&auto=format&fit=crop&q=80",
      transcript: null,
      source: "whatsapp"
    },
    {
      id: "ev-02",
      tripId: "trip-482",
      driverId: "drv-01",
      kind: "image",
      title: "Foto de Corte RN9 (Baradero)",
      description: "Corte de tránsito total mano a Rosario en RN9 km 140 por obras y accidente previo.",
      mediaUrl: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80",
      transcript: null,
      source: "whatsapp"
    },
    {
      id: "ev-03",
      tripId: "trip-483",
      driverId: "drv-02",
      kind: "audio",
      title: "Nota de Voz: Arribo a Bodega",
      description: "Audio del chofer Martín Benítez confirmando ingreso a planta y solicitud de turno de descarga.",
      mediaUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
      transcript: "Hola central, Martín Benítez reportando. Ya ingresé a la bodega en Mendoza, me asignaron darsena 4 para la descarga.",
      source: "whatsapp"
    },
    {
      id: "ev-04",
      tripId: "trip-484",
      driverId: "drv-04",
      kind: "image",
      title: "Ticket de Carga de Combustible YPF",
      description: "Ticket de carga 450 Litros Infinia Diesel en estación YPF Directo San Nicolás.",
      mediaUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
      transcript: null,
      source: "whatsapp"
    },
    {
      id: "ev-05",
      tripId: "trip-485",
      driverId: "drv-05",
      kind: "location",
      title: "Ubicación en Tiempo Real RN9",
      description: "Punto de telemetría reportado por WhatsApp al ingresar a circunvalación Rosario.",
      mediaUrl: null,
      transcript: "Compartió ubicación en vivo: -32.9468, -60.6393",
      source: "whatsapp",
      metadata: JSON.stringify({ latitude: -32.9468, longitude: -60.6393 })
    },
    {
      id: "ev-06",
      tripId: "trip-486",
      driverId: "drv-06",
      kind: "audio",
      title: "Nota de Voz: Parada Técnica",
      description: "Reporte de descanso reglamentario de 45 minutos en parador de autopista.",
      mediaUrl: "https://actions.google.com/sounds/v1/ambiences/office_room.ogg",
      transcript: "Buenas tardes equipo, paro 45 minutos a almorzar y revisar las cubiertas en el parador de Junín.",
      source: "whatsapp"
    }
  ];

  for (const ev of tripEvidence) {
    rawDb.prepare(`
      INSERT OR REPLACE INTO trip_evidence (id, companyId, tripId, driverId, kind, title, description, mediaUrl, transcript, source, metadata, capturedAt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 hours'), datetime('now'))
    `).run(ev.id, companyId, ev.tripId, ev.driverId, ev.kind, ev.title, ev.description, ev.mediaUrl, ev.transcript, ev.source, (ev as any).metadata || null);
  }

  // 11. Mensajes de WhatsApp y Auditoría
  const whatsappMessages = [
    {
      id: "msg-01",
      phone: "5491144551122",
      driverId: "drv-01",
      direction: "incoming",
      messageType: "image",
      content: "Acá mando el remito firmado de Arcor",
      mediaUrl: "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&auto=format&fit=crop&q=80",
      interpretedAction: "document_upload",
      interpretedConfidence: 0.98,
      tripId: "trip-482",
      responseMessage: "📄 Foto de remito recibida y guardada como evidencia en el Viaje #482 (Arcor)."
    },
    {
      id: "msg-02",
      phone: "5493415563344",
      driverId: "drv-02",
      direction: "incoming",
      messageType: "audio",
      content: "Hola central, Martín Benítez reportando. Ya ingresé a la bodega en Mendoza.",
      mediaUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
      interpretedAction: "trip_arrival",
      interpretedConfidence: 0.95,
      tripId: "trip-483",
      responseMessage: "🏁 Llegada registrada en Mendoza (Bodegas). El viaje #483 pasó a estado EN DESTINO."
    },
    {
      id: "msg-03",
      phone: "5491167890011",
      driverId: "drv-04",
      direction: "incoming",
      messageType: "text",
      content: "Salí hacia Bahía Blanca con la carga de acero",
      mediaUrl: null,
      interpretedAction: "trip_departure",
      interpretedConfidence: 0.99,
      tripId: "trip-484",
      responseMessage: "✅ Salida confirmada. Viaje #484 actualizado a EN RUTA. ¡Buen viaje!"
    }
  ];

  for (const wm of whatsappMessages) {
    rawDb.prepare(`
      INSERT OR REPLACE INTO whatsapp_messages (id, companyId, driverId, phone, direction, messageType, content, mediaUrl, interpretedAction, interpretedConfidence, tripId, processed, processedAt, responseMessage, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), ?, datetime('now', '-30 minutes'))
    `).run(wm.id, companyId, wm.driverId, wm.phone, wm.direction, wm.messageType, wm.content, wm.mediaUrl, wm.interpretedAction, wm.interpretedConfidence, wm.tripId, wm.responseMessage);
  }

  // 12. Alertas Operativas Priorizadas
  const alerts = [
    {
      id: "alt-01",
      level: "critica",
      title: "Viaje #482 con Demora (+1h 45m)",
      message: "Corte total en RN9 km 140 (Baradero). Ventana de entrega comprometida con cliente Arcor Arroyito.",
      entityType: "trip",
      entityLabel: "Viaje #482",
      tripId: "trip-482",
      driverId: "drv-01",
      vehicleId: "veh-01",
      status: "open",
      requiresIntervention: 1
    },
    {
      id: "alt-02",
      level: "alta",
      title: "Consumo Anormal de Combustible (+22%)",
      message: "La unidad Iveco Stralis registró 42.1 L/100km en el tramo Rosario-Córdoba.",
      entityType: "vehicle",
      entityLabel: "AG 105 OP",
      tripId: null,
      driverId: "drv-03",
      vehicleId: "veh-03",
      status: "open",
      requiresIntervention: 1
    },
    {
      id: "alt-03",
      level: "alta",
      title: "Póliza de Seguro Automotor Vencida",
      message: "Póliza POL-CHUBB-9921 venció el 12/08/2026. Se recomienda inmovilizar la unidad hasta renovación.",
      entityType: "vehicle",
      entityLabel: "AG 105 OP",
      tripId: null,
      driverId: null,
      vehicleId: "veh-03",
      status: "open",
      requiresIntervention: 1
    }
  ];

  for (const a of alerts) {
    rawDb.prepare(`
      INSERT OR REPLACE INTO operational_alerts (id, companyId, level, title, message, entityType, entityLabel, tripId, driverId, vehicleId, status, requiresIntervention, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 hours'), datetime('now'))
    `).run(a.id, companyId, a.level, a.title, a.message, a.entityType, a.entityLabel, a.tripId, a.driverId, a.vehicleId, a.status, a.requiresIntervention);
  }

  console.log("🏁 Carga de datos demo completada con éxito. Listo para demostración a transportistas.");
}

// Auto-run if executed via CLI
if (require.main === module) {
  seedDemoData();
}
