import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMediaFolderDto {
  @ApiPropertyOptional({ description: 'Родительская папка; без поля — корень' })
  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @ApiProperty({ example: 'Планировки' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
