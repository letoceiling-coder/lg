import { Module } from '@nestjs/common';
import { ListingsAdminController } from './listings-admin.controller';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  controllers: [ListingsController, ListingsAdminController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
