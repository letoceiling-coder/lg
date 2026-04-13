import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { GeoModule } from '../geo/geo.module';
import { ListingsAdminController } from './listings-admin.controller';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [AuditModule, GeoModule],
  controllers: [ListingsController, ListingsAdminController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
