DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TelegramNotifyAccessStatus') THEN
    CREATE TYPE "TelegramNotifyAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "telegram_notify_access_requests" (
  "id" SERIAL PRIMARY KEY,
  "telegram_user_id" BIGINT NOT NULL,
  "telegram_chat_id" BIGINT NOT NULL,
  "telegram_username" TEXT,
  "telegram_first_name" TEXT,
  "telegram_last_name" TEXT,
  "status" "TelegramNotifyAccessStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "telegram_notify_recipients" (
  "id" SERIAL PRIMARY KEY,
  "telegram_user_id" BIGINT NOT NULL,
  "telegram_chat_id" BIGINT NOT NULL,
  "telegram_username" TEXT,
  "telegram_first_name" TEXT,
  "telegram_last_name" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "approved_by" UUID,
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_notify_recipients_telegram_user_id_key"
  ON "telegram_notify_recipients"("telegram_user_id");

CREATE INDEX IF NOT EXISTS "telegram_notify_access_requests_status_created_at_idx"
  ON "telegram_notify_access_requests"("status", "created_at");

CREATE INDEX IF NOT EXISTS "telegram_notify_access_requests_telegram_user_id_status_idx"
  ON "telegram_notify_access_requests"("telegram_user_id", "status");

CREATE INDEX IF NOT EXISTS "telegram_notify_recipients_is_active_created_at_idx"
  ON "telegram_notify_recipients"("is_active", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'telegram_notify_access_requests_reviewed_by_fkey'
  ) THEN
    ALTER TABLE "telegram_notify_access_requests"
      ADD CONSTRAINT "telegram_notify_access_requests_reviewed_by_fkey"
      FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'telegram_notify_recipients_approved_by_fkey'
  ) THEN
    ALTER TABLE "telegram_notify_recipients"
      ADD CONSTRAINT "telegram_notify_recipients_approved_by_fkey"
      FOREIGN KEY ("approved_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DELETE FROM "site_settings" WHERE "key" = 'telegram_notify_chat_id';
