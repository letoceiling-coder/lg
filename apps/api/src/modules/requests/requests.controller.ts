import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser, OptionalJwtUser, Public, Roles } from '../../auth/decorators';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestsService } from './requests.service';

export class UpdateRequestDto {
  @ApiProperty({ enum: RequestStatus })
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Assignee user id (UUID), or null to clear assignment',
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string | null;
}

@ApiTags('Requests')
@Controller('requests')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мои заявки (созданные с JWT при отправке формы)' })
  findMine(@CurrentUser('sub') userId: string) {
    return this.service.findByUserId(userId);
  }

  @Public()
  @OptionalJwtUser()
  @Post()
  @ApiOperation({
    summary: 'Submit a request (public form)',
    description:
      'Если передать Bearer access token, заявка привяжется к пользователю и попадёт в GET /requests/me.',
  })
  create(@Body() dto: CreateRequestDto, @CurrentUser('sub') userId?: string) {
    return this.service.create(dto, userId);
  }
}

@ApiTags('Admin / Requests')
@ApiBearerAuth()
@Controller('admin/requests')
export class RequestsAdminController {
  constructor(private readonly service: RequestsService) {}

  @Get()
  @Roles('manager')
  @ApiOperation({ summary: 'Admin: list requests (paginated)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, schema: { default: 1 } })
  @ApiQuery({ name: 'per_page', required: false, schema: { default: 20 } })
  findAll(
    @CurrentUser('sub') _operatorId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    return this.service.findAll(status, page, perPage);
  }

  @Get(':id')
  @Roles('manager')
  @ApiOperation({ summary: 'Admin: get request by id' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') operatorId: string,
  ) {
    void operatorId;
    return this.service.findOne(id);
  }

  @Put(':id')
  @Roles('manager')
  @ApiOperation({ summary: 'Admin: update request status / assignment' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequestDto,
    @CurrentUser('sub') operatorId: string,
  ) {
    void operatorId;
    return this.service.updateStatus(id, dto.status, dto.assignedTo);
  }
}
