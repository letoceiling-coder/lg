-- Apartment market segment (новостройка / вторичка)

CREATE TYPE "ApartmentMarketSegment" AS ENUM ('NEW_BUILDING', 'SECONDARY');

ALTER TABLE "listing_apartments" ADD COLUMN "market_segment" "ApartmentMarketSegment";

CREATE INDEX "listing_apartments_market_segment_idx" ON "listing_apartments"("market_segment");

-- Белгород: все квартиражные объявления помечаем как вторичка (ТЗ заказчика)
UPDATE "listing_apartments" la
SET "market_segment" = 'SECONDARY'
FROM "listings" l
WHERE la."listing_id" = l."id"
  AND l."kind" = 'APARTMENT'
  AND l."region_id" IN (SELECT id FROM "feed_regions" WHERE LOWER("code") = 'belgorod');
