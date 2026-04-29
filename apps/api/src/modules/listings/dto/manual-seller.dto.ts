import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ManualSellerDto {
  @ApiPropertyOptional({ description: 'ID существующего продавца' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sellerId?: number | null;

  @ApiPropertyOptional({ example: 'Иванов Иван Иванович' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string | null;

  @ApiPropertyOptional({ example: '+7 999 123-45-67' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string | null;

  @ApiPropertyOptional({ example: '+7 999 765-43-21' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phoneAlt?: string | null;

  @ApiPropertyOptional({ example: 'seller@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ description: 'Адрес проживания / регистрации продавца' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  address?: string | null;

  @ApiPropertyOptional({ description: 'Дополнительная информация по продавцу' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}
