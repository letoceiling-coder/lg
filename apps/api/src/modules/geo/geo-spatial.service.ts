import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GeoPresetsService, type GeoJsonPolygon } from './geo-presets.service';

export type GeoQueryShape = {
  region_id?: number;
  geo_lat?: number;
  geo_lng?: number;
  geo_radius_m?: number;
  geo_polygon?: string;
  geo_preset?: string;
};

@Injectable()
export class GeoSpatialService {
  private readonly logger = new Logger(GeoSpatialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly presets: GeoPresetsService,
  ) {}

  /**
   * null — геофильтр не задан; [] — задан, но нет ЖК в зоне; иначе список id для пересечения с Prisma.
   */
  async resolveGeoBlockIds(query: GeoQueryShape): Promise<{ ids: number[] | null; noMatch: boolean }> {
    const regionId = query.region_id;
    const preset = this.presets.tryGetPolygon(query.geo_preset);
    const parsedPolygon = !preset && query.geo_polygon?.trim() ? parsePolygonJson(query.geo_polygon) : null;
    const hasRadius =
      query.geo_lat != null &&
      query.geo_lng != null &&
      query.geo_radius_m != null &&
      Number.isFinite(query.geo_radius_m) &&
      query.geo_radius_m > 0;

    if (!preset && !parsedPolygon && !hasRadius) {
      return { ids: null, noMatch: false };
    }

    if (!regionId) {
      this.logger.warn('Геофильтр задан без region_id — фильтр пропущен');
      return { ids: null, noMatch: false };
    }

    const poly = preset ?? parsedPolygon;
    if (query.geo_polygon?.trim() && !preset && !poly) {
      this.logger.warn('geo_polygon не удалось разобрать как GeoJSON Polygon');
      return { ids: null, noMatch: false };
    }

    try {
      if (hasRadius && !poly) {
        const lat = query.geo_lat!;
        const lng = query.geo_lng!;
        const r = query.geo_radius_m!;
        const rows = await this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
          SELECT b.id
          FROM blocks b
          WHERE b.region_id = ${regionId}
            AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
            AND ST_DWithin(
              geography(ST_SetSRID(ST_MakePoint(b.longitude::double precision, b.latitude::double precision), 4326)),
              geography(ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)),
              ${r}::double precision
            )
        `);
        const ids = rows.map((row) => row.id);
        return { ids, noMatch: ids.length === 0 };
      }

      if (poly) {
        const wkt = polygonToWkt(poly);
        const rows = await this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
          SELECT b.id
          FROM blocks b
          WHERE b.region_id = ${regionId}
            AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
            AND ST_Within(
              ST_SetSRID(ST_MakePoint(b.longitude::double precision, b.latitude::double precision), 4326),
              ST_SetSRID(ST_GeomFromText(${wkt}), 4326)
            )
        `);
        const ids = rows.map((row) => row.id);
        return { ids, noMatch: ids.length === 0 };
      }
    } catch (e) {
      this.logger.warn(
        `PostGIS-запрос не выполнен (расширение не установлено?): ${e instanceof Error ? e.message : String(e)}`,
      );
      return { ids: null, noMatch: false };
    }

    return { ids: null, noMatch: false };
  }
}

function polygonToWkt(p: GeoJsonPolygon): string {
  const ring = p.coordinates[0];
  const pairs = ring.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `POLYGON((${pairs}))`;
}

function parsePolygonJson(s: string): GeoJsonPolygon | null {
  try {
    const v = JSON.parse(s) as unknown;
    if (!v || typeof v !== 'object') return null;
    const o = v as GeoJsonPolygon;
    if (o.type !== 'Polygon' || !Array.isArray(o.coordinates?.[0])) return null;
    return o;
  } catch {
    return null;
  }
}
