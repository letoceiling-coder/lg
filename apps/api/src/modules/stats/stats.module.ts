import { Module } from '@nestjs/common';
import { StatsAdminController, StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  controllers: [StatsController, StatsAdminController],
  providers: [StatsService],
})
export class StatsModule {}
