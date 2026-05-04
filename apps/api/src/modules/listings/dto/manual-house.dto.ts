import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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

  @ApiPropertyOptional({ example: 'Блок' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  material?: string;

  @ApiPropertyOptional({ example: 140.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  areaTotal?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaLiving?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaKitchen?: number;

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

  @ApiPropertyOptional({ example: 'Белгородский' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  districtName?: string;

  @ApiPropertyOptional({ example: 'пос. Майский' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  settlement?: string;

  @ApiPropertyOptional({ example: 'Поэтическая' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  houseNumber?: string;

  @ApiPropertyOptional({ description: 'Синонимы населённых пунктов для поиска' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  synonyms?: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  distanceToCity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  directionSouth?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  directionNorth?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  directionEast?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  directionWest?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  inBelgorodDistrict?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  inBelgorodRegion?: boolean;

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
  @ArrayMaxSize(24)
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

  @ApiPropertyOptional({ description: 'Адрес объекта для карточки/карты' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  address?: string;

  @ApiPropertyOptional({ description: 'Описание / информация об объекте' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isHot?: boolean;

  @ApiPropertyOptional({ description: 'Широта для отображения на карте' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ description: 'Долгота для отображения на карте' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

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
  @IsString()
  @MaxLength(64)
  material?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  areaTotal?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaLiving?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaKitchen?: number | null;

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
  @IsString()
  @MaxLength(128)
  districtName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  settlement?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  houseNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  synonyms?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  distanceToCity?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  directionSouth?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  directionNorth?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  directionEast?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  directionWest?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inBelgorodDistrict?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inBelgorodRegion?: boolean | null;

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
  @ArrayMaxSize(24)
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

  @ApiPropertyOptional({ description: 'Адрес объекта для карточки/карты' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  address?: string | null;

  @ApiPropertyOptional({ description: 'Описание / информация об объекте' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string | null;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'DRAFT', 'RESERVED', 'SOLD', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'DRAFT', 'RESERVED', 'SOLD', 'INACTIVE'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isHot?: boolean;

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


