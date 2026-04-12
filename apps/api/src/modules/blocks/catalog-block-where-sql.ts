import { BlockStatus, ListingKind, ListingStatus, Prisma } from '@prisma/client';

/**
 * Builds a SQL fragment for `WHERE (...)` on alias `b` (table `blocks`).
 * Must stay aligned with {@link BlocksService.buildCatalogBlockWhere} filter semantics.
 */
export function catalogBlockWhereToSql(where: Prisma.BlockWhereInput): Prisma.Sql | null {
  const parts: Prisma.Sql[] = [];

  const allowedTop = new Set([
    'regionId',
    'districtId',
    'builderId',
    'status',
    'isPromoted',
    'slug',
    'id',
    'salesStartDate',
    'OR',
    'subways',
    'district',
    'builder',
    'listings',
  ]);
  for (const k of Object.keys(where)) {
    if ((where as Record<string, unknown>)[k] === undefined) continue;
    if (!allowedTop.has(k)) return null;
  }

  if (where.regionId !== undefined) {
    if (typeof where.regionId !== 'number') return null;
    parts.push(Prisma.sql`b.region_id = ${where.regionId}`);
  }
  if (where.districtId !== undefined) {
    if (typeof where.districtId !== 'number') return null;
    parts.push(Prisma.sql`b.district_id = ${where.districtId}`);
  }
  if (where.builderId !== undefined) {
    if (typeof where.builderId !== 'number') return null;
    parts.push(Prisma.sql`b.builder_id = ${where.builderId}`);
  }
  if (where.status !== undefined) {
    if (typeof where.status !== 'string' || !Object.values(BlockStatus).includes(where.status as BlockStatus)) {
      return null;
    }
    parts.push(Prisma.sql`b.status = ${where.status}::"BlockStatus"`);
  }
  if (where.isPromoted === true) {
    parts.push(Prisma.sql`b.is_promoted = true`);
  }

  if (where.slug !== undefined) {
    const s = where.slug;
    if (!s || typeof s !== 'object' || !('in' in s) || !Array.isArray((s as { in: unknown }).in)) return null;
    const slugs = (s as { in: string[] }).in;
    if (!slugs.length) parts.push(Prisma.sql`FALSE`);
    else parts.push(Prisma.sql`b.slug IN (${Prisma.join(slugs)})`);
  }

  if (where.id !== undefined) {
    const idw = where.id;
    if (!idw || typeof idw !== 'object' || !('in' in idw) || !Array.isArray((idw as { in: unknown }).in)) return null;
    const ids = (idw as { in: number[] }).in;
    if (!ids.length) parts.push(Prisma.sql`FALSE`);
    else parts.push(Prisma.sql`b.id IN (${Prisma.join(ids)})`);
  }

  if (where.salesStartDate !== undefined) {
    const sql = salesStartDateToSql(where.salesStartDate as Prisma.DateTimeNullableFilter);
    if (sql == null) return null;
    parts.push(sql);
  }

  if (where.district !== undefined) {
    const sql = districtRelationToSql(where.district as Prisma.DistrictWhereInput);
    if (sql == null) return null;
    parts.push(sql);
  }

  if (where.builder !== undefined) {
    const sql = builderRelationToSql(where.builder as Prisma.BuilderWhereInput);
    if (sql == null) return null;
    parts.push(sql);
  }

  if (where.subways !== undefined) {
    const sql = subwaysWhereToSql(where.subways);
    if (sql == null) return null;
    parts.push(sql);
  }

  if (where.listings !== undefined) {
    const sql = listingsSomeToSql(where.listings);
    if (sql == null) return null;
    parts.push(sql);
  }

  if (where.OR !== undefined) {
    if (!Array.isArray(where.OR)) return null;
    const orParts: Prisma.Sql[] = [];
    for (const clause of where.OR) {
      const o = searchOrClauseToSql(clause as Prisma.BlockWhereInput);
      if (o == null) return null;
      orParts.push(o);
    }
    if (orParts.length) parts.push(Prisma.sql`(${Prisma.join(orParts, ' OR ')})`);
  }

  if (!parts.length) return Prisma.sql`TRUE`;
  return Prisma.join(parts, ' AND ');
}

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function searchOrClauseToSql(clause: Prisma.BlockWhereInput): Prisma.Sql | null {
  const keys = Object.keys(clause).filter((k) => (clause as Record<string, unknown>)[k] !== undefined);
  if (keys.length !== 1) return null;
  const key = keys[0];

  if (key === 'name') {
    const n = clause.name;
    if (!n || typeof n !== 'object' || !('contains' in n)) return null;
    const q = String((n as { contains: string }).contains).trim();
    if (!q) return Prisma.sql`FALSE`;
    const pat = `%${escapeIlike(q)}%`;
    return Prisma.sql`b.name ILIKE ${pat} ESCAPE '\\'`;
  }

  if (key === 'addresses') {
    const a = clause.addresses;
    if (!a || typeof a !== 'object' || !('some' in a)) return null;
    const some = (a as { some: { address?: { contains?: string } } }).some;
    const c = some?.address?.contains;
    if (typeof c !== 'string' || !c.trim()) return Prisma.sql`FALSE`;
    const pat = `%${escapeIlike(c.trim())}%`;
    return Prisma.sql`EXISTS (
      SELECT 1 FROM block_addresses ba
      WHERE ba.block_id = b.id AND ba.address ILIKE ${pat} ESCAPE '\\'
    )`;
  }

  if (key === 'district') {
    const d = clause.district;
    if (!d || typeof d !== 'object' || !('name' in d)) return null;
    const nm = (d as { name?: { contains?: string } }).name;
    const c = nm?.contains;
    if (typeof c !== 'string' || !c.trim()) return Prisma.sql`FALSE`;
    const pat = `%${escapeIlike(c.trim())}%`;
    return Prisma.sql`EXISTS (
      SELECT 1 FROM districts d2
      WHERE d2.id = b.district_id AND d2.name ILIKE ${pat} ESCAPE '\\'
    )`;
  }

  if (key === 'builder') {
    const bu = clause.builder;
    if (!bu || typeof bu !== 'object' || !('name' in bu)) return null;
    const nm = (bu as { name?: { contains?: string } }).name;
    const c = nm?.contains;
    if (typeof c !== 'string' || !c.trim()) return Prisma.sql`FALSE`;
    const pat = `%${escapeIlike(c.trim())}%`;
    return Prisma.sql`EXISTS (
      SELECT 1 FROM builders bu2
      WHERE bu2.id = b.builder_id AND bu2.name ILIKE ${pat} ESCAPE '\\'
    )`;
  }

  if (key === 'subways') {
    const su = clause.subways;
    if (!su || typeof su !== 'object' || !('some' in su)) return null;
    const some = (su as { some: { subway?: { name?: { contains?: string } } } }).some;
    const c = some?.subway?.name?.contains;
    if (typeof c !== 'string' || !c.trim()) return Prisma.sql`FALSE`;
    const pat = `%${escapeIlike(c.trim())}%`;
    return Prisma.sql`EXISTS (
      SELECT 1 FROM block_subways bs2
      INNER JOIN subways sw2 ON sw2.id = bs2.subway_id
      WHERE bs2.block_id = b.id AND sw2.name ILIKE ${pat} ESCAPE '\\'
    )`;
  }

  return null;
}

