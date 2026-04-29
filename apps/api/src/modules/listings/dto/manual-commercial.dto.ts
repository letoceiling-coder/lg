import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { ManualSellerDto } from './manual-seller.dto';

const COMMERCIAL_TYPES = ['OFFICE', 'RETAIL', 'WAREHOUSE', 'RESTAURANT', 'OTHER'] as const;

export class ManualCommercialFieldsDto {
  @ApiPropertyOptional({ enum: COMMERCIAL_TYPES })
  @IsOptional()
  @IsIn(COMMERCIAL_TYPES)
  commercialType?: (typeof COMMERCIAL_TYPES)[number];

  @ApiPropertyOptional({ example: 64.3 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  area?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasSeparateEntrance?: boolean;
}

export class CreateManualCommercialDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  regionId: number;

  @ApiPropertyOptional({ description: 'ID ЖК (должен быть в том же регионе)' })
  @IsOptional()
  @IsInt()
  blockId?: number;

  @ApiProperty({ example: 7_800_000 })
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

  @ApiProperty({ type: ManualCommercialFieldsDto })
  @ValidateNested()
  @Type(() => ManualCommercialFieldsDto)
  commercial: ManualCommercialFieldsDto;
}

export class ManualCommercialPatchDto {
  @ApiPropertyOptional({ enum: COMMERCIAL_TYPES })
  @IsOptional()
  @IsIn(COMMERCIAL_TYPES)
  commercialType?: (typeof COMMERCIAL_TYPES)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  area?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  floor?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasSeparateEntrance?: boolean | null;
}

export class UpdateManualCommercialDto {
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

  @ApiPropertyOptional({ type: ManualCommercialPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualCommercialPatchDto)
  commercial?: ManualCommercialPatchDto;
}


