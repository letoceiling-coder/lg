import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ManualSellerDto } from './manual-seller.dto';

export class ManualHouseFieldsDto {
  @ApiPropertyOptional({ enum: ['DETACHED', 'SEMI', 'TOWNHOUSE', 'DUPLEX'] })
  @IsOptional()
  @IsIn(['DETACHED', 'SEMI', 'TOWNHOUSE', 'DUPLEX'])
  houseType?: 'DETACHED' | 'SEMI' | 'TOWNHOUSE' | 'DUPLEX';

  @ApiPropertyOptional({ example: 140.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  areaTotal?: number;

  @ApiPropertyOptional({ example: 6.2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaLand?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  floorsCount?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasGarage?: boolean;

  @ApiPropertyOptional({ example: 2022 })
  @IsOptional()
  @IsInt()
  @Min(1800)
  yearBuilt?: number;

  @ApiPropertyOptional({ example: '/uploads/media/houses/main.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photoUrl?: string;

  @ApiPropertyOptional({ type: [String], description: 'Дополнительные фото из медиатеки' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  extraPhotoUrls?: string[];
}

export class CreateManualHouseDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  regionId: number;

  @ApiPropertyOptional({ description: 'ID ЖК (должен быть в том же регионе)' })
  @IsOptional()
  @IsInt()
  blockId?: number;

  @ApiProperty({ example: 18_000_000 })
  @IsNumber()
  @Min(1)
  price: number;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'DRAFT', 'RESERVED', 'SOLD', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'DRAFT', 'RESERVED', 'SOLD', 'INACTIVE'])
  status?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: ManualSellerDto, description: 'Необязательная информация о продавце объекта' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualSellerDto)
  seller?: ManualSellerDto | null;

  @ApiProperty({ type: ManualHouseFieldsDto })
  @ValidateNested()
  @Type(() => ManualHouseFieldsDto)
  house: ManualHouseFieldsDto;
}

export class ManualHousePatchDto {
  @ApiPropertyOptional({ enum: ['DETACHED', 'SEMI', 'TOWNHOUSE', 'DUPLEX'] })
  @IsOptional()
  @IsIn(['DETACHED', 'SEMI', 'TOWNHOUSE', 'DUPLEX'])
  houseType?: 'DETACHED' | 'SEMI' | 'TOWNHOUSE' | 'DUPLEX' | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  areaTotal?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaLand?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  floorsCount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasGarage?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1800)
  yearBuilt?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photoUrl?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  extraPhotoUrls?: string[] | null;
}

export class UpdateManualHouseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  blockId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  price?: number;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'DRAFT', 'RESERVED', 'SOLD', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'DRAFT', 'RESERVED', 'SOLD', 'INACTIVE'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: ManualSellerDto, description: 'Необязательная информация о продавце объекта' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualSellerDto)
  seller?: ManualSellerDto | null;

  @ApiPropertyOptional({ type: ManualHousePatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualHousePatchDto)
  house?: ManualHousePatchDto;
}


