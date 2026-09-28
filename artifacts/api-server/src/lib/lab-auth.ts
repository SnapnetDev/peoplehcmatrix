import { randomUUID } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { db, auditTable, usersTable } from "@workspace/db";

type User = typeof usersTable.$inferSelect;
type Role = User["role"];

declare global {
  namespace Express {
    interface Request {
      labUser?: User;
    }
  }
}

export function signingKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 UTF-8 bytes");
  }
  return new TextEncoder().encode(secret);
}

export async function issueToken(user: User): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuer("peoplematrix-lab")
    .setAudience("peoplematrix-app")
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime("45m")
    .sign(signingKey());
}

export const authenticate: RequestHandler = async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/.exec(req.get("authorization") ?? "");
  if (!match) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(match[1], signingKey(), {
      issuer: "peoplematrix-lab",
      audience: "peoplematrix-app",
      algorithms: ["HS256"],
    }));
  } catch {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!payload.jti || !payload.sub || !payload.exp || !/^\d+$/.test(payload.sub)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(payload.sub)));
    if (!user?.active) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.labUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.labUser || !roles.includes(req.labUser.role)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    next();
  };
}

export function account(user: User) {
  return {
    id: user.id, email: user.email, role: user.role,
    employeeId: user.employeeId, active: user.active,
  };
}

export async function audit(req: Request, action: string, status: number, userId = req.labUser?.id ?? null) {
  await db.insert(auditTable).values({
    userId, ip: req.ip?.slice(0, 80) ?? null,
    method: req.method, endpoint: req.originalUrl.split("?")[0].slice(0, 255),
    action, status,
  });
}

export function positiveId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}