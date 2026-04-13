import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateBuildingDto {
  @ApiPropertyOptional({ example: 1, description: 'ID региона (feed_regions.id)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  regionId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID ЖК (blocks.id)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  blockId?: number;

  @ApiPropertyOptional({ example: 2, description: 'ID типа корпуса (building_types.id)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  buildingTypeId?: number | null;

  @ApiPropertyOptional({ example: 'Корпус 1' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string | null;

  @ApiPropertyOptional({ example: '1 очередь' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  queue?: string | null;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Срок сдачи (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  deadline?: string | null;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Ключ срока сдачи (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  deadlineKey?: string | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  subsidy?: boolean;

  @ApiPropertyOptional({ example: 55.7522 })
  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @ApiPropertyOptional({ example: 37.6156 })
  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @ApiPropertyOptional({ example: 'Ленина' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string | null;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  house?: string | null;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  housing?: string | null;
}
