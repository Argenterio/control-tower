// Script de Seed con datos hiper-realistas para demostración comercial
// Empresa: Transportes Pampeana S.A.
// Rutas: Principales corredores de logística terrestre de Argentina (RN9, RN7, RN14, RN3, RN34)

import { dbService, rawDb } from "./database";
import { hashPassword } from "./auth";

console.log("🚚 Iniciando carga de datos demo para Control Tower...");

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
console.log(`✅ ${customers.length} Clientes dadores de carga registrados`);

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
console.log(`✅ ${vehicles.length} Camiones con telemetría GPS registrados`);

// 5. Choferes Profesionales
const drivers = [
  { id: "drv-01", name: "Carlos Rodríguez", dni: "28.349.120", phone: "+54 9 11 4455-1122", license: "LNH-28349120", expiry: "2026-11-20", trips: 142, km: 185000 },
  { id: "drv-02", name: "Martín Benítez", dni: "31.902.441", phone: "+54 9 341 556-3344", license: "LNH-31902441", expiry: "2026-08-28", trips: 118, km: 154000 },
  { id: "drv-03", name: "Lucas Gómez", dni: "33.102.941", phone: "+54 9 351 667-8899", license: "LNH-33102941", expiry: "2027-05-10", trips: 94, km: 122000 },
  { id: "drv-04", name: "Fernando Maidana", dni: "26.419.002", phone: "+54 9 11 6789-0011", license: "LNH-26419002", expiry: "2026-12-15", trips: 210, km: 290000 },
  { id: "drv-05", name: "Diego Álvarez", dni: "29.883.112", phone: "+54 9 221 445-6677", license: "LNH-29883112", expiry: "2027-01-22", trips: 135, km: 176000 },
  { id: "drv-06", name: "Gustavo Pereyra", dni: "27.550.319", phone: "+54 9 336 412-3344", license: "LNH-27550319", expiry: "2026-10-30", trips: 165, km: 220000 },
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
console.log(`✅ ${drivers.length} Choferes profesionales registrados`);

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
console.log(`✅ ${trips.length} Viajes operativos en curso y completados`);

console.log("🏁 Carga de datos demo completada con éxito. Listo para demostración a transportistas.");
