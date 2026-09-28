import { gt } from "drizzle-orm";
import { auditTable, db, pool } from "@workspace/db";

// Run only on the assessor's isolated lab host; output is private JSON Lines.
async function exportAudit() {
  if (process.env.LAB_ISOLATED_DB !== "1" || !process.env.DATABASE_URL) {
    throw new Error("Audit export requires LAB_ISOLATED_DB=1 and the isolated lab DATABASE_URL");
  }
  let lastId = 0;
  while (true) {
    const rows = await db.select().from(auditTable)
      .where(gt(auditTable.id, lastId)).orderBy(auditTable.id).limit(500);
    for (const row of rows) {
      process.stdout.write(`${JSON.stringify({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })}\n`);
    }
    if (rows.length < 500) return;
    lastId = rows[rows.length - 1].id;
  }
}

exportAudit().catch((error: unknown) => {
  process.stderr.write(`Audit export failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}).finally(() => pool.end());