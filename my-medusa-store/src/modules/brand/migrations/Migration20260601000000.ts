import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Brand hierarchy — add `parent_id` to the brand table so brands
 * can have sub-brands (e.g. Apple → Apple Mac, Apple iPhone).
 *
 * Schema changes:
 *   • brand.parent_id  TEXT NULL  — points at brand.id (self-FK,
 *                                    ON DELETE SET NULL so deleting
 *                                    a parent orphans its children
 *                                    instead of removing them).
 *   • Two indexes:
 *       - idx_brand_parent_id              for breadcrumb walks
 *       - idx_brand_active_parent          for storefront filters
 *
 * Idempotent: every statement uses IF NOT EXISTS so re-running this
 * migration (or replaying through sync-db-completely.js) is safe.
 */
export class Migration20260601000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "brand" ADD COLUMN IF NOT EXISTS "parent_id" TEXT NULL;`
    )
    // Self-referencing FK. Wrapped in DO-block so re-runs don't
    // fail with "constraint already exists".
    this.addSql(
      `DO $$ BEGIN
         ALTER TABLE "brand"
           ADD CONSTRAINT "fk_brand_parent"
           FOREIGN KEY ("parent_id") REFERENCES "brand"("id") ON DELETE SET NULL;
       EXCEPTION
         WHEN duplicate_object THEN NULL;
       END $$;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "idx_brand_parent_id" ON "brand" ("parent_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "idx_brand_active_parent" ON "brand" ("is_active", "parent_id") WHERE "deleted_at" IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "idx_brand_active_parent";`)
    this.addSql(`DROP INDEX IF EXISTS "idx_brand_parent_id";`)
    this.addSql(`ALTER TABLE "brand" DROP CONSTRAINT IF EXISTS "fk_brand_parent";`)
    this.addSql(`ALTER TABLE "brand" DROP COLUMN IF EXISTS "parent_id";`)
  }
}
