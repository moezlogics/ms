import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Adds chat_session + chat_message tables for the storefront AI chatbot.
 * The legacy webhook-only service stays untouched — these tables power
 * a new feature on top of the same module.
 */
export class Migration20260501100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE TABLE IF NOT EXISTS "chat_session" (` +
        `"id" TEXT NOT NULL, ` +
        `"customer_id" TEXT NULL, ` +
        `"visitor_token" TEXT NULL, ` +
        `"title" TEXT NULL, ` +
        `"last_message_preview" TEXT NULL, ` +
        `"message_count" INTEGER NOT NULL DEFAULT 0, ` +
        `"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMPTZ NULL, ` +
        `CONSTRAINT "chat_session_pkey" PRIMARY KEY ("id")` +
      `);`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_session_customer_id" ON "chat_session" ("customer_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_session_visitor_token" ON "chat_session" ("visitor_token") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_session_created_at" ON "chat_session" ("created_at") WHERE "deleted_at" IS NULL;`
    )

    this.addSql(
      `CREATE TABLE IF NOT EXISTS "chat_message" (` +
        `"id" TEXT NOT NULL, ` +
        `"session_id" TEXT NOT NULL, ` +
        `"role" TEXT NOT NULL DEFAULT 'user', ` +
        `"content" TEXT NOT NULL, ` +
        `"metadata" TEXT NULL, ` +
        `"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMPTZ NULL, ` +
        `CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")` +
      `);`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_message_session_id" ON "chat_message" ("session_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_message_created_at" ON "chat_message" ("created_at") WHERE "deleted_at" IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "chat_message" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "chat_session" CASCADE;`)
  }
}
