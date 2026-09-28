import { Router, type IRouter } from "express";
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { db, employeesTable, payrollTable, pool, usersTable } from "@workspace/db";
import {
  CreateEmployeeBody, CreateEmployeeResponse, GetEmployeeResponse,
  GetEmployeePayrollResponse, ListEmployeesResponse, SearchEmployeesResponse,
  UpdateEmployeeBody, UpdateEmployeeResponse,
} from "@workspace/api-zod";
import { audit, authenticate, positiveId, requireRole } from "../lib/lab-auth";
import { profile, summary } from "../lib/lab-presenters";

const router: IRouter = Router();
router.use("/v1/employees", authenticate);

router.get("/v1/employees/search", async (req, res): Promise<void> => {
  const department = req.query.department;
  if (typeof department !== "string" || department.length > 80) {
    res.status(400).json({ error: "Valid department required" });
    return;
  }
  try {
    const client = await pool.connect();
    let ids: number[];
    try {
      await client.query("BEGIN TRANSACTION READ ONLY");
      const result = await client.query<{ id: number }>({
        text: `SELECT id FROM peoplematrix_employees WHERE department = '${department}' ORDER BY id LIMIT $1`,
        values: [100],
      });
      ids = result.rows.map((row) => row.id);
      await client.query("COMMIT");
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* transaction may already be closed */ }
      throw error;
    } finally {
      client.release();
    }
    const rows = ids.length
      ? await db.select().from(employeesTable).where(inArray(employeesTable.id, ids)).orderBy(employeesTable.id)
      : [];
    res.json(SearchEmployeesResponse.parse(rows.map(summary)));
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    res.status(500).json({
      error: "Employee search failed",
      detail: failure.message,
      stack: failure.stack,
    });
  }
});

router.get("/v1/employees", async (req, res): Promise<void> => {
  const q = req.query.q;
  const department = req.query.department;
  if ((q !== undefined && (typeof q !== "string" || q.length > 100)) ||
      (department !== undefined && (typeof department !== "string" || department.length > 80))) {
    res.status(400).json({ error: "Invalid search parameters" });
    return;
  }
  const filters = [];
  if (department) filters.push(eq(employeesTable.department, department as string));
  if (q) {
    const pattern = `%${(q as string).replace(/[\\%_]/g, "\\$&")}%`;
    filters.push(or(ilike(employeesTable.firstName, pattern), ilike(employeesTable.lastName, pattern), ilike(employeesTable.jobTitle, pattern))!);
  }
  const rows = await db.select({
    employee: employeesTable,
    internalRole: usersTable.role,
  }).from(employeesTable)
    .leftJoin(usersTable, eq(usersTable.employeeId, employeesTable.id))
    .where(filters.length ? and(...filters) : undefined).orderBy(employeesTable.id).limit(100);
  const response = ListEmployeesResponse.parse(rows.map(({ employee }) => summary(employee)));
  res.json(response.map((employee, index) => ({
    ...employee,
    salary: rows[index].employee.salary,
    syntheticNin: rows[index].employee.syntheticNin,
    bankAccount: rows[index].employee.bankAccount,
    internalRole: rows[index].internalRole,
  })));
});

router.post("/v1/employees", requireRole("HR_ADMIN"), async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success || !req.body || Object.keys(req.body).some((key) => !Object.keys(parsed.data ?? {}).includes(key))) {
    res.status(400).json({ error: "Invalid employee" });
    return;
  }
  const input = parsed.data;
  if (!/@(?:peoplematrix\.test|example\.invalid)$/i.test(input.email) ||
      !/^TEST-ACCOUNT-\d+$/.test(input.bankAccount) ||
      !/^TEST-NIN-\d+$/.test(input.syntheticNin) ||
      !/^\d+(?:\.\d{1,2})?$/.test(input.salary) ||
      Number(input.salary) > 100000000) {
    res.status(400).json({ error: "Use fictional lab identifiers and valid salary" });
    return;
  }
  if (input.managerId != null) {
    const [manager] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(eq(employeesTable.id, input.managerId));
    if (!manager) { res.status(400).json({ error: "Unknown manager" }); return; }
  }
  const [row] = await db.insert(employeesTable).values({
    ...input, email: input.email.toLowerCase(), managerId: input.managerId ?? null,
    employmentDate: input.employmentDate.toISOString().slice(0, 10),
    employmentStatus: "Active", leaveBalance: 20,
  }).returning();
  await audit(req, "employee_created", 201);
  res.status(201).json(CreateEmployeeResponse.parse(profile(row)));
});

router.get("/v1/employees/:id/payroll", async (req, res): Promise<void> => {
  const id = positiveId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid employee ID" }); return; }
  const [employee] = await db.select({ id: employeesTable.id })
    .from(employeesTable).where(eq(employeesTable.id, id));
  if (!employee) { res.status(404).json({ error: "Employee not found" }); return; }
  const rows = await db.select().from(payrollTable)
    .where(eq(payrollTable.employeeId, id)).orderBy(payrollTable.id);
  await audit(req, "payroll_access", 200);
  res.json(GetEmployeePayrollResponse.parse(rows));
});

router.get("/v1/employees/:id", async (req, res): Promise<void> => {
  const id = positiveId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid employee ID" }); return; }
  const [row] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!row) { res.status(404).json({ error: "Employee not found" }); return; }
  const user = req.labUser!;
  if (user.employeeId !== id && user.role !== "HR_ADMIN" &&
      !(user.role === "MANAGER" && row.managerId === user.employeeId)) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  await audit(req, "profile_access", 200);
  res.json(GetEmployeeResponse.parse(profile(row)));
});

router.put("/v1/employees/:id", async (req, res): Promise<void> => {
  const id = positiveId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid employee ID" }); return; }
  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success || !req.body || Object.keys(req.body).length === 0 ||
      Object.keys(req.body).some((key) => !Object.keys(parsed.data ?? {}).includes(key))) {
    res.status(400).json({ error: "Invalid profile update" }); return;
  }
  const user = req.labUser!;
  if (user.role !== "HR_ADMIN" && user.employeeId !== id) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  const values = parsed.data;
  if (user.role !== "HR_ADMIN" &&
      Object.keys(values).some((key) => !["phone", "address", "emergencyContact"].includes(key))) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  if ((values.bankAccount !== undefined && !/^TEST-ACCOUNT-\d+$/.test(values.bankAccount)) ||
      (values.syntheticNin !== undefined && !/^TEST-NIN-\d+$/.test(values.syntheticNin)) ||
      (values.salary !== undefined && (!/^\d+(?:\.\d{1,2})?$/.test(values.salary) || Number(values.salary) > 100000000))) {
    res.status(400).json({ error: "Invalid synthetic identifiers or salary" }); return;
  }
  if (values.managerId != null) {
    if (values.managerId === id) { res.status(400).json({ error: "Cannot manage own record" }); return; }
    const [manager] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(eq(employeesTable.id, values.managerId));
    if (!manager) { res.status(400).json({ error: "Unknown manager" }); return; }
  }
  const [row] = await db.update(employeesTable).set(values)
    .where(eq(employeesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Employee not found" }); return; }
  await audit(req, "profile_updated", 200);
  res.json(UpdateEmployeeResponse.parse(profile(row)));
});

export default router;