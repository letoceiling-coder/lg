import { Injectable } from '@nestjs/common';
import { ListingStatus, ListingKind, RequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const HERO_LISTING_KINDS: ListingKind[] = [
  ListingKind.APARTMENT,
  ListingKind.HOUSE,
  ListingKind.LAND,
  ListingKind.COMMERCIAL,
];

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Публичные счётчики активных опубликованных лотов по типу (для табов на главной). */
  async listingKindCounts(regionId: number): Promise<Record<string, number>> {
    const rows = await this.prisma.listing.groupBy({
      by: ['kind'],
      where: {
        regionId,
        status: ListingStatus.ACTIVE,
        isPublished: true,
        kind: { in: HERO_LISTING_KINDS },
      },
      _count: { _all: true },
    });
    const out: Record<string, number> = {
      APARTMENT: 0,
      HOUSE: 0,
      LAND: 0,
      COMMERCIAL: 0,
    };
    for (const r of rows) {
      const k = String(r.kind);
      if (k in out) out[k] = r._count._all;
    }
    return out;
  }

  async getCounters() {
    const [blocks, apartments, builders, regions] = await Promise.all([
      this.prisma.block.count(),
      this.prisma.listing.count({
        where: { status: ListingStatus.ACTIVE, kind: ListingKind.APARTMENT, isPublished: true },
      }),
      this.prisma.builder.count(),
      this.prisma.feedRegion.count({ where: { isEnabled: true } }),
    ]);

    return { blocks, apartments, builders, regions };
  }

  async getAdminDashboardStats(days = 14) {
    const safeDays = Math.min(90, Math.max(7, days));
    const from = new Date();
    from.setDate(from.getDate() - (safeDays - 1));
    from.setHours(0, 0, 0, 0);

    const [createdRows, statusRows, assigneeRows] = await Promise.all([
      this.prisma.request.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.request.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.request.groupBy({
        by: ['assignedTo'],
        where: {
          assignedTo: { not: null },
          status: { in: [RequestStatus.NEW, RequestStatus.IN_PROGRESS] },
        },
        _count: { _all: true },
        orderBy: { _count: { assignedTo: 'desc' } },
      }),
    ]);

    const byDate = new Map<string, { created: number; completed: number; cancelled: number }>();
    for (let i = 0; i < safeDays; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDate.set(key, { created: 0, completed: 0, cancelled: 0 });
    }

    for (const r of createdRows) {
      const key = new Date(r.createdAt).toISOString().slice(0, 10);
      const cell = byDate.get(key);
      if (!cell) continue;
      cell.created += 1;
      if (r.status === RequestStatus.COMPLETED) cell.completed += 1;
      if (r.status === RequestStatus.CANCELLED) cell.cancelled += 1;
    }

    const trend = [...byDate.entries()].map(([date, v]) => ({ date, ...v }));
    const statusTotals = {
      NEW: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const r of statusRows) {
      const key = String(r.status) as keyof typeof statusTotals;
      if (key in statusTotals) statusTotals[key] = r._count._all;
    }

    const assigneeIds = assigneeRows
      .map((r) => r.assignedTo)
      .filter((v): v is string => typeof v === 'string');
    const assignees = assigneeIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, fullName: true, email: true, role: true },
        })
      : [];
    const assigneeMap = new Map(assignees.map((a) => [a.id, a]));
    const workload = assigneeRows.map((r) => {
      const a = r.assignedTo ? assigneeMap.get(r.assignedTo) : null;
      return {
        assigneeId: r.assignedTo,
        assigneeName: a?.fullName ?? a?.email ?? r.assignedTo ?? '—',
        role: a?.role ?? null,
        openRequests: r._count._all,
      };
    });

    return {
      periodDays: safeDays,
      trend,
      statusTotals,
      workload,
    };
  }
}
