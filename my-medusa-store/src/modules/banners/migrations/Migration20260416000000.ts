import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260416000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "banner" (` +
        `"id" text not null, ` +
        `"title" text null, ` +
        `"subtitle" text null, ` +
        `"image_url" text not null, ` +
        `"image_url_mobile" text null, ` +
        `"link_url" text null, ` +
        `"cta_label" text null, ` +
        `"sort_order" integer not null default 0, ` +
        `"is_active" boolean not null default true, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "banner_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_banner_deleted_at" ON "banner" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_banner_sort_order" ON "banner" ("sort_order") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_banner_is_active" ON "banner" ("is_active") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "banner" cascade;`);
  }

}
