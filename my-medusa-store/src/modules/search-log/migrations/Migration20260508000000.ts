import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260508000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "search_log" (` +
        `"id" text not null, ` +
        `"query" text not null, ` +
        `"count" integer not null default 1, ` +
        `"last_used_at" timestamptz null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "search_log_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_search_log_deleted_at" ON "search_log" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_search_log_query" ON "search_log" ("query") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_search_log_count" ON "search_log" ("count" DESC) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "search_log" cascade;`)
  }
}
