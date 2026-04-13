-- Публичный URL витрины по региону (мультирегион / второй инстанс)
ALTER TABLE "feed_regions" ADD COLUMN "public_site_url" TEXT;

-- PostGIS: расширение и индекс по координатам ЖК (радиус / полигон в API)
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX IF NOT EXISTS "blocks_geo_gist_idx" ON "blocks" USING GIST (
  (ST_SetSRID(ST_MakePoint("longitude"::double precision, "latitude"::double precision), 4326))
) WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