function salesStartDateToSql(f: Prisma.DateTimeNullableFilter): Prisma.Sql | null {
  const allowed = new Set(['not', 'gte', 'lte']);
  for (const k of Object.keys(f)) {
    if ((f as Record<string, unknown>)[k] === undefined) continue;
    if (!allowed.has(k)) return null;
  }
  const parts: Prisma.Sql[] = [Prisma.sql`b.sales_start_date IS NOT NULL`];
  if (f.not !== undefined && f.not !== null) return null;
  if (f.gte !== undefined) {
    if (!(f.gte instanceof Date) || Number.isNaN(f.gte.getTime())) return null;
    parts.push(Prisma.sql`b.sales_start_date >= ${f.gte}::date`);
  }
  if (f.lte !== undefined) {
    if (!(f.lte instanceof Date) || Number.isNaN(f.lte.getTime())) return null;
    parts.push(Prisma.sql`b.sales_start_date <= ${f.lte}::date`);
  }
  return Prisma.join(parts, ' AND ');
}

function districtRelationToSql(d: Prisma.DistrictWhereInput): Prisma.Sql | null {
  const keys = Object.keys(d).filter((k) => (d as Record<string, unknown>)[k] !== undefined);
  if (keys.length !== 1 || keys[0] !== 'name') return null;
  const nm = d.name as { in?: string[] } | undefined;
  const names = nm?.in;
  if (!Array.isArray(names) || !names.length) return null;
  return Prisma.sql`EXISTS (
    SELECT 1 FROM districts d3
    WHERE d3.id = b.district_id AND d3.name IN (${Prisma.join(names)})
  )`;
}

