import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { CollectionsService } from './collections.service';

@ApiTags('Public selections')
@Controller('selections')
export class PublicSelectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Публичная подборка по токену' })
  getByToken(@Param('token') token: string) {
    return this.service.getPublicByToken(token);
  }
}
