import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BuildersController } from './builders.controller';
import { BuildersService } from './builders.service';
import { BuildersAdminController } from './builders-admin.controller';

@Module({
  imports: [AuditModule],
  controllers: [BuildersController, BuildersAdminController],
  providers: [BuildersService],
})
export class BuildersModule {}
