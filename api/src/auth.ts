// auth.ts - Autenticación JWT para Control Tower API
// Roles: admin | manager | dispatcher | driver | viewonly

import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import type { User } from "./types";
import { dbService } from "./database";

const JWT_SECRET: string = process.env.JWT_SECRET || "control-tower-dev-secret-change-me";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "12h";

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
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

// Middleware: exige token JWT válido en Authorization: Bearer <token>
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

// Middleware: restringe acceso por rol (admin/manager/dispatcher)
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

// Crea el usuario admin por defecto si no existe
export function ensureAdminUser(): void {
  const existing = dbService.getUserByEmail("admin@controltower.com");
  if (existing) return;
  dbService.createUser({
    name: "Administrador",
    email: "admin@controltower.com",
    password: hashPassword("admin123"),
    role: "admin",
    status: "active",
    companyId: "default-company",
  });
}
