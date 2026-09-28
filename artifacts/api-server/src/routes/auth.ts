import { Router, type IRouter } from "express";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, LoginResponse, GetMeResponse } from "@workspace/api-zod";
import { account, audit, authenticate, issueToken } from "../lib/lab-auth";

const router: IRouter = Router();
const failures = new Map<string, { count: number; until: number }>();

router.post("/v1/auth/login", async (req, res): Promise<void> => {
  const input = LoginBody.safeParse(req.body);
  if (!input.success || input.data.email.length > 255 || input.data.password.length > 256) {
    res.status(400).json({ error: "Invalid login request" });
    return;
  }
  const email = input.data.email.trim().toLowerCase();
  const key = `${req.ip ?? "unknown"}:${email}`;
  const record = failures.get(key);
  if (record && record.count >= 5 && record.until > Date.now()) {
    await audit(req, "login_failed", 429);
    res.status(429).json({ error: "Too many attempts. Please try again later." });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  // Check a hash even for an unknown account to reduce obvious timing differences.
  const dummyHash = "$2b$12$0nDfvXVLbRm4xK2Ad2Sw7uqY8lNqsAoYSrh0IXyxmBm4rKiL5Qsxe";
  const valid = await compare(input.data.password, user?.passwordHash ?? dummyHash);
  if (!user?.active || !valid) {
    failures.set(key, { count: record?.until && record.until > Date.now() ? record.count + 1 : 1, until: Date.now() + 15 * 60_000 });
    await audit(req, "login_failed", 401);
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  failures.delete(key);
  const token = await issueToken(user);
  await audit(req, "login_success", 200, user.id);
  res.json(LoginResponse.parse({ token, user: account(user) }));
});

router.post("/v1/auth/logout", authenticate, async (req, res): Promise<void> => {
  await audit(req, "logout", 204);
  res.sendStatus(204);
});

router.get("/v1/me", authenticate, async (req, res): Promise<void> => {
  await audit(req, "account_access", 200);
  res.json(GetMeResponse.parse(account(req.labUser!)));
});

export default router;