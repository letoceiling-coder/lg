ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);

UPDATE "listings"
SET "published_at" = COALESCE("published_at", "updated_at", "created_at")
WHERE "is_published" = true;

UPDATE "listings"
SET "status" = 'INACTIVE'::"ListingStatus",
    "is_published" = false
WHERE "is_published" = true
  AND "status" IN ('ACTIVE'::"ListingStatus", 'RESERVED'::"ListingStatus", 'DRAFT'::"ListingStatus")
  AND "published_at" < (NOW() - INTERVAL '30 days');
