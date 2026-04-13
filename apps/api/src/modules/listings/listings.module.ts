import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ListingsAdminController } from './listings-admin.controller';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [AuditModule],
  controllers: [ListingsController, ListingsAdminController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
