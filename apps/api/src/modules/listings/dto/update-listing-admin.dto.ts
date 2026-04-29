import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateListingAdminDto {
  @ApiPropertyOptional({
    enum: ['DRAFT', 'ACTIVE', 'SOLD', 'RESERVED', 'INACTIVE'],
    description: 'Новый статус объявления',
  })
  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'SOLD', 'RESERVED', 'INACTIVE'])
  status?: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'RESERVED' | 'INACTIVE';

  @ApiPropertyOptional({ description: 'Публикация на сайте' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
