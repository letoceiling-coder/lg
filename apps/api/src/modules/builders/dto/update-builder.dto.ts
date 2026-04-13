import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateBuilderDto {
  @ApiPropertyOptional({ example: 1, description: 'ID региона (feed_regions.id)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  regionId?: number;

  @ApiPropertyOptional({ example: 'ООО Новый застройщик' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;
}
