import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeoSpatialService } from './geo-spatial.service';
import { GeoPresetsService } from './geo-presets.service';
import { GeoController } from './geo.controller';

@Module({
  imports: [PrismaModule],
  controllers: [GeoController],
  providers: [GeoSpatialService, GeoPresetsService],
  exports: [GeoSpatialService, GeoPresetsService],
})
export class GeoModule {}
