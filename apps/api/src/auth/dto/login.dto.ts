import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ required: false, example: 'admin@livegrid.ru' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, example: '+79001234567' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ example: 'admin123!' })
  @IsString()
  @MinLength(6)
  password: string;
}
