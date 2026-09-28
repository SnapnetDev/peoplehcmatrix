import type { employeesTable, leaveTable, performanceTable } from "@workspace/db";

type Employee = typeof employeesTable.$inferSelect;
export function summary(e: Employee) {
  return {
    id: e.id, firstName: e.firstName, lastName: e.lastName,
    email: e.email, jobTitle: e.jobTitle, department: e.department,
    managerId: e.managerId,
  };
}
export function profile(e: Employee) {
  return {
    ...summary(e), phone: e.phone, employmentDate: e.employmentDate,
    employmentStatus: e.employmentStatus, address: e.address,
    emergencyContact: e.emergencyContact, leaveBalance: e.leaveBalance,
  };
}
export function leave(record: typeof leaveTable.$inferSelect) {
  return { ...record, createdAt: record.createdAt.toISOString() };
}
export function performance(record: typeof performanceTable.$inferSelect) {
  return { ...record, createdAt: record.createdAt.toISOString() };
}