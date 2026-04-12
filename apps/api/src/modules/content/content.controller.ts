import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, Roles, CurrentUser } from '../../auth/decorators';
import { ContentService } from './content.service';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private readonly service: ContentService) {}

  @Public()
  @Get('settings')
  @ApiOperation({ summary: 'Site settings (без секретов интеграций)' })
  getSettings() {
    return this.service.getSettingsPublic();
  }

  @Post('settings')
  @Roles('admin', 'editor')
  @ApiOperation({
    summary: 'Обновить настройки (устаревший путь; предпочтительно PUT /admin/content/settings)',
  })
  updateSettings(
    @Body() data: { key: string; value: string }[],
    @CurrentUser() user: { role: string },
  ) {
    return this.service.updateSettings(data, {
      requesterRole: user.role,
      returnMode: 'public',
    });
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
