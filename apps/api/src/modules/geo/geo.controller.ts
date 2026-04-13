import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { GeoPresetsService } from './geo-presets.service';

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly presets: GeoPresetsService) {}

  @Public()
  @Get('presets/:key')
  @ApiOperation({ summary: 'GeoJSON полигона по ключу (карта / каталог)' })
  preset(@Param('key') key: string) {
    return this.presets.getPolygonForPreset(key);
  }
}
