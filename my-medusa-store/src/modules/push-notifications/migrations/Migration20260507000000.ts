import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Adds a demographic `gender` column to push_subscription and a matching
 * `filter_genders` JSON column to push_campaign so marketers can target
 * pushes at male / female / other audiences.
 *
 * `gender` is a free-text column (not a Postgres enum) on purpose —
 * we may accept "other", "prefer_not_to_say", or locale-specific
 * values later and don't want another migration for each one. Indexed
 * for fast segmentation queries.
 */
export class Migration20260507000000 extends Migration {
  override async up(): Promise<void> {
    // ── push_subscription: gender demographic ──
    this.addSql(
      `ALTER TABLE "push_subscription" ` +
        `ADD COLUMN IF NOT EXISTS "gender" TEXT NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_push_subscription_gender" ` +
        `ON "push_subscription" ("gender") WHERE "deleted_at" IS NULL;`
    )

    // ── push_campaign: gender filter ──
    this.addSql(
      `ALTER TABLE "push_campaign" ` +
        `ADD COLUMN IF NOT EXISTS "filter_genders" TEXT NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_push_subscription_gender";`
    )
    this.addSql(
      `ALTER TABLE "push_subscription" DROP COLUMN IF EXISTS "gender";`
    )
    this.addSql(
      `ALTER TABLE "push_campaign" DROP COLUMN IF EXISTS "filter_genders";`
    )
  }
}
