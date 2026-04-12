import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const AUDIT_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
} satisfies Prisma.UserSelect;

function parseAuditAction(action: string): AuditAction {
  const normalized = action.trim().toUpperCase();
  if (normalized === 'CREATE' || normalized === 'UPDATE' || normalized === 'DELETE') {
    return normalized as AuditAction;
  }
  throw new BadRequestException(
    'Invalid action; expected CREATE, UPDATE, or DELETE',
  );
}

function parseAuditActionFilter(action?: string): AuditAction | undefined {
  if (action === undefined || action === '') return undefined;
  return parseAuditAction(action);
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    entityType?: string,
    userId?: string,
    action?: string,
    page = 1,
    perPage = 20,
  ): Promise<{
    items: Array<{
      id: string;
      userId: string | null;
      entityType: string;
      entityId: number;
      action: AuditAction;
      oldData: Prisma.JsonValue | null;
      newData: Prisma.JsonValue | null;
      ipAddress: string | null;
      createdAt: Date;
      user: Prisma.UserGetPayload<{ select: typeof AUDIT_USER_SELECT }> | null;
    }>;
    total: number;
    page: number;
    perPage: number;
  }> {
    const safePage = Math.max(1, page);
    const safePerPage = Math.min(100, Math.max(1, perPage));
    const skip = (safePage - 1) * safePerPage;

    const where: Prisma.AuditEventWhereInput = {};
    if (entityType?.trim()) where.entityType = entityType.trim();
    if (userId?.trim()) where.userId = userId.trim();
    const parsedAction = parseAuditActionFilter(action);
    if (parsedAction) where.action = parsedAction;

    const [rows, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        include: { user: { select: AUDIT_USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safePerPage,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    const items = rows.map((e) => ({
      id: e.id.toString(),
      userId: e.userId,
      entityType: e.entityType,
      entityId: e.entityId,
      action: e.action,
      oldData: e.oldData,
      newData: e.newData,
      ipAddress: e.ipAddress,
      createdAt: e.createdAt,
      user: e.user,
    }));

    return { items, total, page: safePage, perPage: safePerPage };
  }

  async log(
    userId: string | null,
    entityType: string,
    entityId: number,
    action: string,
    oldData?: unknown,
    newData?: unknown,
    ipAddress?: string,
  ) {
    return this.prisma.auditEvent.create({
      data: {
        userId,
        entityType,
        entityId,
        action: parseAuditAction(action),
        oldData:
          oldData === undefined
            ? undefined
            : (oldData as Prisma.InputJsonValue),
        newData:
          newData === undefined
            ? undefined
            : (newData as Prisma.InputJsonValue),
        ipAddress,
      },
    });
  }
}
