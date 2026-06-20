import { Migration } from "@mikro-orm/migrations"

export class Migration20260430170000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "otp_code" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "purpose" TEXT CHECK ("purpose" IN ('signup', 'password_reset', 'email_verify')) NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "verified" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "otp_code_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_otp_code_email" ON "otp_code" ("email");
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_otp_code_email_purpose" ON "otp_code" ("email", "purpose");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "otp_code";`)
  }
}
