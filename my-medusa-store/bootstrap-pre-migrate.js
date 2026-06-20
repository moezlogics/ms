/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   PRE-MIGRATE BOOTSTRAP (chicken-and-egg fix)                      ║
 * ║                                                                    ║
 * ║   PROBLEM:                                                         ║
 * ║     `npx medusa db:migrate` boots the full Medusa app first.       ║
 * ║     The Tax + Payment module loaders query `tax_provider` and      ║
 * ║     `payment_provider` rows on boot. On an EMPTY database those    ║
 * ║     queries throw, the loaders crash, and the migrate command      ║
 * ║     aborts BEFORE any migration runs. Result: you can never        ║
 * ║     migrate a fresh DB.                                            ║
 * ║                                                                    ║
 * ║   FIX:                                                             ║
 * ║     1. Create the 4 provider tables that loaders query, with       ║
 * ║        the SAME schema Medusa core migrations would create.        ║
 * ║     2. Seed the rows the loaders expect (tp_system,                ║
 * ║        pp_system_default, manual_manual).                          ║
 * ║     3. Pre-populate the `mikro_orm_migrations` ledger with the     ║
 * ║        Medusa core migration names that create these tables, so    ║
 * ║        `db:migrate` skips them (instead of crashing on             ║
 * ║        "relation already exists").                                 ║
 * ║                                                                    ║
 * ║   USAGE (run ONCE on a fresh empty DB):                            ║
 * ║     node bootstrap-pre-migrate.js                                  ║
 * ║     npx medusa db:migrate                                          ║
 * ║     node sync-db-completely.js     (custom + link tables top-up)   ║
 * ║     npx medusa exec ./src/scripts/seed-admin.ts                    ║
 * ║                                                                    ║
 * ║   IDEMPOTENT: re-runs are safe — IF NOT EXISTS / ON CONFLICT.      ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

// ── Read DATABASE_URL ────────────────────────────────────────────────
const envPath = path.join(__dirname, ".env")
if (!fs.existsSync(envPath)) {
  console.error("ERROR: .env not found at " + envPath)
  process.exit(1)
}
const env = {}
fs.readFileSync(envPath, "utf8")
  .split("\n")
  .forEach((l) => {
    l = l.trim()
    if (!l || l.startsWith("#")) return
    const i = l.indexOf("=")
    if (i === -1) return
    env[l.substring(0, i).trim()] = l.substring(i + 1).trim()
  })
if (!env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL missing in .env")
  process.exit(1)
}

// ── Migration names to pre-mark as "already ran" ─────────────────────
// These are the @medusajs core migration filenames that create the
// tables we are about to bootstrap. Listing them in the ledger tells
// `db:migrate` to skip them, avoiding the "relation already exists"
// crash. Other migrations run normally.
//
// NOTE: file names are version-pinned to your installed Medusa. If
// you bump @medusajs/* and one of these filenames changes, update
// the array. Easy to find: `grep -r "create table .* tax_provider"
// node_modules/@medusajs/tax/dist/migrations`.
const PRE_MARKED_MIGRATIONS = [
  // tax module
  "Migration20240924114003",
  // payment module
  "Migration20240115152011",
  // notification module
  "Migration20240205173216",
  // fulfillment module
  "Migration20240227075933",
]

async function run() {
  const c = new Client(env.DATABASE_URL)
  await c.connect()

  console.log("")
  console.log("╔════════════════════════════════════════════════════╗")
  console.log("║   PRE-MIGRATE BOOTSTRAP                            ║")
  console.log("╚════════════════════════════════════════════════════╝")
  console.log("")

  // ── Step 1: Create the 4 provider tables ──────────────────────────
  console.log("[1/3] Creating provider tables...")

  await c.query(`
    CREATE TABLE IF NOT EXISTS "tax_provider" (
      "id" TEXT NOT NULL,
      "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ NULL,
      CONSTRAINT "tax_provider_pkey" PRIMARY KEY ("id")
    );
  `)

  await c.query(`
    CREATE TABLE IF NOT EXISTS "payment_provider" (
      "id" TEXT NOT NULL,
      "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ NULL,
      CONSTRAINT "payment_provider_pkey" PRIMARY KEY ("id")
    );
  `)

  await c.query(`
    CREATE TABLE IF NOT EXISTS "notification_provider" (
      "id" TEXT NOT NULL,
      "handle" TEXT NOT NULL DEFAULT '',
      "name" TEXT NOT NULL DEFAULT '',
      "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "channels" TEXT[] NOT NULL DEFAULT '{}',
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ NULL,
      CONSTRAINT "notification_provider_pkey" PRIMARY KEY ("id")
    );
  `)

  await c.query(`
    CREATE TABLE IF NOT EXISTS "fulfillment_provider" (
      "id" TEXT NOT NULL,
      "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "name" TEXT NOT NULL DEFAULT '',
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ NULL,
      CONSTRAINT "fulfillment_provider_pkey" PRIMARY KEY ("id")
    );
  `)

  console.log("      tax_provider, payment_provider, notification_provider, fulfillment_provider — ready.")

  // ── Step 2: Seed the rows the loaders expect ──────────────────────
  console.log("[2/3] Seeding default provider rows...")

  await c.query(
    `INSERT INTO "tax_provider" ("id", "is_enabled") VALUES ('tp_system', TRUE) ON CONFLICT ("id") DO NOTHING;`
  )
  await c.query(
    `INSERT INTO "payment_provider" ("id", "is_enabled") VALUES ('pp_system_default', TRUE) ON CONFLICT ("id") DO NOTHING;`
  )
  await c.query(
    `INSERT INTO "fulfillment_provider" ("id", "is_enabled", "name") VALUES ('manual_manual', TRUE, 'Manual Fulfillment') ON CONFLICT ("id") DO NOTHING;`
  )

  console.log("      tp_system, pp_system_default, manual_manual — seeded.")

  // ── Step 3: Pre-populate mikro_orm_migrations ledger ──────────────
  console.log("[3/3] Marking provider migrations as already-applied in ledger...")

  await c.query(`
    CREATE TABLE IF NOT EXISTS "mikro_orm_migrations" (
      "id" SERIAL PRIMARY KEY,
      "name" VARCHAR(255) NOT NULL,
      "executed_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  for (const name of PRE_MARKED_MIGRATIONS) {
    try {
      await c.query(
        `INSERT INTO "mikro_orm_migrations" ("name", "executed_at")
         SELECT $1, now()
         WHERE NOT EXISTS (SELECT 1 FROM "mikro_orm_migrations" WHERE "name" = $1);`,
        [name]
      )
      console.log(`      Pre-marked: ${name}`)
    } catch (e) {
      console.log(`      Skipped ${name}: ${e.message}`)
    }
  }

  console.log("")
  console.log("╔════════════════════════════════════════════════════╗")
  console.log("║   ✅ BOOTSTRAP COMPLETE                             ║")
  console.log("║                                                    ║")
  console.log("║   Now run, in order:                               ║")
  console.log("║     1. npx medusa db:migrate                       ║")
  console.log("║     2. node sync-db-completely.js                  ║")
  console.log("║     3. npx medusa exec ./src/scripts/seed-admin.ts ║")
  console.log("╚════════════════════════════════════════════════════╝")
  console.log("")

  await c.end()
}

run().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
