import { Module } from '@nestjs/common';
import { MediaAdminController } from './media-admin.controller';
import { MediaService } from './media.service';

@Module({
  controllers: [MediaAdminController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
