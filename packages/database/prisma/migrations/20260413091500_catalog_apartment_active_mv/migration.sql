CREATE MATERIALIZED VIEW IF NOT EXISTS "catalog_apartment_active_mv" AS
SELECT
  l.id AS listing_id,
  l.block_id,
  l.region_id,
  l.price,
  la.room_type_id
FROM "listings" l
INNER JOIN "listing_apartments" la ON la.listing_id = l.id
WHERE l.status = 'ACTIVE'::"ListingStatus"
  AND l.kind = 'APARTMENT'::"ListingKind"
  AND l.is_published = true
  AND l.block_id IS NOT NULL
  AND l.price IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_apartment_active_mv_listing_id_uq"
  ON "catalog_apartment_active_mv"(listing_id);

CREATE INDEX IF NOT EXISTS "catalog_apartment_active_mv_block_id_idx"
  ON "catalog_apartment_active_mv"(block_id);

CREATE INDEX IF NOT EXISTS "catalog_apartment_active_mv_region_id_idx"
  ON "catalog_apartment_active_mv"(region_id);

CREATE INDEX IF NOT EXISTS "catalog_apartment_active_mv_room_type_id_idx"
  ON "catalog_apartment_active_mv"(room_type_id);

CREATE INDEX IF NOT EXISTS "catalog_apartment_active_mv_price_idx"
  ON "catalog_apartment_active_mv"(price);
