import { readFileSync } from "fs";
import { resolve } from "path";
import { db } from "../server/db";
import { keys } from "@shared/schema";

type KeyStatus = "unused" | "available" | "sold" | "active" | "expired" | "blacklisted";

const BACKUP_PATH = process.argv[2] || resolve(process.cwd(), "backup.sql");

function parseNull(val: string | undefined): string | null {
  if (!val || val === "\\N") return null;
  return val;
}

function parseDate(val: string | undefined): Date | null {
  const s = parseNull(val);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseIntSafe(val: string | undefined): number | null {
  const s = parseNull(val);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function parseStatus(val: string | undefined): KeyStatus {
  const s = (parseNull(val) || "").toLowerCase();
  if (s === "unused") return "unused";
  if (s === "available") return "available";
  if (s === "sold") return "sold";
  if (s === "active") return "active";
  if (s === "expired") return "expired";
  if (s === "blacklisted") return "blacklisted";
  return "available";
}

function findKeysCopyBlock(content: string): { columns: string[]; lines: string[] } {
  const re = /^COPY\s+(?:public\.)?keys\s*\(([^)]*)\)\s+FROM\s+stdin;$/m;
  const match = content.match(re);
  if (!match?.index) {
    throw new Error("COPY keys (...) FROM stdin; block not found in backup file");
  }
  const header = match[0];
  const colsRaw = match[1];
  const columns = colsRaw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const after = content.slice(match.index + header.length);
  const lines: string[] = [];
  for (const line of after.split("\n")) {
    if (line === "\\.") break;
    if (line.trim() === "") continue;
    lines.push(line);
  }
  return { columns, lines };
}

function mapRow(columns: string[], line: string) {
  const parts = line.split("\t");
  const row: Record<string, string | undefined> = {};
  for (let i = 0; i < columns.length; i++) row[columns[i]] = parts[i];

  const keyCode = (parseNull(row["key_code"]) || "").trim();
  if (!keyCode) return null;

  const durationMonths = Math.max(1, parseIntSafe(row["duration_months"]) || 1);
  const durationDays = parseIntSafe(row["duration_days"]);
  const price = (parseNull(row["price"]) || "0").trim() || "0";
  const status = parseStatus(row["status"]);
  const hwid = parseNull(row["hwid"]);
  const robloxUsername = parseNull(row["roblox_username"]);
  const notes = parseNull(row["notes"]);
  const createdAt = parseDate(row["created_at"]) || new Date();
  const activatedAt = parseDate(row["activated_at"]);
  const expiresAt = parseDate(row["expires_at"]);
  const executionCount = parseIntSafe(row["execution_count"]);
  const hwidResetAt = parseDate(row["hwid_reset_at"]);

  return {
    keyCode,
    durationMonths,
    durationDays,
    price,
    status,
    hwid,
    hwidResetAt,
    robloxUsername,
    executionCount,
    createdAt,
    activatedAt,
    expiresAt,
    notes,
    packageId: null,
    userId: null,
    orderId: null,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const content = readFileSync(BACKUP_PATH, "utf-8");
  const { columns, lines } = findKeysCopyBlock(content);

  const rows = lines
    .map((l) => mapRow(columns, l))
    .filter(Boolean) as NonNullable<ReturnType<typeof mapRow>>[];

  if (rows.length === 0) {
    console.log("No keys found in backup.");
    return;
  }

  const CHUNK = 500;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const result = await db
      .insert(keys)
      .values(
        batch.map((r) => ({
          keyCode: r.keyCode,
          durationMonths: r.durationMonths,
          durationDays: r.durationDays,
          price: r.price,
          status: r.status,
          packageId: null,
          userId: null,
          orderId: null,
          hwid: r.hwid,
          hwidResetAt: r.hwidResetAt,
          robloxUsername: r.robloxUsername,
          executionCount: r.executionCount ?? 0,
          createdAt: r.createdAt,
          activatedAt: r.activatedAt,
          expiresAt: r.expiresAt,
          notes: r.notes,
        })),
      )
      .onConflictDoNothing({ target: [keys.keyCode] })
      .returning({ id: keys.id });

    inserted += result.length;
    skipped += batch.length - result.length;
    if ((i / CHUNK) % 5 === 0) console.log("Progress:", Math.min(i + CHUNK, rows.length), "/", rows.length);
  }

  console.log("Done. Inserted:", inserted, "| Skipped (duplicate):", skipped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

