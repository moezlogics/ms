import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260430000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE TABLE IF NOT EXISTS "push_subscription" (` +
        `"id" TEXT NOT NULL, ` +
        `"endpoint" TEXT NOT NULL, ` +
        `"p256dh" TEXT NOT NULL, ` +
        `"auth" TEXT NOT NULL, ` +
        `"customer_id" TEXT NULL, ` +
        `"city" TEXT NULL, ` +
        `"state" TEXT NULL, ` +
        `"country" TEXT NULL, ` +
        `"user_agent" TEXT NULL, ` +
        `"device_browser" TEXT NULL, ` +
        `"is_active" BOOLEAN NOT NULL DEFAULT true, ` +
        `"last_sent_at" TIMESTAMPTZ NULL, ` +
        `"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMPTZ NULL, ` +
        `CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")` +
      `);`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_push_subscription_endpoint_unique" ON "push_subscription" ("endpoint") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_push_subscription_customer_id" ON "push_subscription" ("customer_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_push_subscription_city" ON "push_subscription" ("city") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_push_subscription_state" ON "push_subscription" ("state") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_push_subscription_is_active" ON "push_subscription" ("is_active") WHERE "deleted_at" IS NULL;`
    )

    this.addSql(
      `CREATE TABLE IF NOT EXISTS "push_campaign" (` +
        `"id" TEXT NOT NULL, ` +
        `"title" TEXT NOT NULL, ` +
        `"body" TEXT NOT NULL, ` +
        `"icon_url" TEXT NULL, ` +
        `"image_url" TEXT NULL, ` +
        `"action_url" TEXT NULL, ` +
        `"filter_cities" TEXT NULL, ` +
        `"filter_states" TEXT NULL, ` +
        `"total_targeted" INTEGER NOT NULL DEFAULT 0, ` +
        `"total_sent" INTEGER NOT NULL DEFAULT 0, ` +
        `"total_failed" INTEGER NOT NULL DEFAULT 0, ` +
        `"status" TEXT NOT NULL DEFAULT 'draft', ` +
        `"sent_at" TIMESTAMPTZ NULL, ` +
        `"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMPTZ NULL, ` +
        `CONSTRAINT "push_campaign_pkey" PRIMARY KEY ("id")` +
      `);`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_push_campaign_status" ON "push_campaign" ("status") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_push_campaign_created_at" ON "push_campaign" ("created_at") WHERE "deleted_at" IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "push_campaign" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "push_subscription" CASCADE;`)
  }
}
