ALTER TABLE "listing_commercial"
  ADD COLUMN IF NOT EXISTS "photo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "extra_photo_urls" JSONB;

ALTER TABLE "listing_parking"
  ADD COLUMN IF NOT EXISTS "photo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "extra_photo_urls" JSONB;
