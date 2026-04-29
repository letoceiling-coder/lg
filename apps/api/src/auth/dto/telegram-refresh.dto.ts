import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class TelegramRefreshDto {
  @ApiProperty({ example: 123456789 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  telegramId: number;
}
