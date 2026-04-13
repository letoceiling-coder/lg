import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateBuilderDto {
  @ApiProperty({ example: 1, description: 'ID региона (feed_regions.id)' })
  @IsInt()
  @Min(1)
  regionId!: number;

  @ApiProperty({ example: 'ООО Ромашка Девелопмент' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}
