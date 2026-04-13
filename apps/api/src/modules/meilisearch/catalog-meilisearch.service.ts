import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const INDEX_UID = 'lg_catalog_blocks';

type BlockIndexDoc = {
  id: number;
  regionId: number;
  slug: string;
  name: string;
  text: string;
};

type MeiliTask = { taskUid?: number; status?: string };

@Injectable()
export class CatalogMeilisearchService {
  private readonly logger = new Logger(CatalogMeilisearchService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const host = (this.config.get<string>('MEILI_HOST') ?? '').trim().replace(/\/+$/, '');
    this.baseUrl = host;
    this.apiKey = (this.config.get<string>('MEILI_API_KEY') ?? '').trim();
  }

  isEnabled(): boolean {
    return Boolean(this.baseUrl);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
    const res = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string>) } });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Meilisearch HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  private async waitForTask(taskUid: number, timeOutMs = 120_000): Promise<void> {
    const deadline = Date.now() + timeOutMs;
    while (Date.now() < deadline) {
      const task = await this.request<{ status: string; error?: { message?: string } }>(`/tasks/${taskUid}`);
      if (task.status === 'succeeded') return;
      if (task.status === 'failed') {
        throw new Error(task.error?.message ?? 'Meilisearch task failed');
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('Meilisearch task timeout');
  }

  async ensureIndex(): Promise<void> {
    if (!this.baseUrl) return;
    try {
      await this.request(`/indexes/${INDEX_UID}`);
    } catch {
      const t = await this.request<MeiliTask>('/indexes', {
        method: 'POST',
        body: JSON.stringify({ uid: INDEX_UID, primaryKey: 'id' }),
      });
      if (t.taskUid != null) await this.waitForTask(t.taskUid);
    }
    const st = await this.request<MeiliTask>(`/indexes/${INDEX_UID}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({
        searchableAttributes: ['name', 'text', 'slug'],
        filterableAttributes: ['regionId'],
        displayedAttributes: ['id', 'regionId', 'slug', 'name', 'text'],
      }),
    });
    if (st.taskUid != null) await this.waitForTask(st.taskUid);
  }

  /** null — ошибка или Meili выключен; [] — пустая выдача */
  async searchBlockIds(regionId: number, q: string, limit: number): Promise<number[] | null> {
    if (!this.baseUrl) return null;
    const term = q.trim();
    if (!term) return [];
    try {
      const res = await this.request<{ hits: Array<{ id: number }> }>(`/indexes/${INDEX_UID}/search`, {
        method: 'POST',
        body: JSON.stringify({
          q: term,
          filter: `regionId = ${regionId}`,
          limit: Math.min(Math.max(limit, 1), 2000),
          attributesToRetrieve: ['id'],
        }),
      });
      return res.hits.map((h) => Number(h.id));
    } catch (e) {
      this.logger.warn(`Meilisearch search failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  async fullReindex(): Promise<{ indexed: number }> {
    if (!this.baseUrl) throw new Error('MEILI_HOST не задан');
    await this.ensureIndex();
    const blocks = await this.prisma.block.findMany({
      select: {
        id: true,
        regionId: true,
        slug: true,
        name: true,
        district: { select: { name: true } },
        builder: { select: { name: true } },
        addresses: { select: { address: true } },
        subways: { select: { subway: { select: { name: true } } } },
      },
    });
    const docs: BlockIndexDoc[] = blocks.map((b) => {
      const parts = [
        b.name,
        b.slug,
        b.district?.name,
        b.builder?.name,
        ...b.addresses.map((a) => a.address),
        ...b.subways.map((s) => s.subway.name),
      ].filter(Boolean) as string[];
      return {
        id: b.id,
        regionId: b.regionId,
        slug: b.slug,
        name: b.name,
        text: parts.join(' '),
      };
    });

    try {
      const del = await this.request<MeiliTask>(`/indexes/${INDEX_UID}/documents`, { method: 'DELETE' });
      if (del.taskUid != null) await this.waitForTask(del.taskUid);
    } catch (e) {
      this.logger.warn(`Meilisearch clear index: ${e instanceof Error ? e.message : String(e)}`);
    }

    const batchSize = 500;
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const add = await this.request<MeiliTask>(`/indexes/${INDEX_UID}/documents`, {
        method: 'POST',
        body: JSON.stringify(chunk),
      });
      if (add.taskUid != null) await this.waitForTask(add.taskUid);
    }

    return { indexed: docs.length };
  }
}
