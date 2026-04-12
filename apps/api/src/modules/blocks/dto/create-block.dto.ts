import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateBlockDto {
  @ApiProperty()
  @IsInt()
  regionId: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  districtId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  builderId?: number;

  @ApiPropertyOptional({ enum: ['BUILDING', 'COMPLETED', 'PROJECT'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPromoted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dataSource?: string;
}
