import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertReferenceItemDto {
  @ApiProperty({ example: 'Стандарт' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'studio', description: 'Внешний ID из фида (опционально)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalId?: string | null;

  @ApiPropertyOptional({ example: '123', description: 'CRM ID (опционально, bigint)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  crmId?: string | null;

  @ApiPropertyOptional({ example: 'студия', description: 'Доп. поле только для room_types' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameOne?: string | null;
}
