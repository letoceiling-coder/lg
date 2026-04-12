import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { NavigationItem, Prisma, SiteSetting } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMortgageBankDto } from './dto/create-mortgage-bank.dto';
import { UpdateMortgageBankDto } from './dto/update-mortgage-bank.dto';
import {
  DEFAULT_DEMO_NEWS,
  DEFAULT_HOMEPAGE_SITE_SETTINGS,
  DEFAULT_INTEGRATION_SITE_SETTINGS,
  INTEGRATIONS_SITE_SETTINGS_GROUP,
} from './content-defaults';

type NavItemTree = NavigationItem & { children: NavItemTree[] };

const homepageDefaultsByKey = new Map(DEFAULT_HOMEPAGE_SITE_SETTINGS.map((r) => [r.key, r]));
const integrationDefaultsByKey = new Map(DEFAULT_INTEGRATION_SITE_SETTINGS.map((r) => [r.key, r]));
const integrationKeys = new Set(integrationDefaultsByKey.keys());
const settingDefaultsByKey = new Map([...homepageDefaultsByKey, ...integrationDefaultsByKey]);

@Injectable()
export class ContentService implements OnModuleInit {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureHomepageSiteSettings();
    await this.ensureIntegrationSiteSettings();
    await this.ensureDemoNewsIfEmpty();
    await this.ensureDemoNewsCovers();
  }

  /** Создаёт строки site_settings для главной, если их ещё нет (прод без prisma seed). */
  private async ensureHomepageSiteSettings() {
    for (const row of DEFAULT_HOMEPAGE_SITE_SETTINGS) {
      await this.prisma.siteSetting.upsert({
        where: { key: row.key },
        update: {},
        create: row,
      });
    }
    this.logger.log('Homepage site_settings ensured');
  }

  /** Telegram и др.: строки в БД, правки только из админки (не .env). */
  private async ensureIntegrationSiteSettings() {
    for (const row of DEFAULT_INTEGRATION_SITE_SETTINGS) {
      await this.prisma.siteSetting.upsert({
        where: { key: row.key },
        update: {},
        create: row,
      });
    }
    this.logger.log('Integration site_settings ensured');
  }

  /** Если таблица news пуста — демо-статьи как в шаблоне (главная + /admin/news). */
  private async ensureDemoNewsIfEmpty() {
    const n = await this.prisma.news.count();
    if (n > 0) return;
    const now = new Date();
    for (let i = 0; i < DEFAULT_DEMO_NEWS.length; i++) {
      const article = DEFAULT_DEMO_NEWS[i];
      const publishedAt = new Date(now);
      publishedAt.setDate(publishedAt.getDate() - (DEFAULT_DEMO_NEWS.length - i));
      await this.prisma.news.create({
        data: {
          slug: article.slug,
          title: article.title,
          body: article.body,
          source: article.source,
          imageUrl: article.imageUrl,
          isPublished: true,
          publishedAt,
        },
      });
    }
    this.logger.log(`Seeded ${DEFAULT_DEMO_NEWS.length} demo news (DB was empty)`);
  }

  /** Обложки демо-новостей: пусто, внешний CDN (picsum) или старый URL → локальные `/news/covers/*`. */
  private async ensureDemoNewsCovers() {
    for (const article of DEFAULT_DEMO_NEWS) {
      if (!article.imageUrl) continue;
      const r = await this.prisma.news.updateMany({
        where: {
          slug: article.slug,
          OR: [
            { imageUrl: null },
            { imageUrl: '' },
            { imageUrl: { contains: 'picsum.photos' } },
          ],
        },
        data: { imageUrl: article.imageUrl },
      });
      if (r.count > 0) {
        this.logger.log(`News cover set: ${article.slug}`);
      }
    }
  }

  private async loadAllSettingsGrouped(): Promise<Record<string, SiteSetting[]>> {
    const rows = await this.prisma.siteSetting.findMany({
      orderBy: [{ groupName: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });
    const grouped: Record<string, SiteSetting[]> = {};
    for (const row of rows) {
      if (!grouped[row.groupName]) {
        grouped[row.groupName] = [];
      }
      grouped[row.groupName].push(row);
    }
    return grouped;
  }

  private omitIntegrationsGroup(
    grouped: Record<string, SiteSetting[]>,
  ): Record<string, SiteSetting[]> {
    const { [INTEGRATIONS_SITE_SETTINGS_GROUP]: _removed, ...rest } = grouped;
    return rest;
  }

  /** Публичный API: без группы integrations (токены и т.д.). */
  async getSettingsPublic() {
    return this.omitIntegrationsGroup(await this.loadAllSettingsGrouped());
  }

  /** Админка: редактор не видит группу integrations. */
  async getSettingsForAdminRole(role: string) {
    const grouped = await this.loadAllSettingsGrouped();
    if (role === 'admin') return grouped;
    return this.omitIntegrationsGroup(grouped);
  }

  /** Уведомления о заявках: значения из site_settings (не из env). */
  /** Ключ для загрузки виджета карт в браузере (не секрет сервера; хранится в integrations). */
  async getYandexMapsPublicConfig(): Promise<{ apiKey: string | null }> {
    const row = await this.prisma.siteSetting.findUnique({
      where: { key: 'yandex_maps_api_key' },
      select: { value: true },
    });
    const v = row?.value?.trim();
    return { apiKey: v && v.length > 0 ? v : null };
  }

  async getTelegramNotifyCredentials(): Promise<{ botToken: string; notifyChatId: string }> {
    const keys = ['telegram_bot_token', 'telegram_notify_chat_id'] as const;
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { in: [...keys] } },
      select: { key: true, value: true },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
    return {
      botToken: String(map.telegram_bot_token ?? '').trim(),
      notifyChatId: String(map.telegram_notify_chat_id ?? '').trim(),
    };
  }

  async updateSettings(
    data: { key: string; value: string }[],
    ctx: { requesterRole: string; returnMode: 'public' | 'admin' },
  ) {
    const filtered = data.filter(({ key }) => {
      if (!integrationKeys.has(key)) return true;
      return ctx.requesterRole === 'admin';
    });

    await this.prisma.$transaction(
      filtered.map(({ key, value }) => {
        const base = settingDefaultsByKey.get(key);
        if (base) {
          return this.prisma.siteSetting.upsert({
            where: { key },
            update: { value },
            create: { ...base, value },
          });
        }
        return this.prisma.siteSetting.update({
          where: { key },
          data: { value },
        });
      }),
    );

    if (ctx.returnMode === 'public') {
      return this.getSettingsPublic();
    }
    return this.getSettingsForAdminRole(ctx.requesterRole);
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