function builderRelationToSql(bu: Prisma.BuilderWhereInput): Prisma.Sql | null {
  const keys = Object.keys(bu).filter((k) => (bu as Record<string, unknown>)[k] !== undefined);
  if (keys.length !== 1 || keys[0] !== 'name') return null;
  const nm = bu.name as { in?: string[] } | undefined;
  const names = nm?.in;
  if (!Array.isArray(names) || !names.length) return null;
  return Prisma.sql`EXISTS (
    SELECT 1 FROM builders bu3
    WHERE bu3.id = b.builder_id AND bu3.name IN (${Prisma.join(names)})
  )`;
}

function subwaysWhereToSql(s: Prisma.BlockSubwayListRelationFilter): Prisma.Sql | null {
  if (!s.some || typeof s.some !== 'object') return null;
  const some = s.some as Record<string, unknown>;
  const keys = Object.keys(some).filter((k) => some[k] !== undefined);

  if (keys.length === 1 && keys[0] === 'subwayId' && typeof some.subwayId === 'number') {
    return Prisma.sql`EXISTS (
      SELECT 1 FROM block_subways bs4
      WHERE bs4.block_id = b.id AND bs4.subway_id = ${some.subwayId}
    )`;
  }

  if (keys.length === 1 && keys[0] === 'subway' && some.subway && typeof some.subway === 'object') {
    const sn = (some.subway as { name?: { in?: string[] } }).name?.in;
    if (!Array.isArray(sn) || !sn.length) return null;
    return Prisma.sql`EXISTS (
      SELECT 1 FROM block_subways bs5
      INNER JOIN subways sw5 ON sw5.id = bs5.subway_id
      WHERE bs5.block_id = b.id AND sw5.name IN (${Prisma.join(sn)})
    )`;
  }

  return null;
}

function listingsSomeToSql(l: Prisma.ListingListRelationFilter): Prisma.Sql | null {
  if (!l.some || typeof l.some !== 'object') return null;
  const some = l.some as Record<string, unknown>;
  const keys = Object.keys(some).filter((k) => some[k] !== undefined);
  if (keys.length !== 3 || !keys.includes('status') || !keys.includes('kind') || !keys.includes('isPublished')) {
    return null;
  }
  if (some.status !== ListingStatus.ACTIVE || some.kind !== ListingKind.APARTMENT || some.isPublished !== true) {
    return null;
  }
  return Prisma.sql`EXISTS (
    SELECT 1 FROM listings lreq
    WHERE lreq.block_id = b.id
      AND lreq.status = ${ListingStatus.ACTIVE}::"ListingStatus"
      AND lreq.kind = ${ListingKind.APARTMENT}::"ListingKind"
      AND lreq.is_published = true
  )`;
}
