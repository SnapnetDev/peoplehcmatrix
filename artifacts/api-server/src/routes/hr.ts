import { Router, type IRouter } from "express";
import { eq, inArray, or } from "drizzle-orm";
import { db, employeesTable, leaveTable, payrollTable, performanceTable } from "@workspace/db";
import {
  CreateLeaveBody, CreateLeaveResponse, CreatePerformanceCommentBody,
  CreatePerformanceCommentResponse, GetManagerTeamResponse, GetReportsResponse,
  ListLeaveResponse, ListPayrollResponse, ListPerformanceResponse,
  UpdateLeaveBody, UpdateLeaveResponse,
} from "@workspace/api-zod";
import { audit, authenticate, positiveId, requireRole } from "../lib/lab-auth";
import { leave, performance, summary } from "../lib/lab-presenters";

const router: IRouter = Router();
router.use("/v1/payroll", authenticate);
router.use("/v1/leave", authenticate);
router.use("/v1/performance", authenticate);
router.use("/v1/manager", authenticate);
router.use("/v1/reports", authenticate);

async function visibleIds(user: NonNullable<Express.Request["labUser"]>): Promise<number[]> {
  if (user.role === "HR_ADMIN") {
    return (await db.select({ id: employeesTable.id }).from(employeesTable)).map((e) => e.id);
  }
  const ids = user.employeeId ? [user.employeeId] : [];
  if (user.role === "MANAGER" && user.employeeId) {
    const reports = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(eq(employeesTable.managerId, user.employeeId));
    ids.push(...reports.map((e) => e.id));
  }
  return ids;
}

router.get("/v1/payroll", async (req, res): Promise<void> => {
  const user = req.labUser!;
  if (user.role !== "HR_ADMIN" && !user.employeeId) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  const rows = await db.select().from(payrollTable)
    .where(user.role === "HR_ADMIN" ? undefined : eq(payrollTable.employeeId, user.employeeId!))
    .orderBy(payrollTable.id).limit(500);
  await audit(req, "payroll_access", 200);
  res.json(ListPayrollResponse.parse(rows));
});

router.get("/v1/leave", async (req, res): Promise<void> => {
  const ids = await visibleIds(req.labUser!);
  const rows = ids.length
    ? await db.select().from(leaveTable).where(inArray(leaveTable.employeeId, ids)).orderBy(leaveTable.id).limit(500)
    : [];
  res.json(ListLeaveResponse.parse(rows.map(leave)));
});

router.post("/v1/leave", async (req, res): Promise<void> => {
  const user = req.labUser!;
  if (!user.employeeId) { res.status(403).json({ error: "No employee profile" }); return; }
  const parsed = CreateLeaveBody.safeParse(req.body);
  if (!parsed.success || !req.body ||
      Object.keys(req.body).some((key) => !Object.keys(parsed.data ?? {}).includes(key)) ||
      parsed.data.startsOn > parsed.data.endsOn ||
      parsed.data.reason.length > 1000 || parsed.data.type.length > 40) {
    res.status(400).json({ error: "Invalid leave request" }); return;
  }
  const [row] = await db.insert(leaveTable).values({
    ...parsed.data, employeeId: user.employeeId,
    startsOn: parsed.data.startsOn.toISOString().slice(0, 10),
    endsOn: parsed.data.endsOn.toISOString().slice(0, 10),
  }).returning();
  await audit(req, "leave_requested", 201);
  res.status(201).json(CreateLeaveResponse.parse(leave(row)));
});

