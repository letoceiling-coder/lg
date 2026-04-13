import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { UsersModule } from '../users/users.module';
import {
  RequestsAdminController,
  RequestsController,
  TelegramBotController,
  TelegramNotifyAdminController,
} from './requests.controller';
import { RequestsService } from './requests.service';
import { TelegramNotifyService } from './telegram-notify.service';

@Module({
  imports: [ContentModule, UsersModule],
  controllers: [
    RequestsController,
    RequestsAdminController,
    TelegramBotController,
    TelegramNotifyAdminController,
  ],
  providers: [RequestsService, TelegramNotifyService],
  exports: [RequestsService],
})
export class RequestsModule {}
