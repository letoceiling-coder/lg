import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../auth/decorators';
import { NewsService } from './news.service';
import { TelegramNewsQrAuthService } from './telegram-news-qr.service';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly service: NewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published news (public)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'per_page', required: false })
  @ApiQuery({ name: 'region_id', required: false, description: 'ID города (feed_regions.id)' })
  findAllPublic(
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
    @Query('region_id') regionId?: number,
  ) {
    return this.service.findAll(page, perPage, true, regionId);
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
  constructor(
    private readonly service: NewsService,
    private readonly telegramQr: TelegramNewsQrAuthService,
  ) {}

  @Get('telegram-parser/status')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: Telegram news parser — статус (без секретов)' })
  telegramParserStatus() {
    return this.service.getTelegramParserStatus();
  }

  @Get('telegram-channels')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: список каналов для импорта новостей из Telegram' })
  listTelegramChannels() {
    return this.service.listTelegramChannels();
  }

  @Post('telegram-channels')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: добавить канал' })
  createTelegramChannel(
    @Body()
    body: {
      regionId: number;
      channelRef: string;
      label?: string | null;
      isEnabled?: boolean;
      limitPerRun?: number;
      publishOnImport?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.service.createTelegramChannel(body);
  }

  @Put('telegram-channels/:channelId')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: обновить канал' })
  updateTelegramChannel(
    @Param('channelId', ParseIntPipe) channelId: number,
    @Body()
    body: {
      regionId?: number;
      channelRef?: string;
      label?: string | null;
      isEnabled?: boolean;
      limitPerRun?: number;
      publishOnImport?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.service.updateTelegramChannel(channelId, body);
  }

  @Delete('telegram-channels/:channelId')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: удалить канал' })
  deleteTelegramChannel(@Param('channelId', ParseIntPipe) channelId: number) {
    return this.service.deleteTelegramChannel(channelId);
  }

  @Post('sync-rss')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: import news from RSS/Atom (dedupe by sourceUrl)' })
  syncRss(@Body() body?: { url?: string | null }) {
    return this.service.syncFromRss(body?.url);
  }

  @Post('sync-telegram')
  @Roles('editor')
  @ApiOperation({
    summary: 'Admin: импорт из Telegram (MTProto)',
    description:
      'Каналы: из сохранённого списка (включённые), onlyChannelIds или channels[]. TG_API_ID/TG_API_HASH в .env; сессия: TG_SESSION_STRING в .env или после входа по QR (site_settings).',
  })
  syncTelegram(
    @Body()
    body?: {
      channels?: string[] | null;
      limitPerChannel?: number | null;
      onlyChannelIds?: number[] | null;
    },
  ) {
    return this.service.syncFromTelegramChannels({
      channels: body?.channels ?? null,
      limitPerChannel: body?.limitPerChannel ?? null,
      onlyChannelIds: body?.onlyChannelIds ?? null,
    });
  }

  @Post('backfill-telegram-photos')
  @Roles('editor')
  @ApiOperation({
    summary: 'Admin: дозагрузить фото для Telegram-новостей без imageUrl',
  })
  backfillTelegramPhotos(@Body() body?: { limit?: number | null }) {
    return this.service.backfillTelegramNewsPhotos(body?.limit ?? null);
  }

  @Post('telegram-qr/start')
  @Roles('editor')
  @ApiOperation({
    summary: 'Admin: MTProto — начать вход по QR',
    description:
      'Сканируйте QR в приложении Telegram. После успеха string session сохраняется в site_settings (tg_news_mtproto_session). Нужны TG_API_ID и TG_API_HASH в .env.',
  })
  telegramQrStart() {
    return this.telegramQr.startQrLogin();
  }

  @Get('telegram-qr/:flowId')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: MTProto — опрос статуса входа по QR (loginUrl, фаза, 2FA)' })
  telegramQrPoll(@Param('flowId') flowId: string) {
    return this.telegramQr.getQrLoginState(flowId);
  }

  @Post('telegram-qr/password')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: MTProto — отправить пароль 2FA во время входа по QR' })
  telegramQrPassword(@Body() body: { flowId: string; password: string }) {
    return this.telegramQr.submitQrPassword(body.flowId, body.password ?? '');
  }

  @Post('telegram-qr/cancel')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: MTProto — отменить текущий вход по QR' })
  telegramQrCancel(@Body() body: { flowId: string }) {
    return this.telegramQr.cancelQrLogin(body.flowId);
  }

  @Post('telegram-qr/reset')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: MTProto — принудительно сбросить активный QR-flow' })
  telegramQrReset() {
    return this.telegramQr.resetActiveFlow();
  }

  @Get()
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: list all news (including drafts)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'per_page', required: false })
  @ApiQuery({ name: 'region_id', required: false, description: 'ID города (feed_regions.id)' })
  findAll(
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
    @Query('region_id') regionId?: number,
  ) {
    return this.service.findAll(page, perPage, false, regionId);
  }

  @Post()
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: create news article' })
  create(
    @Body()
    dto: {
      title: string;
      slug: string;
      body?: string;
      imageUrl?: string;
      source?: string;
      sourceUrl?: string;
      isPublished?: boolean;
      regionId?: number | null;
      mediaFileIds?: number[] | null;
    },
  ) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: update news article' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      title?: string;
      slug?: string;
      body?: string;
      imageUrl?: string;
      source?: string;
      sourceUrl?: string;
      isPublished?: boolean;
      regionId?: number | null;
      mediaFileIds?: number[] | null;
    },
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: delete news article' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
