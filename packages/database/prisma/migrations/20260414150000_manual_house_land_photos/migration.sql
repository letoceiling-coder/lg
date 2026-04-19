-- Add media fields for manual house/land forms
ALTER TABLE "listing_houses"
  ADD COLUMN "photo_url" TEXT,
  ADD COLUMN "extra_photo_urls" JSONB;

ALTER TABLE "listing_land"
  ADD COLUMN "photo_url" TEXT,
  ADD COLUMN "extra_photo_urls" JSONB;

