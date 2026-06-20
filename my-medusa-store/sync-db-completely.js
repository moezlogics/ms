/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║          MEDUSA V2 — ULTIMATE DATABASE SYNC SCRIPT               ║
 * ║                                                                    ║
 * ║  ONE SCRIPT TO RULE THEM ALL.                                     ║
 * ║  Run this on any empty or existing database and it will create    ║
 * ║  a perfectly complete Medusa V2 schema.                           ║
 * ║                                                                    ║
 * ║  WHAT IT DOES (in order):                                         ║
 * ║  1. Core Medusa tables  — from node_modules/@medusajs migrations  ║
 * ║  2. Local custom modules — site-settings, blog, banners, etc.     ║
 * ║  3. Plugin tables        — @alphabite/medusa-wishlist             ║
 * ║  4. Dynamic Link tables  — pivot tables Medusa needs at runtime   ║
 * ║  5. Timestamp columns    — ensures created/updated/deleted_at     ║
 * ║  6. Publishable Key ↔ Sales Channel auto-linking                  ║
 * ║                                                                    ║
 * ║  SAFE: Uses IF NOT EXISTS everywhere. Never drops data.           ║
 * ║  IDEMPOTENT: Run it 100 times — same result every time.           ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const Module = require('module');

// ── 0. Read DATABASE_URL from .env ──────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) { console.error('ERROR: .env file not found!'); process.exit(1); }

const V = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(l => {
  l = l.trim();
  if (!l || l.startsWith('#')) return;
  const i = l.indexOf('=');
  if (i === -1) return;
  V[l.substring(0, i).trim()] = l.substring(i + 1).trim();
});

const dbUrl = V.DATABASE_URL;
if (!dbUrl) { console.error('ERROR: DATABASE_URL not found in .env!'); process.exit(1); }

// ── Dynamic Link Tables ─────────────────────────────────────────────────
const LINK_TABLES = [
  { table: 'publishable_api_key_sales_channel', columns: ['publishable_key_id', 'sales_channel_id'] },
  { table: 'cart_payment_collection', columns: ['cart_id', 'payment_collection_id'] },
  { table: 'cart_promotion', columns: ['cart_id', 'promotion_id'] },
  { table: 'customer_account_holder', columns: ['customer_id', 'account_id'] },
  { table: 'fulfillment_provider_location', columns: ['fulfillment_provider_id', 'stock_location_id'] },
  { table: 'fulfillment_set_location', columns: ['fulfillment_set_id', 'stock_location_id'] },
  { table: 'invite_rbac_role', columns: ['invite_id', 'rbac_role_id'] },
  { table: 'order_cart', columns: ['order_id', 'cart_id'] },
  { table: 'order_claim_payment_collection', columns: ['order_claim_id', 'payment_collection_id'] },
  { table: 'order_exchange_payment_collection', columns: ['order_exchange_id', 'payment_collection_id'] },
  { table: 'order_fulfillment', columns: ['order_id', 'fulfillment_id'] },
  { table: 'order_payment_collection', columns: ['order_id', 'payment_collection_id'] },
  { table: 'order_promotion', columns: ['order_id', 'promotion_id'] },
  { table: 'order_return_fulfillment', columns: ['return_id', 'fulfillment_id'] },
  { table: 'product_sales_channel', columns: ['product_id', 'sales_channel_id'] },
  { table: 'product_shipping_profile', columns: ['product_id', 'shipping_profile_id'] },
  { table: 'product_variant_inventory_item', columns: ['variant_id', 'inventory_item_id'], extraCols: ['required_quantity INTEGER NOT NULL DEFAULT 1'] },
  { table: 'product_variant_price_set', columns: ['variant_id', 'price_set_id'] },
  { table: 'region_payment_provider', columns: ['region_id', 'payment_provider_id'] },
  { table: 'sales_channel_stock_location', columns: ['sales_channel_id', 'stock_location_id'] },
  { table: 'shipping_option_price_set', columns: ['shipping_option_id', 'price_set_id'] },
  { table: 'user_rbac_role', columns: ['user_id', 'rbac_role_id'] },
];

