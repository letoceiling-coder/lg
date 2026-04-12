import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

/** `folderId = -1` — корень (без папки). */
export class MoveMediaFileDto {
  @ApiProperty({ description: 'ID папки назначения; -1 — корень' })
  @Type(() => Number)
  @IsInt()
  folderId: number;
}
