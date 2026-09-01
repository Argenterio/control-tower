// onboarding.ts — Endpoint público para crear empresa + administrador inicial.
// FASE 1 — Seguridad.

import { dbService } from "./database";
import { hashPassword, signToken, type AuthPayload } from "./auth";
import type { Company, User } from "./types";

export interface SignupInput {
  companyName: string;
  companyCuit?: string;     // CUIT/RUC opcional
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface SignupResult {
  company: Company;
  admin: Omit<User, "password">;
  token: string;
}

export class OnboardingError extends Error {
  constructor(public readonly code: "invalid_input" | "duplicate_email" | "duplicate_cuit" | "internal", message: string) {
    super(message);
    this.name = "OnboardingError";
  }
}

function validate(input: Partial<SignupInput>): asserts input is SignupInput {
  if (!input.companyName || input.companyName.trim().length < 2) {
    throw new OnboardingError("invalid_input", "Nombre de empresa inválido");
  }
  if (!input.adminName || input.adminName.trim().length < 2) {
    throw new OnboardingError("invalid_input", "Nombre de administrador inválido");
  }
  if (!input.adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.adminEmail)) {
    throw new OnboardingError("invalid_input", "Email del administrador inválido");
  }
  if (!input.adminPassword || input.adminPassword.length < 8) {
    throw new OnboardingError("invalid_input", "La contraseña debe tener al menos 8 caracteres");
  }
}

/**
 * Crea una empresa + su primer administrador en una sola transacción lógica.
 * Devuelve el JWT del admin para que el frontend entre directamente.
 */
export async function signupCompany(input: SignupInput): Promise<SignupResult> {
  validate(input);

  const existingUser = dbService.getUserByEmail(input.adminEmail.toLowerCase());
  if (existingUser) {
    throw new OnboardingError("duplicate_email", "Ya existe un usuario con ese email");
  }

  // 1) Crear empresa
  const company = dbService.createCompany({
    name: input.companyName.trim(),
    ruci: input.companyCuit?.trim() || undefined,
    email: input.companyEmail?.trim() || input.adminEmail.toLowerCase(),
    phone: input.companyPhone?.trim() || undefined,
    address: input.companyAddress?.trim() || undefined,
    status: "active",
  });

  // 2) Crear company_settings por defecto
  dbService.upsertCompanySettings(company.id, {});

  // 3) Crear admin
  const adminUser = dbService.createUser({
    name: input.adminName.trim(),
    email: input.adminEmail.toLowerCase(),
    password: hashPassword(input.adminPassword),
    role: "admin",
    status: "active",
    companyId: company.id,
  });

  // 4) Generar JWT
  const token = signToken({
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    companyId: adminUser.companyId,
  });

  // 5) Sanitizar respuesta (NUNCA devolver password/hash)
  const safeAdmin: Omit<User, "password"> = {
    id: adminUser.id,
    name: adminUser.name,
    email: adminUser.email,
    role: adminUser.role,
    status: adminUser.status,
    companyId: adminUser.companyId,
    createdAt: adminUser.createdAt,
    updatedAt: adminUser.updatedAt,
  };

  return { company, admin: safeAdmin, token };
}
