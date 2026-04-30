ALTER TABLE "feed_regions"
  ADD COLUMN "map_center_lat" DECIMAL(10,8),
  ADD COLUMN "map_center_lng" DECIMAL(11,8);

UPDATE "feed_regions"
SET "map_center_lat" = CASE LOWER("code")
  WHEN 'msk' THEN 55.751244
  WHEN 'spb' THEN 59.939095
  WHEN 'krasnodar' THEN 45.035470
  WHEN 'ekaterinburg' THEN 56.838011
  WHEN 'novosibirsk' THEN 54.989342
  WHEN 'kazan' THEN 55.796127
  WHEN 'belgorod' THEN 50.595414
  ELSE "map_center_lat"
END,
"map_center_lng" = CASE LOWER("code")
  WHEN 'msk' THEN 37.618423
  WHEN 'spb' THEN 30.315868
  WHEN 'krasnodar' THEN 38.975313
  WHEN 'ekaterinburg' THEN 60.597295
  WHEN 'novosibirsk' THEN 82.906635
  WHEN 'kazan' THEN 49.106405
  WHEN 'belgorod' THEN 36.587277
  ELSE "map_center_lng"
END
WHERE LOWER("code") IN ('msk', 'spb', 'krasnodar', 'ekaterinburg', 'novosibirsk', 'kazan', 'belgorod');
