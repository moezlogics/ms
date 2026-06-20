import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Adds `loyalty_transaction` for the customer-facing points history.
 * The original `loyalty_point` table from Migration20250407153111 stays
 * unchanged — `loyalty_transaction` is a sibling, not a replacement.
 */
export class Migration20260501000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE TABLE IF NOT EXISTS "loyalty_transaction" (` +
        `"id" TEXT NOT NULL, ` +
        `"customer_id" TEXT NOT NULL, ` +
        `"points" INTEGER NOT NULL, ` +
        `"balance_after" INTEGER NOT NULL DEFAULT 0, ` +
        `"kind" TEXT NOT NULL DEFAULT 'earn', ` +
        `"order_id" TEXT NULL, ` +
        `"cart_id" TEXT NULL, ` +
        `"description" TEXT NULL, ` +
        `"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMPTZ NULL, ` +
        `CONSTRAINT "loyalty_transaction_pkey" PRIMARY KEY ("id")` +
      `);`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_loyalty_transaction_customer_id" ON "loyalty_transaction" ("customer_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_loyalty_transaction_kind" ON "loyalty_transaction" ("kind") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_loyalty_transaction_created_at" ON "loyalty_transaction" ("created_at") WHERE "deleted_at" IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "loyalty_transaction" CASCADE;`)
  }
}
