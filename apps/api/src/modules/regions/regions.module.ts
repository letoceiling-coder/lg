import { Module } from '@nestjs/common';
import { RegionsController } from './regions.controller';
import { RegionsAdminController } from './regions-admin.controller';
import { RegionsService } from './regions.service';

@Module({
  controllers: [RegionsController, RegionsAdminController],
  providers: [RegionsService],
  exports: [RegionsService],
})
export class RegionsModule {}
