import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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

export class ManualApartmentFieldsDto {
  @ApiProperty({ example: 54.2 })
  @IsNumber()
  @Min(0.01)
  areaTotal: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaKitchen?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  floorsTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  roomTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  finishingId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  planUrl?: string;

  @ApiPropertyOptional({ description: 'URL из медиатеки (/uploads/media/...)' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  finishingPhotoUrl?: string;

  @ApiPropertyOptional({ type: [String], description: 'Галерея: только URL из медиатеки' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  extraPhotoUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  buildingName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  number?: string;
}

export class CreateManualApartmentDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  regionId: number;

  @ApiPropertyOptional({ description: 'ID ЖК (должен быть в том же регионе)' })
  @IsOptional()
  @IsInt()
  blockId?: number;

  @ApiProperty({ example: 12_500_000 })
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

  @ApiProperty({ type: ManualApartmentFieldsDto })
  @ValidateNested()
  @Type(() => ManualApartmentFieldsDto)
  apartment: ManualApartmentFieldsDto;
}

export class ManualApartmentPatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  areaTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaKitchen?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  floorsTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  roomTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  finishingId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  planUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  finishingPhotoUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  extraPhotoUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  buildingName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  number?: string;
}

export class UpdateManualApartmentDto {
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

  @ApiPropertyOptional({ type: ManualApartmentPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualApartmentPatchDto)
  apartment?: ManualApartmentPatchDto;
}
