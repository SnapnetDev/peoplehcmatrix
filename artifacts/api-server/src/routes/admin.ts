import { Router, type IRouter } from "express";
import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db, auditTable, employeesTable, settingsTable, usersTable } from "@workspace/db";
import {
  CreateUserBody, CreateUserResponse, ListAuditResponse, ListSettingsResponse,
  ListUsersResponse, UpdateSettingBody, UpdateSettingResponse,
  UpdateUserBody, UpdateUserResponse,
} from "@workspace/api-zod";
import { account, audit, authenticate, positiveId, requireRole } from "../lib/lab-auth";

const router: IRouter = Router();
router.use("/v1/admin", authenticate);
router.use("/v1/audit", authenticate, requireRole("SYSTEM_ADMIN"));
const allowedSettings = new Set(["companyName", "leaveAllowance"]);

router.get("/v1/admin/users", requireRole("SYSTEM_ADMIN"), async (_req, res): Promise<void> => {
  const rows = await db.select().from(usersTable).orderBy(usersTable.id);
  res.json(ListUsersResponse.parse(rows.map(account)));
});

router.post("/v1/admin/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success || !req.body ||
      Object.keys(req.body).some((key) => !Object.keys(parsed.data ?? {}).includes(key))) {
    res.status(400).json({ error: "Invalid account" }); return;
  }
  const input = parsed.data;
  const email = input.email.trim().toLowerCase();
  if (!email.endsWith("@peoplematrix.test") ||
      input.password.length < 12 || input.password.length > 128 ||
      (input.role !== "SYSTEM_ADMIN" && !input.employeeId)) {
    res.status(400).json({ error: "Use a lab email, a strong password and an employee" }); return;
  }
  if (input.employeeId) {
    const [employee] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(eq(employeesTable.id, input.employeeId));
    if (!employee) { res.status(400).json({ error: "Unknown employee" }); return; }
    const [linked] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.employeeId, input.employeeId)).limit(1);
    if (linked) { res.status(409).json({ error: "Employee already has an account" }); return; }
  }
  const existing = await db.select({ id: usersTable.id }).from(usersTable)
    .where(eq(usersTable.email, email)).limit(1);
  if (existing.length) { res.status(409).json({ error: "Account already exists" }); return; }
  const [row] = await db.insert(usersTable).values({
    email, passwordHash: await hash(input.password, 12), role: input.role,
    employeeId: input.employeeId ?? null,
  }).returning();
  await audit(req, "user_created", 201);
  res.status(201).json(CreateUserResponse.parse(account(row)));
});

router.put("/v1/admin/users/:id", requireRole("SYSTEM_ADMIN"), async (req, res): Promise<void> => {
  const id = positiveId(req.params.id);
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!id || !parsed.success || !req.body || Object.keys(req.body).length === 0 ||
      Object.keys(req.body).some((key) => !Object.keys(parsed.data ?? {}).includes(key))) {
    res.status(400).json({ error: "Invalid account update" }); return;
  }
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Account not found" }); return; }
  if (existing.id === req.labUser!.id &&
      (parsed.data.active === false || (parsed.data.role && parsed.data.role !== "SYSTEM_ADMIN"))) {
    res.status(409).json({ error: "Cannot remove your own administrator access" }); return;
  }
  if (existing.role === "SYSTEM_ADMIN" &&
      (parsed.data.active === false || (parsed.data.role && parsed.data.role !== "SYSTEM_ADMIN"))) {
    const activeAdmins = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.role, "SYSTEM_ADMIN"), eq(usersTable.active, true)));
    if (activeAdmins.filter((u) => u.id !== id).length === 0) {
      res.status(409).json({ error: "At least one administrator is required" }); return;
    }
  }
  if (parsed.data.role && parsed.data.role !== "SYSTEM_ADMIN" && !existing.employeeId) {
    res.status(400).json({ error: "An employee record is required for this role" }); return;
  }
  const { password, ...rest } = parsed.data;
  const [row] = await db.update(usersTable).set({
    ...rest, ...(password ? { passwordHash: await hash(password, 12) } : {}),
  }).where(eq(usersTable.id, id)).returning();
  await audit(req, "user_updated", 200);
  res.json(UpdateUserResponse.parse(account(row)));
});

router.get("/v1/admin/settings", requireRole("SYSTEM_ADMIN"), async (_req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable).orderBy(settingsTable.key);
  res.json(ListSettingsResponse.parse(rows));
});

router.put("/v1/admin/settings", requireRole("SYSTEM_ADMIN"), async (req, res): Promise<void> => {
  const parsed = UpdateSettingBody.safeParse(req.body);
  if (!parsed.success || !req.body || Object.keys(req.body).length !== 2 ||
      !allowedSettings.has(parsed.data.key) || parsed.data.value.length > 100 ||
      (parsed.data.key === "leaveAllowance" && !/^(?:[1-9]|[1-5]\d|60)$/.test(parsed.data.value))) {
    res.status(400).json({ error: "Invalid setting" }); return;
  }
  const [row] = await db.insert(settingsTable).values(parsed.data)
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: parsed.data.value } }).returning();
  await audit(req, "setting_updated", 200);
  res.json(UpdateSettingResponse.parse(row));
});

router.get("/v1/audit", async (_req, res): Promise<void> => {
  const rows = await db.select().from(auditTable)
    .orderBy(auditTable.id).limit(250);
  res.json(ListAuditResponse.parse(rows.map((row) => ({
    ...row, createdAt: row.createdAt.toISOString(),
  }))));
});

export default router;