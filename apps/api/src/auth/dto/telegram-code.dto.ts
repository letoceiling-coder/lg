import { ApiProperty } from '@nestjs/swagger';

export class TelegramCodeResponseDto {
  @ApiProperty({ example: '123456' })
  code: string;

  @ApiProperty({ example: '2026-04-24T23:05:00.000Z' })
  expiresAt: string;
}
