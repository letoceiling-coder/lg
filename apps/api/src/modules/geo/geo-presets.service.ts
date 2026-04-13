import { Injectable, NotFoundException } from '@nestjs/common';
import { BELGOROD_POLYGON } from './belgorod.preset';

export type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };

@Injectable()
export class GeoPresetsService {
  getPolygonForPreset(key: string): GeoJsonPolygon {
    const k = key.trim().toLowerCase();
    if (k === 'belgorod') return BELGOROD_POLYGON;
    throw new NotFoundException(`Неизвестный geo_preset: ${key}`);
  }

  tryGetPolygon(key: string | undefined): GeoJsonPolygon | null {
    if (!key?.trim()) return null;
    try {
      return this.getPolygonForPreset(key);
    } catch {
      return null;
    }
  }
}
