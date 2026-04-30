import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateFeedRegionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Базовый URL фида TrendAgent для региона' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Публичный URL витрины для региона (поддомен), иначе глобальный PUBLIC_SITE_URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  publicSiteUrl?: string | null;

  @ApiPropertyOptional({ description: 'Широта центра карты региона' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  mapCenterLat?: number | null;

  @ApiPropertyOptional({ description: 'Долгота центра карты региона' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  mapCenterLng?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
