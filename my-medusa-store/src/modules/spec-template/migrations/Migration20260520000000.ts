import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260520000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE TABLE IF NOT EXISTS "spec_template" (` +
        `"id" TEXT NOT NULL, ` +
        `"name" TEXT NOT NULL, ` +
        `"handle" TEXT NOT NULL, ` +
        `"description" TEXT NULL, ` +
        `"icon" TEXT NOT NULL DEFAULT 'ph-list-checks', ` +
        `"is_preset" BOOLEAN NOT NULL DEFAULT false, ` +
        `"sort_order" INTEGER NOT NULL DEFAULT 0, ` +
        `"template_data" JSONB NOT NULL DEFAULT '{}', ` +
        `"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMPTZ NULL, ` +
        `CONSTRAINT "spec_template_pkey" PRIMARY KEY ("id")` +
      `);`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_spec_template_handle_unique" ON "spec_template" ("handle") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_spec_template_deleted_at" ON "spec_template" ("deleted_at") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_spec_template_is_preset" ON "spec_template" ("is_preset") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_spec_template_sort_order" ON "spec_template" ("sort_order") WHERE "deleted_at" IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "spec_template" CASCADE;`)
  }
}
