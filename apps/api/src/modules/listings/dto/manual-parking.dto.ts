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

const PARKING_TYPES = ['UNDERGROUND', 'GROUND', 'MULTILEVEL'] as const;

export class ManualParkingFieldsDto {
  @ApiPropertyOptional({ enum: PARKING_TYPES })
  @IsOptional()
  @IsIn(PARKING_TYPES)
  parkingType?: (typeof PARKING_TYPES)[number];

  @ApiPropertyOptional({ example: 16.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  area?: number;

  @ApiPropertyOptional({ example: -1 })
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiPropertyOptional({ example: 'A-114' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  number?: string;
}

export class CreateManualParkingDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  regionId: number;

  @ApiPropertyOptional({ description: 'ID ЖК (должен быть в том же регионе)' })
  @IsOptional()
  @IsInt()
  blockId?: number;

  @ApiProperty({ example: 2_400_000 })
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

  @ApiProperty({ type: ManualParkingFieldsDto })
  @ValidateNested()
  @Type(() => ManualParkingFieldsDto)
  parking: ManualParkingFieldsDto;
}

export class ManualParkingPatchDto {
  @ApiPropertyOptional({ enum: PARKING_TYPES })
  @IsOptional()
  @IsIn(PARKING_TYPES)
  parkingType?: (typeof PARKING_TYPES)[number] | null;

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
  @IsString()
  @MaxLength(64)
  number?: string | null;
}

export class UpdateManualParkingDto {
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

  @ApiPropertyOptional({ type: ManualParkingPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualParkingPatchDto)
  parking?: ManualParkingPatchDto;
}
