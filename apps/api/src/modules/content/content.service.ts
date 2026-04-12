import { Injectable, NotFoundException } from '@nestjs/common';
import { NavigationItem, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMortgageBankDto } from './dto/create-mortgage-bank.dto';
import { UpdateMortgageBankDto } from './dto/update-mortgage-bank.dto';

type NavItemTree = NavigationItem & { children: NavItemTree[] };

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const rows = await this.prisma.siteSetting.findMany({
      orderBy: [{ groupName: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });
    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      if (!grouped[row.groupName]) {
        grouped[row.groupName] = [];
      }
      grouped[row.groupName].push(row);
    }
    return grouped;
  }

  async updateSettings(data: { key: string; value: string }[]) {
    await this.prisma.$transaction(
      data.map(({ key, value }) =>
        this.prisma.siteSetting.update({
          where: { key },
          data: { value },
        }),
      ),
    );
    return this.getSettings();
  }

  async getPageBlocks(slug: string) {
    return this.prisma.contentBlock.findMany({
      where: { pageSlug: slug, isVisible: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        fields: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
        items: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: {
            fields: {
              orderBy: [{ id: 'asc' }],
            },
          },
        },
      },
    });
  }

  async getNavigation(location: string) {
    const menu = await this.prisma.navigationMenu.findUnique({
      where: { location },
      include: {
        items: {
          where: { isVisible: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!menu) {
      throw new NotFoundException(`Navigation menu "${location}" not found`);
    }
    const tree = this.buildNavigationTree(menu.items as NavigationItem[]);
    return {
      id: menu.id,
      location: menu.location,
      label: menu.label,
      updatedAt: menu.updatedAt,
      items: tree,
    };
  }

  private buildNavigationTree(flat: NavigationItem[]): NavItemTree[] {
    const nodes = new Map<number, NavItemTree>();
    for (const item of flat) {
      nodes.set(item.id, { ...item, children: [] });
    }
    const roots: NavItemTree[] = [];
    for (const item of flat) {
      const node = nodes.get(item.id)!;
      if (item.parentId == null) {
        roots.push(node);
      } else {
        const parent = nodes.get(item.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
    }
    this.sortNavTree(roots);
    return roots;
  }

  private sortNavTree(nodes: NavItemTree[]) {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    for (const n of nodes) {
      if (n.children.length) {
        this.sortNavTree(n.children);
      }
    }
  }

  async getBanks(activeOnly = true) {
    return this.prisma.mortgageBank.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async createBank(dto: CreateMortgageBankDto) {
    return this.prisma.mortgageBank.create({
      data: {
        name: dto.name,
        rateFrom: this.toDecimal(dto.rateFrom),
        rateTo: this.toDecimal(dto.rateTo),
        logoUrl: dto.logoUrl ?? null,
        url: dto.url ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateBank(id: number, dto: UpdateMortgageBankDto) {
    await this.ensureBankExists(id);
    const data: Prisma.MortgageBankUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.rateFrom !== undefined) data.rateFrom = this.toDecimal(dto.rateFrom);
    if (dto.rateTo !== undefined) data.rateTo = this.toDecimal(dto.rateTo);
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (Object.keys(data).length === 0) {
      return this.prisma.mortgageBank.findUniqueOrThrow({ where: { id } });
    }
    return this.prisma.mortgageBank.update({ where: { id }, data });
  }

  async deleteBank(id: number) {
    await this.ensureBankExists(id);
    await this.prisma.mortgageBank.delete({ where: { id } });
  }

  private async ensureBankExists(id: number) {
    const row = await this.prisma.mortgageBank.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException(`Mortgage bank ${id} not found`);
    }
  }

  private toDecimal(value: number | undefined): Prisma.Decimal | null {
    if (value === undefined) {
      return null;
    }
    return new Prisma.Decimal(value);
  }
}
