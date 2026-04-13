import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { BuildingsAdminController } from './buildings-admin.controller';

@Module({
  imports: [AuditModule],
  controllers: [BuildingsController, BuildingsAdminController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
