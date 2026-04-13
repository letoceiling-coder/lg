import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<{ method?: string; path?: string; route?: { path?: string } }>();
    const res = context.switchToHttp().getResponse<{ statusCode?: number }>();
    const path = (req.route?.path as string | undefined) ?? req.path ?? 'unknown';
    if (path.includes('metrics')) {
      return next.handle();
    }

    const start = process.hrtime.bigint();
    return next.handle().pipe(
      tap({
        finalize: () => {
          const end = process.hrtime.bigint();
          const seconds = Number(end - start) / 1e9;
          const method = req.method ?? 'GET';
          const status = res.statusCode && res.statusCode > 0 ? res.statusCode : 500;
          this.metrics.observeHttpRequest(method, path, status, seconds);
        },
      }),
    );
  }
}
