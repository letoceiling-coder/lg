import { Module } from '@nestjs/common';
import { RequestsAdminController, RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { TelegramNotifyService } from './telegram-notify.service';

@Module({
  controllers: [RequestsController, RequestsAdminController],
  providers: [RequestsService, TelegramNotifyService],
  exports: [RequestsService],
})
export class RequestsModule {}
