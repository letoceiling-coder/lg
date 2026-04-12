import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { ContentService } from './content.service';
import { CreateMortgageBankDto } from './dto/create-mortgage-bank.dto';
import { UpdateMortgageBankDto } from './dto/update-mortgage-bank.dto';
import { SiteSettingEntryDto } from './dto/site-setting-entry.dto';

@ApiTags('Admin / Content')
@ApiBearerAuth()
@Controller('admin/content')
export class ContentAdminController {
  constructor(private readonly service: ContentService) {}

  @Get('settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: site settings grouped by group' })
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @Roles('admin')
  @ApiBody({ type: [SiteSettingEntryDto] })
  @ApiOperation({ summary: 'Admin: batch update site settings' })
  updateSettings(
    @Body(new ParseArrayPipe({ items: SiteSettingEntryDto }))
    body: SiteSettingEntryDto[],
  ) {
    return this.service.updateSettings(body);
  }

  @Get('banks')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: list mortgage banks (all)' })
  getBanks() {
    return this.service.getBanks(false);
  }

  @Post('banks')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: create mortgage bank' })
  createBank(@Body() body: CreateMortgageBankDto) {
    return this.service.createBank(body);
  }

  @Put('banks/:id')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: update mortgage bank' })
  updateBank(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMortgageBankDto,
  ) {
    return this.service.updateBank(id, body);
  }

  @Delete('banks/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: delete mortgage bank' })
  deleteBank(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteBank(id);
  }
}
