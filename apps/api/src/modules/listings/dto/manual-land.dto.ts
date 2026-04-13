import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ManualLandFieldsDto {
  @ApiPropertyOptional({ example: 8.5, description: 'Площадь участка в сотках' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  areaSotki?: number;

  @ApiPropertyOptional({ example: 'ИЖС' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  landCategory?: string;

  @ApiPropertyOptional({ example: '50:26:0190104:123' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cadastralNumber?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasCommunications?: boolean;
}

export class CreateManualLandDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  regionId: number;

  @ApiPropertyOptional({ description: 'ID ЖК (должен быть в том же регионе)' })
  @IsOptional()
  @IsInt()
  blockId?: number;

  @ApiProperty({ example: 4_900_000 })
  @IsNumber()
  @Min(1)
  price: number;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'DRAFT', 'RESERVED', 'SOLD'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'DRAFT', 'RESERVED', 'SOLD'])
  status?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiProperty({ type: ManualLandFieldsDto })
  @ValidateNested()
  @Type(() => ManualLandFieldsDto)
  land: ManualLandFieldsDto;
}

export class ManualLandPatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  areaSotki?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  landCategory?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cadastralNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasCommunications?: boolean | null;
}

export class UpdateManualLandDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  blockId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  price?: number;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'DRAFT', 'RESERVED', 'SOLD'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'DRAFT', 'RESERVED', 'SOLD'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: ManualLandPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualLandPatchDto)
  land?: ManualLandPatchDto;
}
