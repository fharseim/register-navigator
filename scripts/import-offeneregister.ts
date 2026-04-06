#!/usr/bin/env npx ts-node
/**
 * scripts/import-offeneregister.ts
 *
 * Bulk-import OffeneRegister.de JSONL dataset into Supabase companies table.
 *
 * Usage:
 *   npx ts-node scripts/import-offeneregister.ts
 *   npx ts-node scripts/import-offeneregister.ts --file /path/to/dump.jsonl.gz
 *   npx ts-node scripts/import-offeneregister.ts --url https://offeneregister.de/dumps/companies.jsonl.gz
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js zlib dotenv
 *
 * Environment (in .env):
 *   VITE_SUPABASE_URL=https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
 */

import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import * as readline from "readline";
import * as https from "https";
import * as http from "http";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

// ── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Default download source (official OffeneRegister dump)
const DEFAULT_DUMP_URL =
  "https://offeneregister.de/dumps/companies.jsonl.gz";

const BATCH_SIZE = 500;        // rows per upsert call
const MAX_ERRORS = 100;        // abort if too many errors
const LOG_EVERY = 5_000;       // print progress every N rows

// ── Arg parsing ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let dumpFile: string | null = null;
let dumpUrl: string = DEFAULT_DUMP_URL;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--file" && args[i + 1]) dumpFile = args[++i];
  if (args[i] === "--url" && args[i + 1]) dumpUrl = args[++i];
}

// ── Supabase client ────────────────────────────────────────────────────────

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Types ──────────────────────────────────────────────────────────────────

interface OffeneRegisterRow {
  name?: string;
  registered_address?: {
    city?: string;
    street?: string;
    zip_code?: string;
    country_code?: string;
  };
  registry_court?: string;
  register_number?: string;
  company_type?: string;
  status?: string;
  registered_at?: string;
  retrieved_at?: string;
  [key: string]: unknown;
}

interface CompanyRow {
  id: string;
  name: string;
  city: string | null;
  court: string | null;
  register_number: string | null;
  legal_form: string | null;
  status: string;
  registered_at: string | null;
  updated_at: string;
  raw: Record<string, unknown>;
}

// ── Transform ──────────────────────────────────────────────────────────────

function toCompanyRow(raw: OffeneRegisterRow): CompanyRow | null {
  const name = (raw.name || "").trim();
  if (!name) return null;

  const court = (raw.registry_court || "").trim() || null;
  const registerNumber = (raw.register_number || "").trim() || null;

  // Stable ID: registerNumber + court (falls back to name hash)
  const idBase = registerNumber && court
    ? `${registerNumber}_${court}`
    : name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 80);
  const id = idBase.replace(/\s+/g, "_").toLowerCase();

  const city = raw.registered_address?.city?.trim() || null;

  // Normalize status
  let status = "aktiv";
  const rawStatus = (raw.status || "").toLowerCase();
  if (rawStatus.includes("liquidat")) status = "in Liquidation";
  else if (rawStatus.includes("insolvenz") || rawStatus.includes("insolven")) status = "Insolvenz eröffnet";
  else if (rawStatus.includes("gelöscht") || rawStatus.includes("geloscht") || rawStatus.includes("deleted")) status = "gelöscht";
  else if (rawStatus.includes("aufgelöst") || rawStatus.includes("aufgeloest")) status = "aufgelöst";

  const registeredAt = raw.registered_at
    ? new Date(raw.registered_at).toISOString()
    : null;

  return {
    id,
    name,
    city,
    court,
    register_number: registerNumber,
    legal_form: raw.company_type?.trim() || null,
    status,
    registered_at: registeredAt,
    updated_at: new Date().toISOString(),
    raw: raw as Record<string, unknown>,
  };
}

// ── Upsert batch ───────────────────────────────────────────────────────────

async function upsertBatch(
  batch: CompanyRow[],
  stats: { inserted: number; errors: number }
): Promise<void> {
  const { error } = await supabase
    .from("companies")
    .upsert(batch, { onConflict: "id", ignoreDuplicates: false });

  if (error) {
    stats.errors++;
    console.error(`  Batch upsert error (${batch.length} rows): ${error.message}`);
  } else {
    stats.inserted += batch.length;
  }
}

// ── Stream helpers ─────────────────────────────────────────────────────────

function downloadStream(url: string): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        resolve(downloadStream(res.headers.location));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      resolve(res);
    }).on("error", reject);
  });
}

function getReadStream(source: string | null, url: string): Promise<NodeJS.ReadableStream> {
  if (source) {
    // Local file
    const absPath = path.resolve(source);
    console.log(`Reading from local file: ${absPath}`);
    const fileStream = fs.createReadStream(absPath);
    if (absPath.endsWith(".gz")) {
      return Promise.resolve(fileStream.pipe(zlib.createGunzip()));
    }
    return Promise.resolve(fileStream);
  } else {
    // Download
    console.log(`Downloading from: ${url}`);
    return downloadStream(url).then((stream) => {
      if (url.endsWith(".gz")) {
        return stream.pipe(zlib.createGunzip());
      }
      return stream;
    });
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== OffeneRegister Import ===");
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log();

  const startTime = Date.now();
  const stats = { inserted: 0, skipped: 0, errors: 0 };

  const textStream = await getReadStream(dumpFile, dumpUrl);

  const rl = readline.createInterface({
    input: textStream,
    crlfDelay: Infinity,
  });

  let batch: CompanyRow[] = [];
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;
    const trimmed = line.trim();
    if (!trimmed || trimmed === "[" || trimmed === "]") continue;

    // Strip trailing comma (some dumps wrap in JSON array)
    const jsonStr = trimmed.endsWith(",") ? trimmed.slice(0, -1) : trimmed;

    let raw: OffeneRegisterRow;
    try {
      raw = JSON.parse(jsonStr);
    } catch {
      stats.skipped++;
      continue;
    }

    const row = toCompanyRow(raw);
    if (!row) { stats.skipped++; continue; }

    batch.push(row);

    if (batch.length >= BATCH_SIZE) {
      await upsertBatch(batch, stats);
      batch = [];
    }

    if (lineCount % LOG_EVERY === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `  Line ${lineCount.toLocaleString()} | ` +
        `inserted: ${stats.inserted.toLocaleString()} | ` +
        `skipped: ${stats.skipped.toLocaleString()} | ` +
        `errors: ${stats.errors} | ` +
        `${elapsed}s`
      );
    }

    if (stats.errors >= MAX_ERRORS) {
      console.error(`\nAborting: too many errors (${stats.errors})`);
      break;
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    await upsertBatch(batch, stats);
  }

  const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log();
  console.log("=== Import complete ===");
  console.log(`  Total lines processed : ${lineCount.toLocaleString()}`);
  console.log(`  Inserted/updated      : ${stats.inserted.toLocaleString()}`);
  console.log(`  Skipped (no name/json): ${stats.skipped.toLocaleString()}`);
  console.log(`  Errors                : ${stats.errors}`);
  console.log(`  Time                  : ${totalSeconds}s`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