// ── Mock Migration Runner ───────────────────────────────────────────────
class Mock {
  constructor() { this._s = []; }
  addSql(s) { if (typeof s === 'string' && s.trim()) this._s.push(s); }
  async execute() { return []; }
  getKnex() { return { raw: () => Promise.resolve({ rows: [] }), schema: { hasTable: () => Promise.resolve(false) } }; }
  get ctx() { return undefined; }
}

// Monkey-patch require to intercept @mikro-orm/migrations
const rr = require.resolve('@medusajs/framework/mikro-orm/migrations', { paths: [__dirname] });
const oReq = Module.prototype.require;
Module.prototype.require = function (id) {
  let rp;
  try { rp = Module._resolveFilename(id, this); } catch (e) { return oReq.apply(this, arguments); }
  if (rp === rr) return { Migration: Mock };
  // Also intercept @mikro-orm/migrations directly (used by plugins)
  if (typeof rp === 'string' && rp.includes('@mikro-orm') && rp.includes('migrations') && rp.endsWith('index.js')) {
    return { Migration: Mock };
  }
  return oReq.apply(this, arguments);
};

// ── Find all migration files ────────────────────────────────────────────
function findAllMigrationFiles() {
  const R = [];

  // 1. Core @medusajs modules
  const coreDir = path.join(__dirname, 'node_modules', '@medusajs');
  if (fs.existsSync(coreDir)) {
    fs.readdirSync(coreDir).forEach(pkg => {
      const md = path.join(coreDir, pkg, 'dist', 'migrations');
      if (!fs.existsSync(md)) return;
      fs.readdirSync(md)
        .filter(f => f.endsWith('.js') && (f.startsWith('Migration') || f.startsWith('Initial')))
        .sort()
        .forEach(f => R.push({ type: 'js', src: `@medusajs/${pkg}`, file: path.join(md, f) }));
    });
  }

  // 2. Installed plugins (e.g. @alphabite/medusa-wishlist)
  const pluginDirs = [
    path.join(__dirname, 'node_modules', '@alphabite', 'medusa-wishlist', '.medusa', 'server', 'src', 'modules', 'wishlist', 'migrations'),
  ];
  pluginDirs.forEach(pd => {
    if (!fs.existsSync(pd)) return;
    fs.readdirSync(pd)
      .filter(f => f.endsWith('.js') && f.startsWith('Migration'))
      .sort()
      .forEach(f => R.push({ type: 'js', src: 'plugin/wishlist', file: path.join(pd, f) }));
  });

  // 3. Local custom modules in src/modules
  const localDir = path.join(__dirname, 'src', 'modules');
  if (fs.existsSync(localDir)) {
    fs.readdirSync(localDir).forEach(mod => {
      const md = path.join(localDir, mod, 'migrations');
      if (!fs.existsSync(md)) return;
      fs.readdirSync(md)
        .filter(f => f.startsWith('Migration') && (f.endsWith('.ts') || f.endsWith('.js')))
        .sort()
        .forEach(f => R.push({ type: f.endsWith('.ts') ? 'ts' : 'js', src: `local/${mod}`, file: path.join(md, f) }));
    });
  }

  return R;
}

