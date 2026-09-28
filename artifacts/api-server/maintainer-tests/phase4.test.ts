import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, performanceTable, pool, usersTable } from "@workspace/db";

// These checks deliberately verify the isolated training exercise, not production security.
// They create and remove only synthetic test rows. Never point them at a live HR database.
const host = process.env.LAB_BASE_URL ??
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
const url = new URL(host);
if (process.env.LAB_ISOLATED_DB !== "1") {
  throw new Error("Set LAB_ISOLATED_DB=1 after confirming this is an isolated, synthetic development database");
}
if (!["localhost", "127.0.0.1"].includes(url.hostname) && !url.hostname.endsWith(".replit.dev")) {
  throw new Error("Lab verification is restricted to localhost or a Replit development domain");
}

type Person = {
  id: number; department: string; salary?: string; syntheticNin?: string;
  bankAccount?: string; internalRole?: string | null;
};
type TokenResponse = { token: string; user: { employeeId: number | null } };
type RecordId = { id: number };

const setup = readFileSync(new URL("../../../docs/PHASE2_SETUP.md", import.meta.url), "utf8");
function credentials(role: string) {
  const line = setup.split("\n").find((entry) => entry.startsWith(`| ${role} |`));
  const fields = [...(line ?? "").matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  assert.equal(fields.length, 2, `Missing synthetic ${role} account in setup document`);
  return { email: fields[0], password: fields[1] };
}

async function request<T = unknown>(
  path: string, token?: string, init: RequestInit = {},
): Promise<{ status: number; headers: Headers; body: T }> {
  const response = await fetch(new URL(path, url), {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: (text ? JSON.parse(text) : null) as T };
}

async function login(role: string) {
  const response = await request<TokenResponse>("/api/v1/auth/login", undefined, {
    method: "POST", body: JSON.stringify(credentials(role)),
  });
  assert.equal(response.status, 200, `${role} test login must succeed`);
  assert.ok(response.body.token);
  return response.body;
}

let employee: TokenResponse;
let manager: TokenResponse;
let administrator: TokenResponse;
let directory: Person[];

before(async () => {
  employee = await login("Employee");
  manager = await login("Manager");
  const hrAdministrator = await login("HR administrator");
  administrator = await login("System administrator");
  for (const session of [employee, manager, hrAdministrator, administrator]) {
    const self = await request("/api/v1/me", session.token);
    assert.equal(self.status, 200, "Each seeded role must reach its own account");
  }
  const list = await request<Person[]>("/api/v1/employees", employee.token);
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 75, "A fresh synthetic directory must contain 75 employees");
  directory = list.body;
});

after(async () => {
  await pool.end();
});

test("1 — payroll object access differs from protected profiles", async () => {
  const own = employee.user.employeeId;
  assert.ok(own);
  const other = directory.find((person) => person.id !== own);
  assert.ok(other);
  const self = await request<{ employeeId: number }[]>(`/api/v1/employees/${own}/payroll`, employee.token);
  const cross = await request<{ employeeId: number }[]>(`/api/v1/employees/${other.id}/payroll`, employee.token);
  const protectedProfile = await request(`/api/v1/employees/${other.id}`, employee.token);
  const anonymous = await request(`/api/v1/employees/${other.id}/payroll`);
  assert.equal(self.status, 200);
  assert.equal(cross.status, 200);
  assert.ok(cross.body.some((item) => item.employeeId === other.id));
  assert.equal(protectedProfile.status, 403);
  assert.equal(anonymous.status, 401);
});

test("2 — an employee can create an account, but cannot list or update accounts", async () => {
  const email = `maintainer-${randomUUID().replaceAll("-", "").slice(0, 12)}@peoplematrix.test`;
  const payload = { email, password: `${randomUUID()}-LabOnly`, role: "SYSTEM_ADMIN", employeeId: null };
  const body = JSON.stringify(payload);
  const anonymous = await request("/api/v1/admin/users", undefined, { method: "POST", body });
  const listed = await request("/api/v1/admin/users", employee.token);
  assert.equal(anonymous.status, 401);
  assert.equal(listed.status, 403);
  let createdId: number | undefined;
  try {
    const created = await request<RecordId>("/api/v1/admin/users", employee.token, { method: "POST", body });
    assert.equal(created.status, 201);
    createdId = created.body.id;
    assert.ok(createdId);
    const deniedUpdate = await request(`/api/v1/admin/users/${createdId}`, employee.token, {
      method: "PUT", body: JSON.stringify({ active: false }),
    });
    assert.equal(deniedUpdate.status, 403);
  } finally {
    if (createdId) await db.delete(usersTable).where(eq(usersTable.id, createdId));
  }
});

test("3 — department filter expands on a boolean probe, ordinary search does not", async () => {
  const department = directory[0].department;
  assert.ok(directory.some((person) => person.department !== department));
  const normal = await request<Person[]>(`/api/v1/employees/search?department=${encodeURIComponent(department)}`, employee.token);
  const probe = `${department}' OR '1'='1`;
  const expanded = await request<Person[]>(`/api/v1/employees/search?department=${encodeURIComponent(probe)}`, employee.token);
  const ordinary = await request<Person[]>(`/api/v1/employees?q=${encodeURIComponent(probe)}`, employee.token);
  assert.equal(normal.status, 200);
  assert.equal(expanded.status, 200);
  assert.equal(ordinary.status, 200);
  assert.ok(normal.body.length > 0);
  assert.ok(expanded.body.length > normal.body.length);
  assert.ok(ordinary.body.length < expanded.body.length);
});

test("4 — a manager comment survives as HTML and only that field uses the HTML renderer", async () => {
  const team = await request<Person[]>("/api/v1/manager/team", manager.token);
  assert.equal(team.status, 200);
  assert.ok(team.body.length > 0);
  const comment = `<img src=x onerror="window.__peopleMatrixLabProof=true">`;
  let createdId: number | undefined;
  try {
    const created = await request<RecordId>("/api/v1/performance/comments", manager.token, {
      method: "POST",
      body: JSON.stringify({ employeeId: team.body[0].id, period: "LAB-CHECK", rating: 3, comment }),
    });
    assert.equal(created.status, 201);
    createdId = created.body.id;
    const result = await request<{ id: number; comment: string }[]>("/api/v1/performance", manager.token);
    assert.equal(result.status, 200);
    assert.equal(result.body.find((item) => item.id === createdId)?.comment, comment);
    const frontend = readFileSync(new URL("../../peoplematrix/src/App.tsx", import.meta.url), "utf8");
    assert.match(frontend, /dangerouslySetInnerHTML=\{\{\s*__html:\s*r\.comment\s*\}\}/);
    assert.equal((frontend.match(/dangerouslySetInnerHTML/g) ?? []).length, 1);
  } finally {
    if (createdId) await db.delete(performanceTable).where(eq(performanceTable.id, createdId));
  }
});

test("5 — logout leaves an otherwise valid JWT usable until expiry", async () => {
  const fresh = await login("Employee");
  const signedOut = await request("/api/v1/auth/logout", fresh.token, { method: "POST" });
  const replay = await request("/api/v1/me", fresh.token);
  const invalid = await request("/api/v1/me", `${fresh.token}invalid`);
  assert.equal(signedOut.status, 204);
  assert.equal(replay.status, 200);
  assert.equal(invalid.status, 401);
});

test("6 — directory API returns extra synthetic fields absent from the filtered search", async () => {
  const item = directory[0];
  assert.match(item.salary ?? "", /^\d/);
  assert.match(item.syntheticNin ?? "", /^TEST-NIN-/);
  assert.match(item.bankAccount ?? "", /^TEST-ACCOUNT-/);
  assert.ok(Object.hasOwn(item, "internalRole"));
  const filtered = await request<Person[]>(
    `/api/v1/employees/search?department=${encodeURIComponent(item.department)}`, employee.token,
  );
  assert.equal(filtered.status, 200);
  assert.ok(filtered.body.length > 0);
  assert.ok(!Object.hasOwn(filtered.body[0], "salary"));
  assert.ok(!Object.hasOwn(filtered.body[0], "bankAccount"));
});

test("7 — scoped verbose error and version/header hardening gaps", async () => {
  const broken = await request<{ detail?: string; stack?: string }>(
    "/api/v1/employees/search?department=%27", employee.token,
  );
  const header = await request("/api/healthz");
  const otherError = await request<{ error: string }>("/api/v1/employees/not-an-id", employee.token);
  assert.equal(broken.status, 500);
  assert.ok(broken.body.detail);
  assert.ok(broken.body.stack);
  assert.equal(header.headers.get("x-server-version"), "1.0.0");
  assert.equal(header.headers.get("x-frame-options"), null);
  assert.equal(header.headers.get("x-content-type-options"), "nosniff");
  assert.match(header.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(otherError.status, 400);
  assert.ok(!Object.hasOwn(otherError.body, "stack"));
});

test("8 — wildcard CORS is limited to an anonymous, fixed health response", async () => {
  const health = await request<{ status: string }>("/api/healthz");
  const privateResponse = await request("/api/v1/me", employee.token);
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { status: "ok" });
  assert.equal(health.headers.get("access-control-allow-origin"), "*");
  assert.equal(health.headers.get("access-control-allow-credentials"), null);
  assert.equal(privateResponse.status, 200);
  assert.equal(privateResponse.headers.get("access-control-allow-origin"), null);
});