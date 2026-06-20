import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260429000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE TABLE IF NOT EXISTS "brand" (` +
        `"id" TEXT NOT NULL, ` +
        `"name" TEXT NOT NULL, ` +
        `"handle" TEXT NOT NULL, ` +
        `"logo_url" TEXT NULL, ` +
        `"description" TEXT NULL, ` +
        `"website_url" TEXT NULL, ` +
        `"seo_title" TEXT NULL, ` +
        `"seo_description" TEXT NULL, ` +
        `"sort_order" INTEGER NOT NULL DEFAULT 0, ` +
        `"is_active" BOOLEAN NOT NULL DEFAULT true, ` +
        `"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMPTZ NULL, ` +
        `CONSTRAINT "brand_pkey" PRIMARY KEY ("id")` +
      `);`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_handle_unique" ON "brand" ("handle") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_deleted_at" ON "brand" ("deleted_at") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_is_active" ON "brand" ("is_active") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_sort_order" ON "brand" ("sort_order") WHERE "deleted_at" IS NULL;`
    )

    this.addSql(
      `CREATE TABLE IF NOT EXISTS "brand_product" (` +
        `"id" TEXT NOT NULL, ` +
        `"product_id" TEXT NOT NULL, ` +
        `"brand_id" TEXT NOT NULL, ` +
        `"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMPTZ NULL, ` +
        `CONSTRAINT "brand_product_pkey" PRIMARY KEY ("id")` +
      `);`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_product_unique" ON "brand_product" ("product_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_product_brand_id" ON "brand_product" ("brand_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brand_product_deleted_at" ON "brand_product" ("deleted_at") WHERE "deleted_at" IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "brand_product" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "brand" CASCADE;`)
  }
}
