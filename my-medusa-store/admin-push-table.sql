-- ===================================================================
--  admin_push_subscription — admin mobile app (PWA) web-push tokens
-- ===================================================================
--
--  Run this ONCE on the server DB (no Medusa migration is used for it):
--    psql "$DATABASE_URL" -f admin-push-table.sql
--
--  Columns/types match the Medusa model in
--  src/modules/push-notifications/models/admin-push-subscription.ts
--  (incl. the auto created_at / updated_at / deleted_at that every
--  Medusa model adds). If you change the model, update this too.
--
--  Safe to re-run (IF NOT EXISTS everywhere).
-- ===================================================================

CREATE TABLE IF NOT EXISTS "admin_push_subscription" (
  "id"             text         NOT NULL,
  "endpoint"       text         NOT NULL,
  "p256dh"         text         NOT NULL,
  "auth"           text         NOT NULL,
  "admin_id"       text         NULL,
  "label"          text         NULL,
  "device_browser" text         NULL,
  "is_active"      boolean      NOT NULL DEFAULT true,
  "last_sent_at"   timestamptz  NULL,
  "created_at"     timestamptz  NOT NULL DEFAULT now(),
  "updated_at"     timestamptz  NOT NULL DEFAULT now(),
  "deleted_at"     timestamptz  NULL,
  CONSTRAINT "admin_push_subscription_pkey" PRIMARY KEY ("id")
);

-- Medusa-style partial unique index on endpoint (ignores soft-deleted rows)
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_admin_push_subscription_endpoint_unique"
  ON "admin_push_subscription" ("endpoint")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "IDX_admin_push_subscription_deleted_at"
  ON "admin_push_subscription" ("deleted_at")
  WHERE "deleted_at" IS NULL;
