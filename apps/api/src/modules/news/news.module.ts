import { Module } from '@nestjs/common';
import { NewsController, NewsAdminController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  controllers: [NewsController, NewsAdminController],
  providers: [NewsService],
})
export class NewsModule {}
