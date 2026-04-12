import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Показывать в гео-селекторе на сайте' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
