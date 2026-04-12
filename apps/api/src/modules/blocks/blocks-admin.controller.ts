import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { QueryBlocksDto } from './dto/query-blocks.dto';

@ApiTags('Admin / Blocks')
@ApiBearerAuth()
@Controller('admin/blocks')
export class BlocksAdminController {
  constructor(private readonly service: BlocksService) {}

  @Get()
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: list all blocks' })
  findAll(@Query() query: QueryBlocksDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: get block by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: create block' })
  create(@Body() dto: CreateBlockDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('editor')
  @ApiOperation({ summary: 'Admin: update block' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateBlockDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: delete block' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
