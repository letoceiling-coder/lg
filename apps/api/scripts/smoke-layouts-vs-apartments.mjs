#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Smoke-check: для каждого блока сравнивает количество "В продаже"
 * посчитанное через Listing (ACTIVE + RESERVED, isPublished=true)
 * с количеством через materialized view catalog_apartment_active_mv.
 *
 * Запуск:
 *   node apps/api/scripts/smoke-layouts-vs-apartments.mjs
 *
 * Перед запуском убедитесь, что DATABASE_URL задан и MV обновлён:
 *   psql ... -c "REFRESH MATERIALIZED VIEW catalog_apartment_active_mv";
 *
 * Скрипт печатает список расхождений и завершается с кодом 1, если они есть.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const blocks = await prisma.block.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      _count: {
        select: {
          listings: {
            where: {
              status: { in: ['ACTIVE', 'RESERVED'] },
              kind: 'APARTMENT',
              isPublished: true,
            },
          },
        },
      },
    },
  });

  const mvRows = await prisma.$queryRaw`
    SELECT block_id, COUNT(*)::int AS apartments
    FROM catalog_apartment_active_mv
    GROUP BY block_id
  `;
  const mvByBlock = new Map();
  for (const row of mvRows) {
    mvByBlock.set(Number(row.block_id), Number(row.apartments));
  }

  let mismatches = 0;
  let okBlocks = 0;
  for (const b of blocks) {
    const fromCount = b._count.listings;
    const fromMv = mvByBlock.get(b.id) ?? 0;
    if (fromCount !== fromMv) {
      console.log(
        `MISMATCH block #${b.id} ${b.slug ?? '-'}  _count.listings=${fromCount}  mv=${fromMv}  diff=${fromCount - fromMv}`,
      );
      mismatches++;
    } else if (fromCount > 0) {
      okBlocks++;
    }
  }

  console.log(
    `\nИтого: блоков=${blocks.length}, совпавших с ненулевым счётом=${okBlocks}, расхождений=${mismatches}`,
  );

  await prisma.$disconnect();
  if (mismatches > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
