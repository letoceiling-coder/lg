import { Module } from '@nestjs/common';
import { BlocksController } from './blocks.controller';
import { BlocksAdminController } from './blocks-admin.controller';
import { BlocksService } from './blocks.service';

@Module({
  controllers: [BlocksController, BlocksAdminController],
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
