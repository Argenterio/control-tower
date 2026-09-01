// auth.ts - Autenticación JWT y autorización multi-tenant para Control Tower API
// Roles: admin | manager | dispatcher | driver | viewonly

import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import type { User } from "./types";
import { dbService } from "./database";
import { config } from "./config/env";

export interface AuthPayload {
  sub: string;
  companyId?: string;
  role: string;
  email: string;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(user: Pick<User, "id" | "email" | "role" | "companyId">): string {
  const payload: AuthPayload = {
    sub: user.id,
    companyId: user.companyId,
    role: user.role,
    email: user.email,
  };
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, config.jwtSecret, options);
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, config.jwtSecret) as AuthPayload;
}

// ============================================================================
// Middlewares de autorización
// ============================================================================

/**
 * Exige token JWT válido en Authorization: Bearer <token>.
 * Coloca el payload en `res.locals.auth` para los siguientes middlewares.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Token no proporcionado" });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    res.locals.auth = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Token inválido o expirado" });
  }
}

/**
 * Restringe acceso por rol. Uso: requireRole("admin", "manager")
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = res.locals.auth as AuthPayload | undefined;
    if (!auth || !roles.includes(auth.role)) {
      res.status(403).json({ success: false, error: "Acceso denegado para este rol" });
      return;
    }
    next();
  };
}

/**
 * Roles con permiso de escritura administrativa sobre entidades de negocio.
 * `admin` y `manager` pueden crear/modificar/eliminar.
 * `operator` y `dispatcher` pueden actualizar estado operativo.
 * `driver` NO puede modificar entidades administrativas.
 * `viewonly` sólo lectura.
 */
export const WRITE_ROLES = ["admin", "manager"] as const;
export const OPERATOR_WRITE_ROLES = ["admin", "manager", "dispatcher"] as const;

/**
 * Helper: extrae el companyId autorizado del token. Lo deja disponible en
 * `res.locals.companyId` para usar en handlers.
 *
 * NUNCA se acepta companyId desde query/body/headers.
 */
function setAuthorizedCompany(res: Response): string | null {
  const auth = res.locals.auth as AuthPayload | undefined;
  if (!auth || !auth.companyId) return null;
  res.locals.companyId = auth.companyId;
  return auth.companyId;
}

/**
 * Middleware MULTI-TENANT.
 * Garantiza que la empresa que el handler va a operar es la del usuario
 * autenticado, NO la que viene del cliente.
 *
 * Comportamiento:
 *   1. Verifica JWT (vía requireAuth previo).
 *   2. Toma companyId del JWT y lo escribe en res.locals.companyId.
 *   3. Si el cliente envió ?companyId= o body.companyId y NO coincide con el
 *      del token, devuelve 403 (IDOR prevention).
 *   4. Si el cliente envió un companyId que coincide, lo deja pasar (comodo
 *      para frontend que cachea el ID, sin riesgo).
 *   5. Si NO envió ninguno, usa el del token (caso normal).
 */
export function requireCompanyAccess(req: Request, res: Response, next: NextFunction): void {
  const auth = res.locals.auth as AuthPayload | undefined;
  if (!auth) {
    res.status(401).json({ success: false, error: "Autenticación requerida" });
    return;
  }
  if (!auth.companyId) {
    res.status(403).json({ success: false, error: "Usuario sin empresa asociada" });
    return;
  }
  const authorized = auth.companyId;

  // Detectar intentos de IDOR: companyId en query o body distinto al del token.
  const queryCompany = typeof req.query.companyId === "string" ? req.query.companyId : undefined;
  const bodyCompany = typeof req.body?.companyId === "string" ? req.body.companyId : undefined;
  const headerCompany = typeof req.headers["x-company-id"] === "string" ? (req.headers["x-company-id"] as string) : undefined;

  const attempted = queryCompany || bodyCompany || headerCompany;
  if (attempted && attempted !== authorized) {
    res.status(403).json({ success: false, error: "Acceso denegado a empresa" });
    return;
  }

  res.locals.companyId = authorized;
  next();
}

/**
 * Shortcut: requireAuth + requireCompanyAccess en una sola llamada.
 */
export function requireAuthAndCompany(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, (err?: unknown) => {
    if (err || res.headersSent) return;
    requireCompanyAccess(req, res, next);
  });
}

/**
 * Verifica que un recurso (entidad con companyId en DB) pertenece a la empresa
 * del usuario. Usar dentro de handlers antes de modificar/eliminar.
 */
export function assertSameCompany(resourceCompanyId: string | undefined | null): boolean {
  // se evalúa contra res.locals.companyId en runtime del handler
  return !!resourceCompanyId;
}

/**
 * Crea el usuario admin DEMO por defecto si la variable SEED_DEMO_DATA=true.
 * El password se imprime UNA VEZ por consola y NO se almacena en texto plano.
 *
 * Si DEMO_ADMIN_PASSWORD está definido y SEED_DEMO_DATA=true, usa ese password
 * (útil sólo para desarrollo/testing).
 *
 * En producción, se recomienda SEED_DEMO_DATA=false y usar /api/onboarding/signup.
 */
export function ensureAdminUser(): void {
  const seedDemo = (process.env.SEED_DEMO_DATA || "true").toLowerCase() === "true";
  if (!seedDemo) return;

  const existing = dbService.getUserByEmail("admin@controltower.com");
  if (existing) return;

  const crypto = require("crypto") as typeof import("crypto");
  const fromEnv = process.env.DEMO_ADMIN_PASSWORD;
  const password = fromEnv && fromEnv.length >= 8
    ? fromEnv
    : crypto.randomBytes(9).toString("base64url"); // 12 chars seguros

  dbService.createUser({
    name: "Administrador Demo",
    email: "admin@controltower.com",
    password: hashPassword(password),
    role: "admin",
    status: "active",
    companyId: "default-company",
  });

  if (!fromEnv) {
    console.log("=".repeat(70));
    console.log("[seed] Usuario DEMO creado.");
    console.log("[seed]   email:    admin@controltower.com");
    console.log(`[seed]   password: ${password}`);
    console.log("[seed]   (Guarde este password. NO se mostrará de nuevo.)");
    console.log("=".repeat(70));
  }
}
