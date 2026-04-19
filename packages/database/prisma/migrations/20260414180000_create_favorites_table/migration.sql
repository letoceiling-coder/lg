-- Create favorites table if missing on legacy environments
CREATE TABLE IF NOT EXISTS "favorites" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "block_id" INTEGER,
  "listing_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "favorites_user_id_idx" ON "favorites" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "favorites_user_id_block_id_listing_id_key"
  ON "favorites" ("user_id", "block_id", "listing_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'favorites_user_id_fkey'
      AND conrelid = 'favorites'::regclass
  ) THEN
    ALTER TABLE "favorites"
      ADD CONSTRAINT "favorites_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'favorites_block_id_fkey'
      AND conrelid = 'favorites'::regclass
  ) THEN
    ALTER TABLE "favorites"
      ADD CONSTRAINT "favorites_block_id_fkey"
      FOREIGN KEY ("block_id") REFERENCES "blocks"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'favorites_listing_id_fkey'
      AND conrelid = 'favorites'::regclass
  ) THEN
    ALTER TABLE "favorites"
      ADD CONSTRAINT "favorites_listing_id_fkey"
      FOREIGN KEY ("listing_id") REFERENCES "listings"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
