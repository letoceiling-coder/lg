#!/usr/bin/env bash
sudo -u postgres psql -d lg_production -c "
SELECT 'blocks' as entity, COUNT(*) FROM blocks
UNION ALL SELECT 'buildings', COUNT(*) FROM buildings
UNION ALL SELECT 'listings', COUNT(*) FROM listings
UNION ALL SELECT 'listing_apartments', COUNT(*) FROM listing_apartments
UNION ALL SELECT 'districts', COUNT(*) FROM districts
UNION ALL SELECT 'subways', COUNT(*) FROM subways
UNION ALL SELECT 'builders', COUNT(*) FROM builders
UNION ALL SELECT 'room_types', COUNT(*) FROM room_types
UNION ALL SELECT 'finishings', COUNT(*) FROM finishings
UNION ALL SELECT 'building_types', COUNT(*) FROM building_types
UNION ALL SELECT 'import_batches', COUNT(*) FROM import_batches;
"
