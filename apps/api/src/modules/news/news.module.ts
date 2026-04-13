import { Module } from '@nestjs/common';
import { NewsController, NewsAdminController } from './news.controller';
import { NewsService } from './news.service';
import { TelegramNewsQrAuthService } from './telegram-news-qr.service';

@Module({
  controllers: [NewsController, NewsAdminController],
  providers: [NewsService, TelegramNewsQrAuthService],
})
export class NewsModule {}
