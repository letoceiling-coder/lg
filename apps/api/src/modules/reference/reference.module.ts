import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ReferenceController } from './reference.controller';
import { ReferenceAdminController } from './reference-admin.controller';
import { ReferenceService } from './reference.service';

@Module({
  imports: [AuditModule],
  controllers: [ReferenceController, ReferenceAdminController],
  providers: [ReferenceService],
})
export class ReferenceModule {}