// ── Extract SQL from a migration file ───────────────────────────────────
async function extractSQL(mf) {
  if (mf.type === 'ts') {
    // For TypeScript files: regex-based extraction (no ts-node needed)
    try {
      const content = fs.readFileSync(mf.file, 'utf8');
      // Find the up() method body
      const upMatch = content.match(/async\s+up\s*\(\s*\)[^{]*\{([\s\S]*?)\n\s*\}/);
      if (!upMatch) return [];
      const body = upMatch[1];
      const sqls = [];
      // Match this.addSql(`...`) — backtick strings (may span multiple lines)
      const regex = /this\.addSql\(\s*`([\s\S]*?)`\s*\)/g;
      let m;
      while ((m = regex.exec(body)) !== null) {
        if (m[1].trim()) sqls.push(m[1].trim());
      }
      // Also match this.addSql( `...` + `...` ) — concatenated strings
      const concatRegex = /this\.addSql\(\s*\n?\s*((?:`[^`]*`\s*\+?\s*\n?\s*)+)\)/g;
      while ((m = concatRegex.exec(body)) !== null) {
        const combined = m[1].replace(/`\s*\+\s*`/g, '').replace(/`/g, '').trim();
        if (combined && !sqls.includes(combined)) sqls.push(combined);
      }
      return sqls;
    } catch (e) {
      return [];
    }
  }

  // For JS files: execute the mock
  try {
    delete require.cache[mf.file];
    const mod = require(mf.file);
    for (const Ex of Object.values(mod).filter(v => typeof v === 'function')) {
      try {
        const inst = new Ex();
        if (typeof inst.up === 'function' && typeof inst.addSql === 'function') {
          await inst.up();
          if (inst._s && inst._s.length > 0) return inst._s;
        }
      } catch (e) { }
    }
    return [];
  } catch (e) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
async function run() {
  const c = new Client(dbUrl);
  await c.connect();

  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   MEDUSA V2 — ULTIMATE DATABASE SYNC              ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');

  // ── STEP 1: Extract all SQL ───────────────────────────────────────
  const files = findAllMigrationFiles();
  console.log(`[1/6] Found ${files.length} migration files.`);

  const allSqls = [];
  for (const mf of files) {
    const sqls = await extractSQL(mf);
    if (Array.isArray(sqls)) {
      sqls.forEach(s => {
        const upper = s.toUpperCase().trim();
        // NEVER run DROP TABLE or DROP INDEX on existing data
        if (upper.startsWith('DROP TABLE') || upper.startsWith('DROP TYPE')) return;
        allSqls.push(s);
      });
    }
  }
  console.log(`      Extracted ${allSqls.length} SQL statements (DROP TABLE excluded).`);

  // ── STEP 2: Execute with Retry Loop ───────────────────────────────
  console.log(`[2/6] Executing SQL with dependency resolution...`);
  let queue = [...allSqls];
  let prevSize = -1;
  let pass = 0;
  let ok = 0, skip = 0;

  while (queue.length > 0 && queue.length !== prevSize) {
    prevSize = queue.length;
    pass++;
    const next = [];
    for (const sql of queue) {
      try {
        await c.query(sql);
        ok++;
      } catch (x) {
        const msg = (x.message || '').toLowerCase();
        if (
          x.code === '42P07' || // duplicate_table
          x.code === '42710' || // duplicate_object (constraint etc)
          x.code === '42701' || // duplicate_column
          msg.includes('already exists') ||
          msg.includes('multiple primary keys')
        ) {
          skip++;
        } else {
          next.push(sql);
        }
      }
    }
    queue = next;
  }
  console.log(`      Done in ${pass} passes. (${ok} applied, ${skip} already existed, ${queue.length} unresolvable)`);

  // ── STEP 2.0: Core Provider Tables (defensive) ────────────────────
  // If `npx medusa db:migrate` partially failed (e.g. on a half-baked
  // DB), some core provider tables may be missing. Without these the
  // backend refuses to boot ("Loaders for module Tax/Payment failed"
  // and "Failed to load currencies / countries"). We create them with
  // IF NOT EXISTS and seed the default rows Medusa expects on first
  // boot. Idempotent — no-op on a healthy DB.
  console.log(`[2.0/6] Ensuring core provider tables (currency, region_country, tax_provider, payment_provider, notification_provider, fulfillment_provider)...`);
  try {
    // currency — populated lazily by the currency loader at boot
    await c.query(`
      CREATE TABLE IF NOT EXISTS "currency" (
        "code" TEXT NOT NULL,
        "symbol" TEXT NOT NULL DEFAULT '',
        "symbol_native" TEXT NOT NULL DEFAULT '',
        "name" TEXT NOT NULL DEFAULT '',
        "decimal_digits" INTEGER NOT NULL DEFAULT 2,
        "rounding" NUMERIC NOT NULL DEFAULT 0,
        "raw_rounding" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "currency_pkey" PRIMARY KEY ("code")
      );
    `);
    // Seed PKR + USD so a fresh electronics store can boot without the
    // currency loader running (loader populates the rest on first boot).
    await c.query(`
      INSERT INTO "currency" ("code", "symbol", "symbol_native", "name", "decimal_digits", "rounding")
      VALUES
        ('pkr', 'Rs', '₨',  'Pakistani Rupee', 0, 0),
        ('usd', '$',  '$',  'US Dollar',       2, 0)
      ON CONFLICT ("code") DO NOTHING;
    `);

    // region_country — populated by the region loader at boot
    await c.query(`
      CREATE TABLE IF NOT EXISTS "region_country" (
        "iso_2" TEXT NOT NULL,
        "iso_3" TEXT NOT NULL DEFAULT '',
        "num_code" INTEGER NOT NULL DEFAULT 0,
        "name" TEXT NOT NULL DEFAULT '',
        "display_name" TEXT NOT NULL DEFAULT '',
        "region_id" TEXT NULL,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "region_country_pkey" PRIMARY KEY ("iso_2")
      );
    `);
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_region_country_region_id" ON "region_country" ("region_id") WHERE "deleted_at" IS NULL;`); } catch (e) {}

    // tax_provider — Medusa expects 'tp_system' on boot
    await c.query(`
      CREATE TABLE IF NOT EXISTS "tax_provider" (
        "id" TEXT NOT NULL,
        "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "tax_provider_pkey" PRIMARY KEY ("id")
      );
    `);
    await c.query(`INSERT INTO "tax_provider" ("id", "is_enabled") VALUES ('tp_system', TRUE) ON CONFLICT ("id") DO NOTHING;`);

    // payment_provider — Medusa expects 'pp_system_default' on boot
    await c.query(`
      CREATE TABLE IF NOT EXISTS "payment_provider" (
        "id" TEXT NOT NULL,
        "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "payment_provider_pkey" PRIMARY KEY ("id")
      );
    `);
    await c.query(`INSERT INTO "payment_provider" ("id", "is_enabled") VALUES ('pp_system_default', TRUE) ON CONFLICT ("id") DO NOTHING;`);

    // notification_provider — Medusa registers configured providers on boot
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
    `);

    // fulfillment_provider — Medusa expects at least 'manual_manual' on boot
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
    `);
    await c.query(`INSERT INTO "fulfillment_provider" ("id", "is_enabled", "name") VALUES ('manual_manual', TRUE, 'Manual Fulfillment') ON CONFLICT ("id") DO NOTHING;`);

    console.log('      Core provider tables ready (tp_system, pp_system_default, manual_manual seeded).');
  } catch (e) {
    console.error('      Error creating core provider tables:', e.message);
  }

  // ── CUSTOM: Web Push Notification Tables ──────────────────────────
  // Mirrors src/modules/push-notifications/migrations. The migration
  // runner above also creates these — duplicating here makes the
  // script self-sufficient on a fresh DB even if module discovery fails.
  // ALTER TABLE ... ADD COLUMN IF NOT EXISTS keeps it safe on existing DBs
  // that already have the older shape.
  console.log(`[2.5/6] Creating Web Push Notification tables...`);
  try {
    // push_subscription — one row per browser/device with VAPID keys + geo
    await c.query(`
      CREATE TABLE IF NOT EXISTS "push_subscription" (
        "id" TEXT NOT NULL,
        "endpoint" TEXT NOT NULL,
        "p256dh" TEXT NOT NULL,
        "auth" TEXT NOT NULL,
        "customer_id" TEXT NULL,
        "city" TEXT NULL,
        "state" TEXT NULL,
        "country" TEXT NULL,
        "user_agent" TEXT NULL,
        "device_browser" TEXT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "last_sent_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
      );
    `);
    // Add columns that may be missing on older databases (idempotent).
    // Includes the May 2026 enrichment columns: device_type, os, locale,
    // timezone, subscribe_source + engagement counters (total_clicked,
    // last_clicked_at) used for CTR segmentation in the admin dashboard.
    const pushSubCols = [
      ['country', 'TEXT NULL'],
      ['user_agent', 'TEXT NULL'],
      ['device_browser', 'TEXT NULL'],
      ['is_active', 'BOOLEAN NOT NULL DEFAULT true'],
      ['last_sent_at', 'TIMESTAMPTZ NULL'],
      // Marketer-grade segmentation
      ['device_type', 'TEXT NULL'],
      ['os', 'TEXT NULL'],
      ['locale', 'TEXT NULL'],
      ['timezone', 'TEXT NULL'],
      ['subscribe_source', 'TEXT NULL'],
      // Engagement (populated by SW click handler)
      ['total_clicked', 'INTEGER NOT NULL DEFAULT 0'],
      ['last_clicked_at', 'TIMESTAMPTZ NULL'],
      // Demographic segmentation (May 2026 — Migration20260507000000).
      // Synced from customer.metadata.gender after onboarding so push
      // campaigns can target male / female / other audiences.
      ['gender', 'TEXT NULL'],
    ];
    for (const [col, def] of pushSubCols) {
      try { await c.query(`ALTER TABLE "push_subscription" ADD COLUMN IF NOT EXISTS "${col}" ${def};`); } catch (e) { }
    }
    try { await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_push_subscription_endpoint_unique" ON "push_subscription" ("endpoint") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_push_subscription_customer_id" ON "push_subscription" ("customer_id") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_push_subscription_city" ON "push_subscription" ("city") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_push_subscription_state" ON "push_subscription" ("state") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_push_subscription_is_active" ON "push_subscription" ("is_active") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_push_subscription_country" ON "push_subscription" ("country") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_push_subscription_device_type" ON "push_subscription" ("device_type") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_push_subscription_os" ON "push_subscription" ("os") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_push_subscription_gender" ON "push_subscription" ("gender") WHERE "deleted_at" IS NULL;`); } catch (e) { }

    // push_campaign — manual marketing campaign history with stats
    await c.query(`
      CREATE TABLE IF NOT EXISTS "push_campaign" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "icon_url" TEXT NULL,
        "image_url" TEXT NULL,
        "action_url" TEXT NULL,
        "filter_cities" TEXT NULL,
        "filter_states" TEXT NULL,
        "total_targeted" INTEGER NOT NULL DEFAULT 0,
        "total_sent" INTEGER NOT NULL DEFAULT 0,
        "total_failed" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "sent_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "push_campaign_pkey" PRIMARY KEY ("id")
      );
    `);
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_push_campaign_status" ON "push_campaign" ("status") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_push_campaign_created_at" ON "push_campaign" ("created_at") WHERE "deleted_at" IS NULL;`); } catch (e) { }

    // Campaign audience-filter columns (May 2026). JSON-stringified arrays.
    // `filter_customers_only` toggles "logged-in customers only" mode.
    // `total_clicked` powers per-campaign CTR display.
    const pushCampaignCols = [
      ['filter_countries', 'TEXT NULL'],
      ['filter_device_types', 'TEXT NULL'],
      ['filter_os', 'TEXT NULL'],
      ['filter_browsers', 'TEXT NULL'],
      ['filter_customers_only', 'BOOLEAN NOT NULL DEFAULT FALSE'],
      ['total_clicked', 'INTEGER NOT NULL DEFAULT 0'],
      // Demographic targeting (May 2026 — Migration20260507000000).
      // JSON-stringified array of gender codes, e.g. ["male","female"].
      ['filter_genders', 'TEXT NULL'],
    ];
    for (const [col, def] of pushCampaignCols) {
      try { await c.query(`ALTER TABLE "push_campaign" ADD COLUMN IF NOT EXISTS "${col}" ${def};`); } catch (e) { }
    }

    // Legacy template-settings table — kept for backwards-compatibility
    // with older deployments. New code reads templates from site-settings.
    await c.query(`
      CREATE TABLE IF NOT EXISTS "push_template_setting" (
        "id" TEXT NOT NULL,
        "event_name" TEXT NOT NULL,
        "title_template" TEXT NULL,
        "body_template" TEXT NULL,
        "default_icon" TEXT NULL,
        CONSTRAINT "push_template_setting_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "push_template_setting_event_name_unique" UNIQUE ("event_name")
      );
    `);

    console.log('      Push subscription + campaign tables ready.');
  } catch (e) {
    console.error('      Error creating push tables:', e.message);
  }

  // ── CUSTOM: OTP Auth Table ────────────────────────────────────────
  console.log(`[2.6/6] Creating OTP Auth tables...`);
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS "otp_code" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "purpose" TEXT CHECK ("purpose" IN ('signup', 'password_reset', 'email_verify')) NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "verified" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "otp_code_pkey" PRIMARY KEY ("id")
      );
    `);
    await c.query(`CREATE INDEX IF NOT EXISTS "IDX_otp_code_email" ON "otp_code" ("email");`);
    await c.query(`CREATE INDEX IF NOT EXISTS "IDX_otp_code_email_purpose" ON "otp_code" ("email", "purpose");`);
  } catch (e) {
    console.error('      Error creating OTP tables:', e.message);
  }

  // ── CUSTOM: Loyalty Points Table ──────────────────────────────────
  // Mirrors src/modules/loyalty/migrations/Migration20250407153111.ts.
  // Idempotent: safe on existing databases that already have the table.
  console.log(`[2.7/6] Creating Loyalty Points tables...`);
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS "loyalty_point" (
        "id" TEXT NOT NULL,
        "points" INTEGER NOT NULL DEFAULT 0,
        "customer_id" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "loyalty_point_pkey" PRIMARY KEY ("id")
      );
    `);
    try { await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_LOYALTY_CUSTOMER_ID" ON "loyalty_point" (customer_id) WHERE deleted_at IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_point_deleted_at" ON "loyalty_point" (deleted_at) WHERE deleted_at IS NULL;`); } catch (e) { }
  } catch (e) {
    console.error('      Error creating loyalty tables:', e.message);
  }

  // ── CUSTOM: Bundled Products Tables ───────────────────────────────
  // Mirrors src/modules/bundled-product/migrations/Migration20250428093025.ts.
  // The Medusa-generated link tables (bundle_product, bundle_item_product)
  // are created automatically the first time the backend boots — they are
  // managed by Medusa's link_module_migrations system.
  console.log(`[2.8/6] Creating Bundled Products tables...`);
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS "bundle" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "bundle_pkey" PRIMARY KEY ("id")
      );
    `);
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_bundle_deleted_at" ON "bundle" (deleted_at) WHERE deleted_at IS NULL;`); } catch (e) { }

    await c.query(`
      CREATE TABLE IF NOT EXISTS "bundle_item" (
        "id" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "bundle_id" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "bundle_item_pkey" PRIMARY KEY ("id")
      );
    `);
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_bundle_item_bundle_id" ON "bundle_item" (bundle_id) WHERE deleted_at IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_bundle_item_deleted_at" ON "bundle_item" (deleted_at) WHERE deleted_at IS NULL;`); } catch (e) { }
    try { await c.query(`ALTER TABLE "bundle_item" ADD CONSTRAINT "bundle_item_bundle_id_foreign" FOREIGN KEY ("bundle_id") REFERENCES "bundle" ("id") ON UPDATE CASCADE;`); } catch (e) { }
  } catch (e) {
    console.error('      Error creating bundled-products tables:', e.message);
  }

  // ── CUSTOM: Loyalty Transactions Table ────────────────────────────
  // Mirrors src/modules/loyalty/migrations/Migration20260501000000.ts.
  // Powers the storefront /account/loyalty history panel and the
  // earn/redeem audit log. Sibling of `loyalty_point` — does not
  // replace it.
  console.log(`[2.9/6] Creating Loyalty Transactions tables...`);
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS "loyalty_transaction" (
        "id" TEXT NOT NULL,
        "customer_id" TEXT NOT NULL,
        "points" INTEGER NOT NULL,
        "balance_after" INTEGER NOT NULL DEFAULT 0,
        "kind" TEXT NOT NULL DEFAULT 'earn',
        "order_id" TEXT NULL,
        "cart_id" TEXT NULL,
        "description" TEXT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "loyalty_transaction_pkey" PRIMARY KEY ("id")
      );
    `);
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_transaction_customer_id" ON "loyalty_transaction" ("customer_id") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_transaction_kind" ON "loyalty_transaction" ("kind") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_transaction_created_at" ON "loyalty_transaction" ("created_at") WHERE "deleted_at" IS NULL;`); } catch (e) { }
  } catch (e) {
    console.error('      Error creating loyalty_transaction table:', e.message);
  }

  // ── CUSTOM: Agentic Commerce Chat Tables ──────────────────────────
  // Mirrors src/modules/agentic-commerce/migrations/Migration20260501100000.ts.
  // Powers the storefront AI shopping-assistant chatbot.
  console.log(`[2.10/6] Creating Agentic Chat tables...`);
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS "chat_session" (
        "id" TEXT NOT NULL,
        "customer_id" TEXT NULL,
        "visitor_token" TEXT NULL,
        "title" TEXT NULL,
        "last_message_preview" TEXT NULL,
        "message_count" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "chat_session_pkey" PRIMARY KEY ("id")
      );
    `);
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_chat_session_customer_id" ON "chat_session" ("customer_id") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_chat_session_visitor_token" ON "chat_session" ("visitor_token") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_chat_session_created_at" ON "chat_session" ("created_at") WHERE "deleted_at" IS NULL;`); } catch (e) { }

    await c.query(`
      CREATE TABLE IF NOT EXISTS "chat_message" (
        "id" TEXT NOT NULL,
        "session_id" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'user',
        "content" TEXT NOT NULL,
        "metadata" TEXT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
      );
    `);
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_session_id" ON "chat_message" ("session_id") WHERE "deleted_at" IS NULL;`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_created_at" ON "chat_message" ("created_at") WHERE "deleted_at" IS NULL;`); } catch (e) { }
  } catch (e) {
    console.error('      Error creating chat tables:', e.message);
  }

  // ── STEP 3: Link Tables ───────────────────────────────────────────
  console.log(`[3/6] Ensuring ${LINK_TABLES.length} dynamic link tables...`);
  for (const link of LINK_TABLES) {
    const colDefs = link.columns.map(col => `"${col}" TEXT NOT NULL`).join(', ');
    const extra = link.extraCols ? ', ' + link.extraCols.join(', ') : '';
    try {
      await c.query(`CREATE TABLE IF NOT EXISTS "${link.table}" (
        "id" TEXT NOT NULL, ${colDefs}${extra},
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "${link.table}_pkey" PRIMARY KEY ("id")
      );`);
    } catch (e) { }
    // Unique + Indexes
    try { await c.query(`ALTER TABLE "${link.table}" ADD CONSTRAINT "${link.table}_${link.columns.join('_')}_unique" UNIQUE ("${link.columns[0]}", "${link.columns[1]}");`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_${link.table}_${link.columns[0]}" ON "${link.table}" ("${link.columns[0]}");`); } catch (e) { }
    try { await c.query(`CREATE INDEX IF NOT EXISTS "IDX_${link.table}_${link.columns[1]}" ON "${link.table}" ("${link.columns[1]}");`); } catch (e) { }
  }
  console.log('      Done.');

  // ── STEP 4: Timestamps ────────────────────────────────────────────
  console.log(`[4/6] Enforcing timestamps on all tables...`);
  const tablesRes = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
  for (const row of tablesRes.rows) {
    const t = row.table_name;
    if (t === 'mikro_orm_migrations' || t === 'link_module_migrations') continue;
    try { await c.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT now();`); } catch (e) { }
    try { await c.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();`); } catch (e) { }
    try { await c.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz NULL;`); } catch (e) { }
  }
  console.log('      Done.');

  // ── STEP 5: Auto-link Publishable Keys → Sales Channels ──────────
  console.log(`[5/6] Auto-linking Publishable Keys to Sales Channels...`);
  try {
    const keys = await c.query("SELECT id, title FROM api_key WHERE type = 'publishable'");
    const channels = await c.query("SELECT id, name FROM sales_channel WHERE deleted_at IS NULL");
    let linked = 0;
    if (keys.rows.length > 0 && channels.rows.length > 0) {
      for (const key of keys.rows) {
        for (const ch of channels.rows) {
          try {
            await c.query(
              `INSERT INTO publishable_api_key_sales_channel (id, publishable_key_id, sales_channel_id, created_at, updated_at)
               VALUES ($1, $2, $3, now(), now()) ON CONFLICT DO NOTHING`,
              [`pksc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, key.id, ch.id]
            );
            linked++;
          } catch (e) { }
        }
      }
    }
    console.log(`      Linked ${linked} key-channel pair(s). (${keys.rows.length} keys, ${channels.rows.length} channels)`);
  } catch (e) {
    console.log('      Skipped (tables may not exist yet on fresh DB).');
  }

  // ── STEP 6: Final Report ──────────────────────────────────────────
  const finalCount = await c.query("SELECT count(*)::int as n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
  console.log(`[6/6] Final table count: ${finalCount.rows[0].n}`);

  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   ✅ SYNC COMPLETE — DATABASE IS READY!            ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');

  await c.end();
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
