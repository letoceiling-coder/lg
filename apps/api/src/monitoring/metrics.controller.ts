import { Controller, Get, Header, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { MetricsService } from './metrics.service';

@ApiExcludeController()
@Public()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(@Headers('authorization') authorization?: string): Promise<string> {
    const expected = (process.env.METRICS_BEARER_TOKEN ?? '').trim();
    if (expected) {
      const token = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
      if (token !== expected) {
        throw new UnauthorizedException('Invalid metrics token');
      }
    }
    return this.metrics.register.metrics();
  }
}
