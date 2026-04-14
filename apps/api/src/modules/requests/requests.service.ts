import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RequestStatus, RequestType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { TelegramNotifyService } from './telegram-notify.service';

const assignedUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
} as const;

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramNotify: TelegramNotifyService,
  ) {}

  async create(dto: CreateRequestDto, userId?: string | null) {
    const type = this.resolveType(dto.type);
    const row = await this.prisma.request.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        type,
        status: RequestStatus.NEW,
        blockId: dto.blockId,
        listingId: dto.listingId,
        sourceUrl: dto.sourceUrl,
        comment: dto.comment,
        ...(userId ? { userId } : {}),
      } as Prisma.RequestCreateInput,
    });

    if (await this.telegramNotify.isConfigured()) {
      void (async () => {
        try {
          const ok = await this.telegramNotify.notifyNewRequest(row);
          if (ok) {
            await this.prisma.request.update({
              where: { id: row.id },
              data: { telegramSent: true },
            });
          }
        } catch (e) {
          this.logger.warn(
            `Telegram notify failed for request ${row.id}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      })();
    }

    return row;
  }

  /** Заявки, созданные с привязкой к пользователю (JWT при POST /requests). */
  async findByUserId(userId: string, take = 100) {
    return this.prisma.request.findMany({
      where: { userId } as Prisma.RequestWhereInput,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        type: true,
        status: true,
        blockId: true,
        listingId: true,
        sourceUrl: true,
        comment: true,
        createdAt: true,
      },
    });
  }

  async findAll(status?: string, assignedTo?: string, page = 1, perPage = 20) {
    const where: Prisma.RequestWhereInput = {};
    if (status !== undefined && status !== '') {
      where.status = this.parseStatus(status);
    }
    if (assignedTo === 'none') {
      where.assignedTo = null;
    } else if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    const [data, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          assignedUser: { select: assignedUserSelect },
        },
      }),
      this.prisma.request.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: number) {
    const row = await this.prisma.request.findUnique({
      where: { id },
      include: {
        assignedUser: { select: assignedUserSelect },
      },
    });
    if (!row) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    return row;
  }

  async listAssignees() {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['manager', 'agent', 'editor', 'admin'] },
        isActive: true,
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        role: true,
        fullName: true,
        email: true,
      },
    });
  }

  async updateStatus(
    id: number,
    status: string,
    assignedTo?: string | null,
  ) {
    await this.findOne(id);
    const data: { status: RequestStatus; assignedTo?: string | null } = {
      status: this.parseStatus(status),
    };
    if (assignedTo !== undefined) {
      data.assignedTo = assignedTo;
    }
    return this.prisma.request.update({
      where: { id },
      data,
      include: {
        assignedUser: { select: assignedUserSelect },
      },
    });
  }

  private resolveType(raw?: string): RequestType {
    if (raw === undefined || raw === '') {
      return RequestType.CONSULTATION;
    }
    if (!Object.values(RequestType).includes(raw as RequestType)) {
      throw new BadRequestException(`Invalid request type: ${raw}`);
    }
    return raw as RequestType;
  }

  private parseStatus(raw: string): RequestStatus {
    if (!Object.values(RequestStatus).includes(raw as RequestStatus)) {
      throw new BadRequestException(`Invalid request status: ${raw}`);
    }
    return raw as RequestStatus;
  }
}
