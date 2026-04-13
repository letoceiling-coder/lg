import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379');
    try {
      this.redis = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      this.redis.on('error', (e) => {
        this.logger.warn(`Redis cache error: ${e.message}`);
      });
      await this.redis.connect();
      this.logger.log('Redis cache connected');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Redis cache disabled: ${msg}`);
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (!this.redis) return;
    try {
      await this.redis.quit();
    } catch {
      // no-op on shutdown
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds: number) {
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // cache write failures should not fail request
    }
  }

  async delByPrefix(prefix: string) {
    if (!this.redis) return;
    try {
      const stream = this.redis.scanStream({ match: `${prefix}*`, count: 200 });
      const keys: string[] = [];
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: string[]) => {
          for (const key of chunk) keys.push(key);
        });
        stream.on('error', reject);
        stream.on('end', () => resolve());
      });
      if (keys.length) {
        await this.redis.del(keys);
      }
    } catch {
      // ignore cache invalidation issues
    }
  }
}
