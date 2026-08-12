/**
 * Import only ACTIVE keys from a PostgreSQL backup.sql (pg_dump COPY format).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx script/import-active-keys.ts [path-to-backup.sql]
 *
 * Default backup path: ./backup.sql (or pass path as first argument)
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { db } from "../server/db";
import { keys } from "@shared/schema";

const BACKUP_PATH = process.argv[2] || resolve(process.cwd(), "backup.sql");

// Backup COPY format: id \t key_code \t duration_months \t price \t status \t hwid \t created_at \t activated_at \t expires_at \t notes
function parseNull(val: string): string | null {
  if (!val || val === "\\N") return null;
  return val;
}

function parseDate(val: string): Date | null {
  const s = parseNull(val);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function extractKeysCopyBlock(content: string): string[] {
  const copyStart = "COPY public.keys (id, key_code, duration_months, price, status, hwid, created_at, activated_at, expires_at, notes) FROM stdin;";
  const idx = content.indexOf(copyStart);
  if (idx === -1) {
    throw new Error("Could not find COPY public.keys block in backup file.");
  }
  const after = content.slice(idx + copyStart.length);
  const lines: string[] = [];
  for (const line of after.split("\n")) {
    if (line === "\\.") break;
    lines.push(line);
  }
  return lines;
}

function parseKeyRow(line: string): {
  keyCode: string;
  durationMonths: number;
  price: string;
  status: "active";
  hwid: string | null;
  createdAt: Date;
  activatedAt: Date | null;
  expiresAt: Date | null;
  notes: string | null;
} | null {
  const parts = line.split("\t");
  if (parts.length < 10) return null;
  const [, keyCode, durationMonths, price, status, hwid, createdAt, activatedAt, expiresAt, notes] = parts;
  if (status !== "active") return null;

  const dur = parseInt(durationMonths, 10);
  if (isNaN(dur) || !keyCode?.trim()) return null;

  return {
    keyCode: keyCode.trim(),
    durationMonths: dur,
    price: price?.trim() || "0",
    status: "active",
    hwid: parseNull(hwid),
    createdAt: parseDate(createdAt) || new Date(),
    activatedAt: parseDate(activatedAt),
    expiresAt: parseDate(expiresAt),
    notes: parseNull(notes),
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required. Set it to your NEW web database.");
    process.exit(1);
  }

  console.log("Reading backup:", BACKUP_PATH);
  const content = readFileSync(BACKUP_PATH, "utf-8");

  const lines = extractKeysCopyBlock(content);
  console.log("Total key rows in backup:", lines.length);

  const activeRows: NonNullable<ReturnType<typeof parseKeyRow>>[] = [];
  for (const line of lines) {
    const row = parseKeyRow(line);
    if (row) activeRows.push(row);
  }

  console.log("Active keys to import:", activeRows.length);
  if (activeRows.length === 0) {
    console.log("No active keys found. Done.");
    return;
  }

  let inserted = 0;
  let skipped = 0;

  for (const row of activeRows) {
    try {
      const result = await db
        .insert(keys)
        .values({
          keyCode: row.keyCode,
          durationMonths: row.durationMonths,
          price: row.price,
          status: "active",
          hwid: row.hwid,
          createdAt: row.createdAt,
          activatedAt: row.activatedAt,
          expiresAt: row.expiresAt,
          notes: row.notes,
        })
        .onConflictDoNothing({ target: [keys.keyCode] })
        .returning({ id: keys.id });
      if (result.length > 0) inserted++;
      else skipped++;
      if ((inserted + skipped) % 50 === 0) console.log("  ...", inserted, "inserted,", skipped, "skipped");
    } catch (e) {
      skipped++;
      if (skipped <= 3) console.warn("  Error:", row.keyCode, String(e));
    }
  }

  console.log("Done. Inserted:", inserted, "| Skipped (duplicate/error):", skipped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
