import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  db, pool, employeesTable, usersTable, payrollTable,
  leaveTable, performanceTable, settingsTable,
} from "@workspace/db";
import { logger } from "./lib/logger";

const departments = [
  "Finance", "Human Resources", "Information Technology", "Sales",
  "Marketing", "Operations", "Legal", "Procurement",
  "Customer Service", "Internal Audit",
];
const firstNames = [
  "Adanna", "Bolanle", "Chidi", "Damilola", "Efe", "Folake", "Gbenga", "Hauwa",
  "Ikenna", "Jumoke", "Kene", "Lami", "Morenike", "Nneka", "Obinna", "Pelumi",
  "Rukayat", "Seyi", "Temitope", "Uche", "Yewande", "Zubairu",
];
const lastNames = [
  "Adebayo", "Okonkwo", "Balogun", "Eze", "Ibrahim", "Olatunji", "Nwosu",
  "Bello", "Adeyemi", "Okafor", "Danladi", "Ogunleye", "Udo", "Salami",
];

async function seed() {
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: employeesTable.id }).from(employeesTable).limit(1);
    if (existing.length) {
      logger.info("Lab already seeded; no records changed");
      return;
    }
    const managers: number[] = [];
    const employees: number[] = [];
    for (let i = 0; i < 75; i++) {
      const departmentIndex = i % departments.length;
      const [row] = await tx.insert(employeesTable).values({
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[(i * 3) % lastNames.length],
        email: `synthetic.employee${String(i + 1).padStart(2, "0")}@example.invalid`,
        phone: `+234-000-000-${String(i + 1).padStart(4, "0")}`,
        jobTitle: i < 10 ? `${departments[i]} Manager` : [
          "Analyst", "Specialist", "Coordinator", "Associate",
        ][Math.floor(i / 10) % 4],
        department: departments[departmentIndex],
        managerId: i < 10 ? null : managers[departmentIndex],
        employmentDate: `202${i % 5}-0${(i % 9) + 1}-01`,
        employmentStatus: "Active",
        salary: String(350000 + (i % 12) * 42500),
        bankName: "Fictional Lab Bank",
        bankAccount: `TEST-ACCOUNT-${String(i + 1).padStart(4, "0")}`,
        syntheticNin: `TEST-NIN-${String(i + 1).padStart(4, "0")}`,
        address: `Synthetic address ${i + 1}, Fictional District — training record`,
        emergencyContact: `Synthetic contact ${i + 1}`,
        leaveBalance: 12 + (i % 14),
      }).returning({ id: employeesTable.id });
      employees.push(row.id);
      if (i < 10) managers.push(row.id);
    }
    const accounts = [
      { email: "employee1@peoplematrix.test", password: "Employee-Lab-Only-2026!", role: "EMPLOYEE" as const, employeeId: employees[10] },
      { email: "manager1@peoplematrix.test", password: "Manager-Lab-Only-2026!", role: "MANAGER" as const, employeeId: employees[0] },
      { email: "hradmin@peoplematrix.test", password: "HRAdmin-Lab-Only-2026!", role: "HR_ADMIN" as const, employeeId: employees[11] },
      { email: "sysadmin@peoplematrix.test", password: "SysAdmin-Lab-Only-2026!", role: "SYSTEM_ADMIN" as const, employeeId: null },
    ];
    for (const item of accounts) {
      await tx.insert(usersTable).values({
        email: item.email, passwordHash: await hash(item.password, 12),
        role: item.role, employeeId: item.employeeId,
      });
    }
    const [manager] = await tx.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.email, "manager1@peoplematrix.test"));
    const [hr] = await tx.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.email, "hradmin@peoplematrix.test"));
    await tx.insert(payrollTable).values(employees.map((employeeId, i) => {
      const gross = 350000 + (i % 12) * 42500;
      const deductions = Math.round(gross * 0.13);
      return {
        employeeId, period: "2026-09", gross: String(gross),
        deductions: String(deductions), net: String(gross - deductions),
        paymentDate: "2026-09-25",
      };
    }));
    await tx.insert(leaveTable).values(employees.slice(0, 20).map((employeeId, i) => ({
      employeeId, type: i % 3 ? "Annual" : "Personal",
      startsOn: "2026-10-12", endsOn: "2026-10-14",
      reason: "Synthetic leave request for assessment training",
      status: i % 3 === 0 ? "PENDING" as const : "APPROVED" as const,
      reviewerId: i % 3 === 0 ? null : hr.id,
    })));
    await tx.insert(performanceTable).values(employees.slice(10, 30).map((employeeId, i) => ({
      employeeId, reviewerId: i === 0 ? manager.id : hr.id,
      period: "2026 Q3", rating: 3 + (i % 3),
      comment: "Synthetic quarterly review: consistent progress on team goals.",
    })));
    await tx.insert(settingsTable).values([
      { key: "companyName", value: "PeopleMatrix Demo Organisation" },
      { key: "leaveAllowance", value: "20" },
    ]);
    logger.info({ employees: employees.length, accounts: accounts.length }, "Lab seed completed");
  });
}

seed().catch((error: unknown) => {
  logger.error({ error }, "Lab seed failed");
  process.exitCode = 1;
}).finally(() => pool.end());