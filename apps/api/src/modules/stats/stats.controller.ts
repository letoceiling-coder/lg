import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../auth/decorators';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Public()
  @Get('counters')
  @ApiOperation({ summary: 'Public counters for homepage (blocks, apartments, builders, regions)' })
  getCounters() {
    return this.service.getCounters();
  }

  @Public()
  @Get('listing-kind-counts')
  @ApiOperation({ summary: 'Counts of active published listings by kind for a feed region (hero tabs)' })
  listingKindCounts(@Query('region_id') regionIdRaw: string) {
    const regionId = parseInt(regionIdRaw, 10);
    if (!Number.isFinite(regionId) || regionId < 1) {
      throw new BadRequestException('region_id is required');
    }
    return this.service.listingKindCounts(regionId);
  }
}

@ApiTags('Admin / Stats')
@Controller('admin/stats')
export class StatsAdminController {
  constructor(private readonly service: StatsService) {}

  @Get('dashboard')
  @Roles('manager')
  @ApiOperation({ summary: 'Admin dashboard KPI and trend data' })
  dashboard(@Query('days') daysRaw?: string) {
    const days = daysRaw ? Number(daysRaw) : 14;
    return this.service.getAdminDashboardStats(days);
  }
}
