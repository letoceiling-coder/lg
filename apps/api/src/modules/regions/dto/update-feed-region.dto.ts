import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
