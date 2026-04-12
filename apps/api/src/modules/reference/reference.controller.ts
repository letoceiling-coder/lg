import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { ReferenceService } from './reference.service';

@ApiTags('Reference')
@Controller('reference')
export class ReferenceController {
  constructor(private readonly service: ReferenceService) {}

  @Public()
  @Get('room-types')
  @ApiOperation({ summary: 'List room types' })
  getRoomTypes() {
    return this.service.getRoomTypes();
  }

  @Public()
  @Get('finishings')
  @ApiOperation({ summary: 'List finishings' })
  getFinishings() {
    return this.service.getFinishings();
  }

  @Public()
  @Get('building-types')
  @ApiOperation({ summary: 'List building types' })
  getBuildingTypes() {
    return this.service.getBuildingTypes();
  }
}
