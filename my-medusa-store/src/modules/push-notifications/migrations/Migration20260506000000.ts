import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Adds marketer-grade segmentation fields and click-tracking counters
 * to push_subscription, plus extra filter/stat columns to push_campaign.
 *
 * All new columns are nullable / defaulted so existing rows stay valid.
 */
export class Migration20260506000000 extends Migration {
  override async up(): Promise<void> {
    // ── push_subscription: enrichment + engagement ──
    this.addSql(
      `ALTER TABLE "push_subscription" ` +
        `ADD COLUMN IF NOT EXISTS "device_type" TEXT NULL, ` +
        `ADD COLUMN IF NOT EXISTS "os" TEXT NULL, ` +
        `ADD COLUMN IF NOT EXISTS "locale" TEXT NULL, ` +
        `ADD COLUMN IF NOT EXISTS "timezone" TEXT NULL, ` +
        `ADD COLUMN IF NOT EXISTS "subscribe_source" TEXT NULL, ` +
        `ADD COLUMN IF NOT EXISTS "total_clicked" INTEGER NOT NULL DEFAULT 0, ` +
        `ADD COLUMN IF NOT EXISTS "last_clicked_at" TIMESTAMPTZ NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_push_subscription_device_type" ON "push_subscription" ("device_type") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_push_subscription_os" ON "push_subscription" ("os") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_push_subscription_country" ON "push_subscription" ("country") WHERE "deleted_at" IS NULL;`
    )

    // ── push_campaign: extra filters + click counter ──
    this.addSql(
      `ALTER TABLE "push_campaign" ` +
        `ADD COLUMN IF NOT EXISTS "filter_countries" TEXT NULL, ` +
        `ADD COLUMN IF NOT EXISTS "filter_device_types" TEXT NULL, ` +
        `ADD COLUMN IF NOT EXISTS "filter_os" TEXT NULL, ` +
        `ADD COLUMN IF NOT EXISTS "filter_browsers" TEXT NULL, ` +
        `ADD COLUMN IF NOT EXISTS "filter_customers_only" BOOLEAN NOT NULL DEFAULT FALSE, ` +
        `ADD COLUMN IF NOT EXISTS "total_clicked" INTEGER NOT NULL DEFAULT 0;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `ALTER TABLE "push_subscription" ` +
        `DROP COLUMN IF EXISTS "device_type", ` +
        `DROP COLUMN IF EXISTS "os", ` +
        `DROP COLUMN IF EXISTS "locale", ` +
        `DROP COLUMN IF EXISTS "timezone", ` +
        `DROP COLUMN IF EXISTS "subscribe_source", ` +
        `DROP COLUMN IF EXISTS "total_clicked", ` +
        `DROP COLUMN IF EXISTS "last_clicked_at";`
    )
    this.addSql(
      `ALTER TABLE "push_campaign" ` +
        `DROP COLUMN IF EXISTS "filter_countries", ` +
        `DROP COLUMN IF EXISTS "filter_device_types", ` +
        `DROP COLUMN IF EXISTS "filter_os", ` +
        `DROP COLUMN IF EXISTS "filter_browsers", ` +
        `DROP COLUMN IF EXISTS "filter_customers_only", ` +
        `DROP COLUMN IF EXISTS "total_clicked";`
    )
  }
}
