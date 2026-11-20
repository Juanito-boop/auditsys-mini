import "server-only";

import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Db } from "@/server/db/client";
import type { UserRow } from "@/server/db/types";
import { unauthorized, internal } from "@/server/lib/errors";
import { SESSION_MAX_AGE_SECONDS } from "@/server/lib/constants";
import type { Actor, Role, UserDTO } from "@/shared/types";
import type { LoginInput } from "./schemas";

/** Hash bcrypt de "dummy" con coste 10, para igualar el tiempo cuando no hay usuario. */
const HASH_DUMMY = "$2b$10$ZfngIh1.IW1pa0SeAy9EieRrxBAZcrgDjGuJJ1j9BSJeV0S/lfuvO";

/** Opciones comunes de los servicios; `now` permite pruebas deterministas. */
export interface ServiceDeps {
  db: Db;
  actor?: Actor;
  now?: Date;
}

function claveFirma(): Uint8Array {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) {
    throw internal("AUTH_SECRET no está configurado. Define una clave aleatoria de al menos 32 bytes.");
  }
  if (Buffer.byteLength(secreto, "utf8") < 32) {
    throw internal("AUTH_SECRET es demasiado corto: debe tener al menos 32 bytes.");
  }
  return new TextEncoder().encode(secreto);
}

/** Opciones de la cookie de sesión, compartidas por las rutas de autenticación. */
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/** Firma un JWT HS256 con los claims mínimos del actor. */
export async function signToken(user: Actor, now: Date = new Date()): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({
    email: user.email,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(user.id))
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_MAX_AGE_SECONDS)
    .sign(claveFirma());
}

/** Verifica el token y reconstruye al actor. Nunca lanza: devuelve null si falla. */
export async function verifyToken(token: string): Promise<Actor | null> {
  try {
    const { payload } = await jwtVerify(token, claveFirma(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || !/^\d+$/.test(payload.sub)) return null;

    const id = Number(payload.sub);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    if (payload.role !== "admin" && payload.role !== "auditor") return null;
    if (typeof payload.email !== "string" || typeof payload.name !== "string") return null;

    return { id, email: payload.email, name: payload.name, role: payload.role as Role };
  } catch {
    return null;
  }
}

function toUserDTO(row: UserRow): UserDTO {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

/** Datos vigentes del usuario, sin password_hash. */
export function getUserById(db: Db, id: number): UserDTO | null {
  const fila = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return fila ? toUserDTO(fila) : null;
}

/** Autentica por email (insensible a mayúsculas) y devuelve usuario + JWT. */
export async function login(
  input: LoginInput,
  { db, now }: ServiceDeps
): Promise<{ user: UserDTO; token: string }> {
  const fila = db
    .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .get(input.email) as UserRow | undefined;

  let coincide = false;
  // Siempre se ejecuta un compare: sin usuario se usa el hash señuelo.
  try {
    coincide = await compare(input.password, fila?.password_hash ?? HASH_DUMMY);
  } catch {
    coincide = false;
  }

  if (!fila || !coincide) {
    throw unauthorized("Correo o contraseña incorrectos");
  }

  const user = toUserDTO(fila);
  return { user, token: await signToken(user, now) };
}

/** Hash bcrypt para el seed inicial. */
export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 10);
}
