import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../auth/decorators';
import { NewsService } from './news.service';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly service: NewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published news (public)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'per_page', required: false })
  findAllPublic(@Query('page') page?: number, @Query('per_page') perPage?: number) {
    return this.service.findAll(page, perPage, true);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get news article by slug (public)' })
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }
}

@ApiTags('Admin / News')
@Controller('admin/news')
export class NewsAdminController {
  constructor(private readonly service: NewsService) {}

  @Post('sync-rss')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: import news from RSS/Atom (dedupe by sourceUrl)' })
  syncRss(@Body() body?: { url?: string | null }) {
    return this.service.syncFromRss(body?.url);
  }

  @Get()
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: list all news (including drafts)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'per_page', required: false })
  findAll(@Query('page') page?: number, @Query('per_page') perPage?: number) {
    return this.service.findAll(page, perPage, false);
  }

  @Post()
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: create news article' })
  create(@Body() dto: { title: string; slug: string; body?: string; imageUrl?: string; source?: string; sourceUrl?: string; isPublished?: boolean }) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: update news article' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: { title?: string; slug?: string; body?: string; imageUrl?: string; source?: string; sourceUrl?: string; isPublished?: boolean }) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: delete news article' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
