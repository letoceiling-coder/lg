-- Привязка новостей и Telegram-каналов к региону
ALTER TABLE "news"
ADD COLUMN "region_id" INTEGER;

CREATE INDEX "news_region_id_idx" ON "news"("region_id");

ALTER TABLE "news"
ADD CONSTRAINT "news_region_id_fkey"
FOREIGN KEY ("region_id") REFERENCES "feed_regions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "news_telegram_channels"
ADD COLUMN "region_id" INTEGER;

-- Для существующих каналов: привязываем к Москве (MSK), иначе к первому региону.
WITH picked_region AS (
  SELECT id
  FROM "feed_regions"
  WHERE lower("code") = 'msk'
  ORDER BY id
  LIMIT 1
), fallback_region AS (
  SELECT id FROM picked_region
  UNION ALL
  SELECT id FROM "feed_regions" ORDER BY id LIMIT 1
)
UPDATE "news_telegram_channels" c
SET "region_id" = (SELECT id FROM fallback_region LIMIT 1)
WHERE "region_id" IS NULL;

ALTER TABLE "news_telegram_channels"
ALTER COLUMN "region_id" SET NOT NULL;

DROP INDEX IF EXISTS "news_telegram_channels_channel_ref_key";
CREATE UNIQUE INDEX "news_telegram_channels_region_id_channel_ref_key"
  ON "news_telegram_channels"("region_id", "channel_ref");
CREATE INDEX "news_telegram_channels_region_id_idx"
  ON "news_telegram_channels"("region_id");

ALTER TABLE "news_telegram_channels"
ADD CONSTRAINT "news_telegram_channels_region_id_fkey"
FOREIGN KEY ("region_id") REFERENCES "feed_regions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
