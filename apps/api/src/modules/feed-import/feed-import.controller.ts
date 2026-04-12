import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles, CurrentUser } from '../../auth/decorators';
import { FeedImportService } from './feed-import.service';

@ApiTags('Admin / Feed Import')
@ApiBearerAuth()
@Controller('admin/feed-import')
export class FeedImportController {
  constructor(private readonly service: FeedImportService) {}

  @Post('trigger')
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger feed import manually' })
  @ApiQuery({ name: 'region', required: false, example: 'msk' })
  trigger(
    @CurrentUser('sub') userId: string,
    @Query('region') region?: string,
  ) {
    return this.service.triggerImport(region || 'msk', userId);
  }

  @Get('progress')
  @Roles('editor')
  @ApiOperation({ summary: 'Get current import progress' })
  getProgress() {
    return this.service.getProgress() || { step: 'idle', percent: 0 };
  }

  @Get('history')
  @Roles('editor')
  @ApiOperation({ summary: 'Get import history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'per_page', required: false })
  getHistory(
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    return this.service.getHistory(undefined, page ? +page : 1, perPage ? +perPage : 20);
  }
}
