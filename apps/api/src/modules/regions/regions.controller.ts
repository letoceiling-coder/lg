import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { RegionsService } from './regions.service';

@ApiTags('Regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly service: RegionsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List enabled regions' })
  findAll() {
    return this.service.findAll();
  }
}
