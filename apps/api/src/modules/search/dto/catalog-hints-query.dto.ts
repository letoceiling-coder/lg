import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CatalogHintsQueryDto {
  @ApiProperty({ description: 'ID региона (feed_regions)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  region_id!: number;

  @ApiProperty({ description: 'Строка поиска (минимум 2 символа)' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  q!: string;

  @ApiPropertyOptional({ description: 'Макс. элементов в каждой категории', default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 15;
}
