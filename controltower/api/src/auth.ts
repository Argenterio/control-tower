import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config/env.js';
import { db } from './database.js';

export interface JwtPayload {
  userId: string;
  companyId: string;
  role: string;
  email: string;
}

export const WRITE_ROLES = ['admin', 'owner', 'manager'] as const;
export const OPERATOR_WRITE_ROLES = ['admin', 'owner', 'manager', 'operator', 'driver'] as const;

export type WriteRole = (typeof WRITE_ROLES)[number];
export type OperatorWriteRole = (typeof OPERATOR_WRITE_ROLES)[number];

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

export function requireAuth(req: any, res: any, next: any): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }
  try {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireCompanyAccess(req: any, res: any, next: any): void {
  requireAuth(req, res, () => {
    const companyId = req.params.companyId || req.body.companyId || req.query.companyId;
    if (companyId && companyId !== req.user.companyId) {
      res.status(403).json({ error: 'Acceso denegado a esta empresa' });
      return;
    }
    req.companyId = req.user.companyId;
    res.locals.companyId = req.user.companyId;
    next();
  });
}

export function requireAuthAndCompany(req: any, res: any, next: any): void {
  requireAuth(req, res, () => {
    req.companyId = req.user.companyId;
    res.locals.companyId = req.user.companyId;
    next();
  });
}

export function requireRole(...allowedRoles: string[]) {
  return (req: any, res: any, next: any): void => {
    requireAuth(req, res, () => {
      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ error: 'Rol insuficiente' });
        return;
      }
      next();
    });
  };
}

export async function ensureAdminUser(): Promise<void> {
  if (!config.seedDemoData) return;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@controltower.local');
  if (existing) return;

  const companyResult = db.prepare('INSERT INTO companies (name, slug, plan, status) VALUES (?, ?, ?, ?)').run(
    'Control Tower Demo',
    'control-tower-demo',
    'enterprise',
    'active'
  );
  const companyId = companyResult.lastInsertRowid as number;

  const settingsResult = db.prepare('INSERT INTO company_settings (company_id) VALUES (?)').run(companyId);

  const password = crypto.randomBytes(16).toString('hex');
  const passwordHash = await hashPassword(password);

  db.prepare(
    'INSERT INTO users (company_id, email, password_hash, name, role, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(companyId, 'admin@controltower.local', passwordHash, 'Admin Demo', 'admin', 'active');

  console.log('🔐 Demo admin created:', { email: 'admin@controltower.local', password, companyId });
}