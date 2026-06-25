import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Adds tracking column total_shown to push_subscription and push_campaign
 * so we can measure exact impressions/delivery on user devices.
 */
export class Migration20260625000000 extends Migration {
  override async up(): Promise<void> {
    // Add total_shown and last_shown_at to push_subscription
    this.addSql(`ALTER TABLE "push_subscription" ADD COLUMN IF NOT EXISTS "total_shown" INTEGER NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "last_shown_at" TIMESTAMPTZ NULL;`)

    // Add total_shown to push_campaign
    this.addSql(`ALTER TABLE "push_campaign" ADD COLUMN IF NOT EXISTS "total_shown" INTEGER NOT NULL DEFAULT 0;`)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "push_subscription" DROP COLUMN IF EXISTS "total_shown", DROP COLUMN IF EXISTS "last_shown_at";`)
    this.addSql(`ALTER TABLE "push_campaign" DROP COLUMN IF EXISTS "total_shown";`)
  }
}
