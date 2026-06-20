import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260414145446 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "blog_post" drop constraint if exists "blog_post_handle_unique";`);
    this.addSql(`alter table if exists "blog_category" drop constraint if exists "blog_category_handle_unique";`);
    this.addSql(`create table if not exists "blog_category" ("id" text not null, "name" text not null, "handle" text not null, "description" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "blog_category_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blog_category_handle_unique" ON "blog_category" ("handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_blog_category_deleted_at" ON "blog_category" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "blog_post" ("id" text not null, "title" text not null, "handle" text not null, "excerpt" text null, "content" text null, "featured_image" text null, "featured_image_alt" text null, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "published_at" timestamptz null, "seo_title" text null, "seo_description" text null, "seo_keywords" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "blog_post_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blog_post_handle_unique" ON "blog_post" ("handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_blog_post_deleted_at" ON "blog_post" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "blog_post_categories" ("blog_post_id" text not null, "blog_category_id" text not null, constraint "blog_post_categories_pkey" primary key ("blog_post_id", "blog_category_id"));`);

    this.addSql(`alter table if exists "blog_post_categories" add constraint "blog_post_categories_blog_post_id_foreign" foreign key ("blog_post_id") references "blog_post" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "blog_post_categories" add constraint "blog_post_categories_blog_category_id_foreign" foreign key ("blog_category_id") references "blog_category" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "blog_post_categories" drop constraint if exists "blog_post_categories_blog_category_id_foreign";`);

    this.addSql(`alter table if exists "blog_post_categories" drop constraint if exists "blog_post_categories_blog_post_id_foreign";`);

    this.addSql(`drop table if exists "blog_category" cascade;`);

    this.addSql(`drop table if exists "blog_post" cascade;`);

    this.addSql(`drop table if exists "blog_post_categories" cascade;`);
  }

}
