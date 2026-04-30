import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeedRegionDto {
  @ApiProperty({ example: 'belgorod', description: 'Уникальный код латиницей (нижний регистр), не из фида' })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9][a-z0-9_-]*$/, {
    message: 'Код: латиница в нижнем регистре, цифры, дефис, подчёркивание; с буквы или цифры',
  })
  code!: string;

  @ApiProperty({ example: 'Белгород' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ description: 'URL фида TrendAgent; для ручного региона можно оставить пустым' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string | null;

  @ApiPropertyOptional({ description: 'Публичный URL витрины (мультирегион)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  publicSiteUrl?: string | null;

  @ApiPropertyOptional({ description: 'Широта центра карты региона', example: 50.595414 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  mapCenterLat?: number | null;

  @ApiPropertyOptional({ description: 'Долгота центра карты региона', example: 36.587277 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  mapCenterLng?: number | null;

  @ApiPropertyOptional({ description: 'Показывать в гео-селекторе на сайте' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
