import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: list users' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('per_page', new DefaultValuePipe(20), ParseIntPipe) perPage: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(role, search, page, perPage);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: get user by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: create user' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: update user' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/reset-password')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: reset user password' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, dto.password);
  }

  @Post(':id/telegram-link')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: create Telegram link URL for user' })
  createTelegramLink(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.createTelegramLink(id);
  }

  @Post(':id/telegram-unlink')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: unlink Telegram from user' })
  unlinkTelegram(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.unlinkTelegram(id);
  }

  @Post(':id/telegram-bind-widget')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: bind Telegram from Telegram Login Widget payload' })
  bindTelegramWidget(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.bindTelegramFromWidget(id, body);
  }
}
