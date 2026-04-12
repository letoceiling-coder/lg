import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeedProcessorService {
  private readonly logger = new Logger(FeedProcessorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** CRM id из фида (в т.ч. 0) — нельзя использовать truthy-проверку */
  private toCrmBigInt(value: unknown): bigint | null {
    if (value === undefined || value === null || value === '') return null;
    try {
      return BigInt(String(value));
    } catch {
      return null;
    }
  }

  async processRooms(data: any[]): Promise<number> {
    let count = 0;
    for (const item of data) {
      await this.prisma.roomType.upsert({
        where: { externalId: item._id },
        update: { name: item.name, crmId: this.toCrmBigInt(item.crm_id) },
        create: {
          externalId: item._id,
          name: item.name,
          crmId: this.toCrmBigInt(item.crm_id),
        },
      });
      count++;
    }
    this.logger.log(`Rooms upserted: ${count}`);
    return count;
  }

  async processFinishings(data: any[]): Promise<number> {
    let count = 0;
    for (const item of data) {
      await this.prisma.finishing.upsert({
        where: { externalId: item._id },
        update: { name: item.name, crmId: this.toCrmBigInt(item.crm_id) },
        create: {
          externalId: item._id,
          name: item.name,
          crmId: this.toCrmBigInt(item.crm_id),
        },
      });
      count++;
    }
    this.logger.log(`Finishings upserted: ${count}`);
    return count;
  }

  async processBuildingTypes(data: any[]): Promise<number> {
    let count = 0;
    for (const item of data) {
      await this.prisma.buildingType.upsert({
        where: { externalId: item._id },
        update: { name: item.name, crmId: this.toCrmBigInt(item.crm_id) },
        create: {
          externalId: item._id,
          name: item.name,
          crmId: this.toCrmBigInt(item.crm_id),
        },
      });
      count++;
    }
    this.logger.log(`Building types upserted: ${count}`);
    return count;
  }

  async processDistricts(data: any[], regionId: number): Promise<number> {
    let count = 0;
    for (const item of data) {
      await this.prisma.district.upsert({
        where: { regionId_externalId: { regionId, externalId: item._id } },
        update: { name: item.name, crmId: this.toCrmBigInt(item.crm_id) },
        create: {
          regionId,
          externalId: item._id,
          name: item.name,
          crmId: this.toCrmBigInt(item.crm_id),
        },
      });
      count++;
    }
    this.logger.log(`Districts upserted: ${count}`);
    return count;
  }

  async processSubways(data: any[], regionId: number): Promise<number> {
    let count = 0;
    for (const item of data) {
      await this.prisma.subway.upsert({
        where: { regionId_externalId: { regionId, externalId: item._id } },
        update: { name: item.name, crmId: this.toCrmBigInt(item.crm_id) },
        create: {
          regionId,
          externalId: item._id,
          name: item.name,
          crmId: this.toCrmBigInt(item.crm_id),
        },
      });
      count++;
    }
    this.logger.log(`Subways upserted: ${count}`);
    return count;
  }

  async processBuilders(data: any[], regionId: number): Promise<number> {
    let count = 0;
    for (const item of data) {
      await this.prisma.builder.upsert({
        where: { regionId_externalId: { regionId, externalId: item._id } },
        update: { name: item.name, crmId: this.toCrmBigInt(item.crm_id) },
        create: {
          regionId,
          externalId: item._id,
          name: item.name,
          crmId: this.toCrmBigInt(item.crm_id),
          dataSource: 'FEED',
        },
      });
      count++;
    }
    this.logger.log(`Builders upserted: ${count}`);
    return count;
  }

  async processBlocks(data: any[], regionId: number): Promise<number> {
    let count = 0;
    const districtMap = await this.buildExternalIdMap('district', regionId);
    const subwayMap = await this.buildExternalIdMap('subway', regionId);
    const usedSlugs = new Set<string>();

    const existingSlugs = await this.prisma.block.findMany({
      where: { regionId },
      select: { slug: true, externalId: true },
    });
    for (const b of existingSlugs) usedSlugs.add(b.slug);

    for (const item of data) {
      let slug = this.generateSlug(item.name, item._id);
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${item._id.slice(-6)}`;
      }
      usedSlugs.add(slug);

      const [lat, lng] = this.extractCoordinates(item.geometry);

      const existing = await this.prisma.block.findUnique({
        where: { regionId_externalId: { regionId, externalId: item._id } },
        select: { slug: true },
      });

      const blockStatus = this.mapBlockStatus(item.status);

      const block = await this.prisma.block.upsert({
        where: { regionId_externalId: { regionId, externalId: item._id } },
        update: {
          name: item.name.trim(),
          description: item.description || null,
          districtId: districtMap.get(item.district) || null,
          latitude: lat ?? null,
          longitude: lng ?? null,
          crmId: this.toCrmBigInt(item.crm_id),
          ...(blockStatus && { status: blockStatus }),
        },
        create: {
          regionId,
          externalId: item._id,
          slug: existing?.slug || slug,
          name: item.name.trim(),
          description: item.description || null,
          districtId: districtMap.get(item.district) || null,
          latitude: lat ?? null,
          longitude: lng ?? null,
          crmId: this.toCrmBigInt(item.crm_id),
          dataSource: 'FEED',
          ...(blockStatus && { status: blockStatus }),
        },
      });

      // Sync addresses
      if (item.address?.length) {
        await this.prisma.blockAddress.deleteMany({ where: { blockId: block.id } });
        for (let i = 0; i < item.address.length; i++) {
          await this.prisma.blockAddress.create({
            data: { blockId: block.id, address: item.address[i], sortOrder: i },
          });
        }
      }

      // Sync images (renderers + plans)
      await this.prisma.blockImage.deleteMany({ where: { blockId: block.id } });
      if (item.renderer?.length) {
        for (let i = 0; i < item.renderer.length; i++) {
          const url = item.renderer[i];
          if (typeof url === 'string' && url.startsWith('http')) {
            await this.prisma.blockImage.create({
              data: { blockId: block.id, url, kind: 'RENDER', sortOrder: i },
            });
          }
        }
      }
      if (item.plan?.length) {
        for (let i = 0; i < item.plan.length; i++) {
          const url = item.plan[i];
          if (typeof url === 'string' && url.startsWith('http')) {
            await this.prisma.blockImage.create({
              data: { blockId: block.id, url, kind: 'PLAN', sortOrder: i },
            });
          }
        }
      }

      // Sync subways
      if (item.subway?.length) {
        await this.prisma.blockSubway.deleteMany({ where: { blockId: block.id } });
        for (const sw of item.subway) {
          const subwayId = subwayMap.get(sw.subway_id);
          if (subwayId) {
            await this.prisma.blockSubway.create({
              data: {
                blockId: block.id,
                subwayId,
                distanceTime: sw.distance_time,
                distanceType: sw.distance_type,
              },
            });
          }
        }
      }

      count++;
    }
    this.logger.log(`Blocks upserted: ${count}`);
    return count;
  }

  async processBuildings(data: any[], regionId: number): Promise<number> {
    let count = 0;
    const blockMap = await this.buildExternalIdMap('block', regionId);
    const buildingTypeMap = await this.buildBuildingTypeMap();

    for (const item of data) {
      const blockId = blockMap.get(item.block_id);
      if (!blockId) continue;

      const [lat, lng] = this.extractCoordinates(item.geometry);
      const queue = item.queue != null ? String(item.queue) : null;

      const building = await this.prisma.building.upsert({
        where: { regionId_externalId: { regionId, externalId: item._id } },
        update: {
          name: item.name || null,
          queue,
          buildingTypeId: buildingTypeMap.get(item.building_type) || null,
          deadline: item.deadline ? new Date(item.deadline) : null,
          deadlineKey: item.deadline_key ? new Date(item.deadline_key) : null,
          subsidy: item.subsidy ?? false,
          latitude: lat,
          longitude: lng,
          crmId: this.toCrmBigInt(item.crm_id),
        },
        create: {
          regionId,
          blockId,
          externalId: item._id,
          crmId: this.toCrmBigInt(item.crm_id),
          name: item.name || null,
          queue,
          buildingTypeId: buildingTypeMap.get(item.building_type) || null,
          deadline: item.deadline ? new Date(item.deadline) : null,
          deadlineKey: item.deadline_key ? new Date(item.deadline_key) : null,
          subsidy: item.subsidy ?? false,
          latitude: lat,
          longitude: lng,
          dataSource: 'FEED',
        },
      });

      // Sync addresses
      if (item.address) {
        await this.prisma.buildingAddress.deleteMany({ where: { buildingId: building.id } });
        await this.prisma.buildingAddress.create({
          data: {
            buildingId: building.id,
            street: item.address.street || null,
            house: item.address.house || null,
            housing: item.address.housing || null,
            streetEn: item.address.street_en || null,
            houseEn: item.address.house_en || null,
            housingEn: item.address.housing_en || null,
          },
        });
      }

      count++;
    }
    this.logger.log(`Buildings upserted: ${count}`);
    return count;
  }

  async processApartments(data: any[], regionId: number): Promise<number> {
    let count = 0;
    const blockMap = await this.buildExternalIdMap('block', regionId);
    const buildingMap = await this.buildExternalIdMap('building', regionId);
    const builderMap = await this.buildExternalIdMap('builder', regionId);
    const districtMap = await this.buildExternalIdMap('district', regionId);
    const roomTypeMap = await this.buildRoomTypeMap();
    const finishingMap = await this.buildFinishingMap();
    const buildingTypeMap = await this.buildBuildingTypeMap();

    const existingExtIds = new Set<string>();

    const batchSize = 500;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      for (const apt of batch) {
        existingExtIds.add(apt._id);

        const blockId = blockMap.get(apt.block_id) || null;
        const buildingId = buildingMap.get(apt.building_id) || null;
        const builderId = builderMap.get(apt.block_builder) || null;
        const districtId = districtMap.get(apt.block_district) || null;

        const listing = await this.prisma.listing.upsert({
          where: { regionId_externalId: { regionId, externalId: apt._id } },
          update: {
            price: apt.price ?? null,
            blockId,
            buildingId,
            builderId,
            districtId,
            status: 'ACTIVE',
          },
          create: {
            regionId,
            kind: 'APARTMENT',
            externalId: apt._id,
            crmId: this.toCrmBigInt(apt.block_crm_id),
            price: apt.price ?? null,
            blockId,
            buildingId,
            builderId,
            districtId,
            dataSource: 'FEED',
            status: 'ACTIVE',
          },
        });

        const roomTypeId = roomTypeMap.get(String(apt.room)) || null;
        const finishingId = finishingMap.get(apt.finishing) || null;
        const buildingTypeId = buildingTypeMap.get(apt.building_type) || null;

        await this.prisma.listingApartment.upsert({
          where: { listingId: listing.id },
          update: {
            roomTypeId,
            finishingId,
            buildingTypeId,
            floor: apt.floor ?? null,
            floorsTotal: apt.floors ?? null,
            number: apt.number || null,
            areaTotal: apt.area_total ?? null,
            areaGiven: apt.area_given ?? null,
            areaRoomsTotal: apt.area_rooms_total ?? null,
            areaKitchen: apt.area_kitchen ?? null,
            areaBalconies: apt.area_balconies_total ?? null,
            areaRoomsDetail: apt.area_rooms || null,
            ceilingHeight: apt.height ?? null,
            wcCount: apt.wc_count ?? null,
            hasMortgage: apt.building_mortgage ?? null,
            hasInstallment: apt.building_installment ?? null,
            hasSubsidy: apt.building_subsidy ?? null,
            hasMilitaryMortgage: apt.building_voen_mortgage ?? null,
            buildingDeadline: apt.building_deadline ? new Date(apt.building_deadline) : null,
            buildingName: apt.building_name || null,
            buildingQueue: apt.building_queue || null,
            blockAddress: apt.block_address || null,
            blockName: apt.block_name || null,
            blockIsCity: apt.block_iscity ?? null,
            blockCityId: apt.block_city || null,
            planUrl: apt.plan?.[0] || null,
          },
          create: {
            listingId: listing.id,
            roomTypeId,
            finishingId,
            buildingTypeId,
            floor: apt.floor ?? null,
            floorsTotal: apt.floors ?? null,
            number: apt.number || null,
            areaTotal: apt.area_total ?? null,
            areaGiven: apt.area_given ?? null,
            areaRoomsTotal: apt.area_rooms_total ?? null,
            areaKitchen: apt.area_kitchen ?? null,
            areaBalconies: apt.area_balconies_total ?? null,
            areaRoomsDetail: apt.area_rooms || null,
            ceilingHeight: apt.height ?? null,
            wcCount: apt.wc_count ?? null,
            hasMortgage: apt.building_mortgage ?? null,
            hasInstallment: apt.building_installment ?? null,
            hasSubsidy: apt.building_subsidy ?? null,
            hasMilitaryMortgage: apt.building_voen_mortgage ?? null,
            buildingDeadline: apt.building_deadline ? new Date(apt.building_deadline) : null,
            buildingName: apt.building_name || null,
            buildingQueue: apt.building_queue || null,
            blockAddress: apt.block_address || null,
            blockName: apt.block_name || null,
            blockIsCity: apt.block_iscity ?? null,
            blockCityId: apt.block_city || null,
            planUrl: apt.plan?.[0] || null,
          },
        });

        // Sync banks
        if (apt.building_bank?.length) {
          await this.prisma.listingApartmentBank.deleteMany({ where: { listingId: listing.id } });
          for (const bankId of apt.building_bank) {
            await this.prisma.listingApartmentBank.create({
              data: { listingId: listing.id, bankExternalId: bankId },
            });
          }
        }

        // Sync contracts
        if (apt.building_contract?.length) {
          await this.prisma.listingApartmentContract.deleteMany({ where: { listingId: listing.id } });
          for (const contractId of apt.building_contract) {
            await this.prisma.listingApartmentContract.create({
              data: { listingId: listing.id, contractExternalId: contractId },
            });
          }
        }

        count++;
      }

      this.logger.log(`Apartments progress: ${Math.min(i + batchSize, data.length)}/${data.length}`);
    }

    // Mark sold: listings from feed that are no longer present
    const soldCount = await this.markSoldListings(regionId, existingExtIds);

    this.logger.log(`Apartments upserted: ${count}, marked sold: ${soldCount}`);
    return count;
  }

  private async markSoldListings(
    regionId: number,
    activeExtIds: Set<string>,
  ): Promise<number> {
    const feedListings = await this.prisma.listing.findMany({
      where: { regionId, dataSource: 'FEED', kind: 'APARTMENT', status: 'ACTIVE' },
      select: { id: true, externalId: true },
    });

    const toMark = feedListings.filter(
      (l) => l.externalId && !activeExtIds.has(l.externalId),
    );

    if (toMark.length > 0) {
      await this.prisma.listing.updateMany({
        where: { id: { in: toMark.map((l) => l.id) } },
        data: { status: 'SOLD' },
      });
    }

    return toMark.length;
  }

  // --- Helpers ---

  private extractCoordinates(geometry: any): [number | null, number | null] {
    if (!geometry?.coordinates) return [null, null];

    if (geometry.type === 'Point') {
      return [geometry.coordinates[1] ?? null, geometry.coordinates[0] ?? null];
    }

    if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates[0])) {
      const ring = geometry.coordinates[0];
      if (!ring.length) return [null, null];
      let sumLat = 0, sumLng = 0;
      for (const [lng, lat] of ring) {
        sumLat += lat;
        sumLng += lng;
      }
      return [sumLat / ring.length, sumLng / ring.length];
    }

    return [null, null];
  }

  // --- Lookup maps ---

  private async buildExternalIdMap(
    entity: 'district' | 'subway' | 'builder' | 'block' | 'building',
    regionId: number,
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    let rows: { id: number; externalId: string | null }[];

    switch (entity) {
      case 'district':
        rows = await this.prisma.district.findMany({ where: { regionId }, select: { id: true, externalId: true } });
        break;
      case 'subway':
        rows = await this.prisma.subway.findMany({ where: { regionId }, select: { id: true, externalId: true } });
        break;
      case 'builder':
        rows = await this.prisma.builder.findMany({ where: { regionId }, select: { id: true, externalId: true } });
        break;
      case 'block':
        rows = await this.prisma.block.findMany({ where: { regionId }, select: { id: true, externalId: true } });
        break;
      case 'building':
        rows = await this.prisma.building.findMany({ where: { regionId }, select: { id: true, externalId: true } });
        break;
    }

    for (const row of rows) {
      if (row.externalId) map.set(row.externalId, row.id);
    }
    return map;
  }

  private async buildRoomTypeMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const rows = await this.prisma.roomType.findMany({ select: { id: true, crmId: true } });
    for (const row of rows) {
      if (row.crmId !== null) map.set(String(row.crmId), row.id);
    }
    return map;
  }

  private async buildFinishingMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const rows = await this.prisma.finishing.findMany({ select: { id: true, externalId: true } });
    for (const row of rows) {
      if (row.externalId) map.set(row.externalId, row.id);
    }
    return map;
  }

  private async buildBuildingTypeMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const rows = await this.prisma.buildingType.findMany({ select: { id: true, externalId: true } });
    for (const row of rows) {
      if (row.externalId) map.set(row.externalId, row.id);
    }
    return map;
  }

  private generateSlug(name: string, externalId: string): string {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[а-яё]/gi, (c) => {
        const m: Record<string, string> = {
          а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
          з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
          п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c',
          ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
        };
        return m[c.toLowerCase()] || c;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return base || externalId.slice(-8);
  }

  /**
   * Derive block status from building deadlines:
   * - All deadlines in the past → COMPLETED
   * - Has buildings with future deadlines → BUILDING
   * - No buildings at all → PROJECT
   */
  async deriveBlockStatuses(regionId: number): Promise<number> {
    const now = new Date();
    const blocks = await this.prisma.block.findMany({
      where: { regionId },
      select: {
        id: true,
        status: true,
        buildings: { select: { deadline: true, deadlineKey: true } },
      },
    });

    let updated = 0;
    for (const block of blocks) {
      let newStatus: 'BUILDING' | 'COMPLETED' | 'PROJECT';

      if (block.buildings.length === 0) {
        newStatus = 'PROJECT';
      } else {
        const deadlines = block.buildings
          .map((b) => b.deadlineKey ?? b.deadline)
          .filter((d): d is Date => d != null);

        if (deadlines.length === 0) {
          newStatus = 'BUILDING';
        } else {
          const allPast = deadlines.every((d) => d < now);
          newStatus = allPast ? 'COMPLETED' : 'BUILDING';
        }
      }

      if (block.status !== newStatus) {
        await this.prisma.block.update({
          where: { id: block.id },
          data: { status: newStatus },
        });
        updated++;
      }
    }

    this.logger.log(`Block statuses derived: ${updated} updated out of ${blocks.length}`);
    return updated;
  }

  private mapBlockStatus(raw: string | undefined | null): 'BUILDING' | 'COMPLETED' | 'PROJECT' | null {
    if (!raw) return null;
    const s = raw.toLowerCase().trim();
    if (s.includes('сдан') || s.includes('complete') || s.includes('built')) return 'COMPLETED';
    if (s.includes('проект') || s.includes('project') || s.includes('план')) return 'PROJECT';
    if (s.includes('строи') || s.includes('building') || s.includes('construct')) return 'BUILDING';
    return null;
  }
}
