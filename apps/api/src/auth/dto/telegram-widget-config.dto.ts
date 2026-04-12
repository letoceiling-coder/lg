import { ApiProperty } from '@nestjs/swagger';

export class TelegramWidgetConfigDto {
  @ApiProperty({ nullable: true, description: 'Username бота без @ (из админки); если null — виджет недоступен' })
  botUsername!: string | null;
}
