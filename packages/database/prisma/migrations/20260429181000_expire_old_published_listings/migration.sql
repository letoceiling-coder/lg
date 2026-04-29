UPDATE "listings"
SET "status" = 'INACTIVE'::"ListingStatus",
    "is_published" = false
WHERE "is_published" = true
  AND "status" IN ('ACTIVE'::"ListingStatus", 'RESERVED'::"ListingStatus", 'DRAFT'::"ListingStatus")
  AND "published_at" < (NOW() - INTERVAL '30 days');
