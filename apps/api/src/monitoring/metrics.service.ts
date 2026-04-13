import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly register: Registry;
  private readonly httpDuration: Histogram<'method' | 'route' | 'status_code'>;
  private readonly httpRequests: Counter<'method' | 'route' | 'status_code'>;
  private readonly telegramFailures: Counter<'method' | 'kind'>;
  private readonly feedQueueEvents: Counter<'result'>;

  constructor() {
    this.register = new Registry();
    collectDefaultMetrics({ register: this.register });

    this.httpDuration = new Histogram({
      name: 'lg_http_request_duration_seconds',
      help: 'Длительность HTTP-запросов к API',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    });

    this.httpRequests = new Counter({
      name: 'lg_http_requests_total',
      help: 'Число HTTP-запросов',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.telegramFailures = new Counter({
      name: 'lg_telegram_send_failures_total',
      help: 'Неуспешные вызовы Telegram Bot API (sendMessage/sendPhoto)',
      labelNames: ['method', 'kind'],
      registers: [this.register],
    });

    this.feedQueueEvents = new Counter({
      name: 'lg_feed_import_jobs_total',
      help: 'Завершения задач BullMQ импорта фидов',
      labelNames: ['result'],
      registers: [this.register],
    });
  }

  observeHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number): void {
    const r = this.normalizeRoute(route);
    const sc = String(statusCode);
    const labels = { method: method || 'GET', route: r, status_code: sc };
    this.httpDuration.observe(labels, durationSeconds);
    this.httpRequests.inc(labels);
  }

  recordTelegramSendFailure(method: 'sendMessage' | 'sendPhoto', kind: 'bad_request' | 'http_error' | 'not_ok'): void {
    this.telegramFailures.inc({ method, kind });
  }

  recordFeedImportJob(result: 'completed' | 'failed'): void {
    this.feedQueueEvents.inc({ result });
  }

  /** Укрупнение путей для кардинальности меток */
  private normalizeRoute(route: string): string {
    if (!route || route === '*') return 'unknown';
    let r = route;
    r = r.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid');
    r = r.replace(/\/-?\d+(?=\/|$)/g, '/:id');
    if (r.length > 120) return `${r.slice(0, 117)}...`;
    return r;
  }
}
