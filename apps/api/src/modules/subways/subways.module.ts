import { Module } from '@nestjs/common';
import { SubwaysController } from './subways.controller';
import { SubwaysService } from './subways.service';

@Module({
  controllers: [SubwaysController],
  providers: [SubwaysService],
})
export class SubwaysModule {}
