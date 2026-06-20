import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260416100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "contact_lead" (` +
        `"id" text not null, ` +
        `"name" text not null, ` +
        `"email" text not null, ` +
        `"phone" text null, ` +
        `"subject" text null, ` +
        `"message" text not null, ` +
        `"status" text not null default 'new', ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "contact_lead_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_contact_lead_deleted_at" ON "contact_lead" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_contact_lead_status" ON "contact_lead" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_contact_lead_created_at" ON "contact_lead" ("created_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "contact_lead" cascade;`)
  }
}
