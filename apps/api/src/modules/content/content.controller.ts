import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../auth/decorators';
import { ContentService } from './content.service';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private readonly service: ContentService) {}

  @Public()
  @Get('settings')
  @ApiOperation({ summary: 'Site settings grouped by group' })
  getSettings() {
    return this.service.getSettings();
  }

  @Post('settings')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Admin: update site settings (array of {key, value})' })
  updateSettings(@Body() data: { key: string; value: string }[]) {
    return this.service.updateSettings(data);
  }

  @Public()
  @Get('page/:slug')
  @ApiOperation({ summary: 'Visible content blocks for a page' })
  getPageBlocks(@Param('slug') slug: string) {
    return this.service.getPageBlocks(slug);
  }

  @Public()
  @Get('navigation/:location')
  @ApiOperation({ summary: 'Navigation menu with nested items' })
  getNavigation(@Param('location') location: string) {
    return this.service.getNavigation(location);
  }

  @Public()
  @Get('banks')
  @ApiOperation({ summary: 'Active mortgage banks' })
  getBanks() {
    return this.service.getBanks(true);
  }
}