router.put("/v1/leave/:id", requireRole("MANAGER", "HR_ADMIN"), async (req, res): Promise<void> => {
  const id = positiveId(req.params.id);
  const parsed = UpdateLeaveBody.safeParse(req.body);
  if (!id || !parsed.success || !req.body || Object.keys(req.body).length !== 1 ||
      !["APPROVED", "REJECTED"].includes(parsed.data.status)) {
    res.status(400).json({ error: "Invalid leave decision" }); return;
  }
  const [existing] = await db.select().from(leaveTable).where(eq(leaveTable.id, id));
  if (!existing) { res.status(404).json({ error: "Leave request not found" }); return; }
  if (existing.status !== "PENDING") {
    res.status(409).json({ error: "Request already reviewed" }); return;
  }
  if (req.labUser!.role === "MANAGER") {
    const [report] = await db.select({ managerId: employeesTable.managerId }).from(employeesTable)
      .where(eq(employeesTable.id, existing.employeeId));
    if (report?.managerId !== req.labUser!.employeeId) {
      res.status(403).json({ error: "Access denied" }); return;
    }
  }
  const [row] = await db.update(leaveTable).set({
    status: parsed.data.status, reviewerId: req.labUser!.id, reviewedAt: new Date(),
  }).where(eq(leaveTable.id, id)).returning();
  await audit(req, "leave_reviewed", 200);
  res.json(UpdateLeaveResponse.parse(leave(row)));
});

router.get("/v1/performance", async (req, res): Promise<void> => {
  const ids = await visibleIds(req.labUser!);
  const requested = req.query.employeeId;
  if (requested !== undefined && (typeof requested !== "string" || !positiveId(requested))) {
    res.status(400).json({ error: "Invalid employee ID" }); return;
  }
  const allowed = requested ? [positiveId(requested as string)!] : ids;
  if (requested && !ids.includes(allowed[0])) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  const rows = allowed.length
    ? await db.select().from(performanceTable)
      .where(inArray(performanceTable.employeeId, allowed)).orderBy(performanceTable.id).limit(500)
    : [];
  res.json(ListPerformanceResponse.parse(rows.map(performance)));
});

router.post("/v1/performance/comments", requireRole("MANAGER", "HR_ADMIN"), async (req, res): Promise<void> => {
  const parsed = CreatePerformanceCommentBody.safeParse(req.body);
  if (!parsed.success || !req.body ||
      Object.keys(req.body).some((key) => !Object.keys(parsed.data ?? {}).includes(key)) ||
      parsed.data.rating < 1 || parsed.data.rating > 5 ||
      parsed.data.comment.length > 5000 || parsed.data.period.length > 30) {
    res.status(400).json({ error: "Invalid performance record" }); return;
  }
  const [employee] = await db.select().from(employeesTable)
    .where(eq(employeesTable.id, parsed.data.employeeId));
  if (!employee) { res.status(404).json({ error: "Employee not found" }); return; }
  if (req.labUser!.role === "MANAGER" && employee.managerId !== req.labUser!.employeeId) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  const [row] = await db.insert(performanceTable).values({
    ...parsed.data, reviewerId: req.labUser!.id,
  }).returning();
  await audit(req, "performance_updated", 201);
  res.status(201).json(CreatePerformanceCommentResponse.parse(performance(row)));
});

router.get("/v1/manager/team", requireRole("MANAGER"), async (req, res): Promise<void> => {
  const rows = await db.select().from(employeesTable)
    .where(eq(employeesTable.managerId, req.labUser!.employeeId!)).orderBy(employeesTable.id);
  res.json(GetManagerTeamResponse.parse(rows.map(summary)));
});

router.get("/v1/reports", requireRole("HR_ADMIN"), async (req, res): Promise<void> => {
  const employees = await db.select({ department: employeesTable.department }).from(employeesTable);
  const departmentCounts: Record<string, number> = {};
  for (const employee of employees) {
    departmentCounts[employee.department] = (departmentCounts[employee.department] ?? 0) + 1;
  }
  const pending = await db.select({ id: leaveTable.id }).from(leaveTable)
    .where(eq(leaveTable.status, "PENDING"));
  res.json(GetReportsResponse.parse({
    employeeCount: employees.length, departmentCounts, pendingLeave: pending.length,
  }));
});

export default router;