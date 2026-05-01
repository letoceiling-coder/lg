import { Module } from '@nestjs/common';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { PublicSelectionsController } from './public-selections.controller';

@Module({
  controllers: [CollectionsController, PublicSelectionsController],
  providers: [CollectionsService],
})
export class CollectionsModule {}
