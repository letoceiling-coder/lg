import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LinkEmailDto,
  LoginDto,
  TokensDto,
  RefreshDto,
  TelegramWidgetConfigDto,
} from './dto';
import { Public, CurrentUser } from './decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('telegram-widget-config')
  @ApiOperation({ summary: 'Username бота для Telegram Login Widget (без секретов)' })
  @ApiResponse({ status: 200, type: TelegramWidgetConfigDto })
  async telegramWidgetConfig(): Promise<TelegramWidgetConfigDto> {
    return this.authService.getTelegramWidgetConfig();
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/password' })
  @ApiResponse({ status: 200, type: TokensDto })
  async login(@Body() dto: LoginDto): Promise<TokensDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login / регистрация через Telegram Login Widget' })
  @ApiResponse({ status: 200, type: TokensDto })
  async telegramLogin(@Body() body: Record<string, unknown>): Promise<TokensDto> {
    return this.authService.telegramLogin(body);
  }

  @Post('link-telegram')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Привязать Telegram к текущему пользователю (JSON с полями виджета: id, auth_date, hash, …)',
  })
  @ApiResponse({ status: 200, type: TokensDto })
  async linkTelegram(
    @CurrentUser('sub') userId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<TokensDto> {
    return this.authService.linkTelegram(userId, body);
  }

  @Post('link-email')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить email и пароль к аккаунту без email (например после входа через Telegram)' })
  @ApiResponse({ status: 200, type: TokensDto })
  async linkEmail(
    @CurrentUser('sub') userId: string,
    @Body() dto: LinkEmailDto,
  ): Promise<TokensDto> {
    return this.authService.linkEmail(userId, dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: TokensDto })
  async refresh(@Body() dto: RefreshDto): Promise<TokensDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (invalidate all sessions)' })
  async logout(@CurrentUser('sub') userId: string) {
    await this.authService.logout(userId);
    return { message: 'Logged out' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }
}
