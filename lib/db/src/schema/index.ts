import {
  pgTable,
  pgEnum,
  integer,
  serial,
  text,
  varchar,
  date,
  numeric,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("peoplematrix_role", [
  "EMPLOYEE",
  "MANAGER",
  "HR_ADMIN",
  "SYSTEM_ADMIN",
]);
export const leaveStatusEnum = pgEnum("peoplematrix_leave_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const employeesTable = pgTable(
  "peoplematrix_employees",
  {
    id: serial("id").primaryKey(),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    phone: varchar("phone", { length: 40 }).notNull(),
    jobTitle: varchar("job_title", { length: 120 }).notNull(),
    department: varchar("department", { length: 80 }).notNull(),
    managerId: integer("manager_id"),
    employmentDate: date("employment_date").notNull(),
    employmentStatus: varchar("employment_status", { length: 30 }).notNull(),
    salary: numeric("salary", { precision: 14, scale: 2 }).notNull(),
    bankName: varchar("bank_name", { length: 80 }).notNull(),
    bankAccount: varchar("bank_account", { length: 32 }).notNull(),
    syntheticNin: varchar("synthetic_nin", { length: 32 }).notNull(),
    address: text("address").notNull(),
    emergencyContact: varchar("emergency_contact", { length: 120 }).notNull(),
    leaveBalance: integer("leave_balance").notNull().default(20),
  },
  (table) => [index("peoplematrix_employee_manager_idx").on(table.managerId)],
);

export const usersTable = pgTable("peoplematrix_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  employeeId: integer("employee_id").unique().references(() => employeesTable.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payrollTable = pgTable(
  "peoplematrix_payroll",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
    period: varchar("period", { length: 7 }).notNull(),
    gross: numeric("gross", { precision: 14, scale: 2 }).notNull(),
    deductions: numeric("deductions", { precision: 14, scale: 2 }).notNull(),
    net: numeric("net", { precision: 14, scale: 2 }).notNull(),
    paymentDate: date("payment_date").notNull(),
  },
  (table) => [index("peoplematrix_payroll_employee_idx").on(table.employeeId)],
);

export const leaveTable = pgTable(
  "peoplematrix_leave",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
    type: varchar("type", { length: 40 }).notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    reason: text("reason").notNull(),
    status: leaveStatusEnum("status").notNull().default("PENDING"),
    reviewerId: integer("reviewer_id").references(() => usersTable.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("peoplematrix_leave_employee_idx").on(table.employeeId)],
);

export const performanceTable = pgTable(
  "peoplematrix_performance",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
    reviewerId: integer("reviewer_id").notNull().references(() => usersTable.id),
    period: varchar("period", { length: 30 }).notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("peoplematrix_performance_employee_idx").on(table.employeeId)],
);

export const auditTable = pgTable(
  "peoplematrix_audit",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    userId: integer("user_id"),
    ip: varchar("ip", { length: 80 }),
    method: varchar("method", { length: 12 }).notNull(),
    endpoint: varchar("endpoint", { length: 255 }).notNull(),
    action: varchar("action", { length: 60 }).notNull(),
    status: integer("status").notNull(),
  },
  (table) => [index("peoplematrix_audit_created_idx").on(table.createdAt)],
);

export const settingsTable = pgTable("peoplematrix_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
});

export const revokedTokensTable = pgTable("peoplematrix_revoked_tokens", {
  jti: varchar("jti", { length: 80 }).primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});