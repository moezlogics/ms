import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260417115719 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "advanced_review" ("id" text not null, "product_id" text not null, "customer_id" text null, "guest_name" text null, "guest_email" text null, "rating" integer not null, "content" text not null, "photos" jsonb not null default '[]', "is_verified" boolean not null default false, "status" text check ("status" in ('pending', 'approved', 'flagged')) not null default 'pending', "owner_reply" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "advanced_review_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_advanced_review_deleted_at" ON "advanced_review" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "advanced_review" cascade;`);
  }

}
