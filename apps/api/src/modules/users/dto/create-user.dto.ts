import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional, IsEmail, MinLength, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiProperty() @IsString() fullName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() telegramUsername?: string;
  @ApiPropertyOptional({ description: 'Telegram numeric user id as string' })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+$/)
  telegramId?: string;
  @ApiPropertyOptional({ enum: ['admin', 'editor', 'manager', 'agent', 'client'] })
  @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty() @IsString() @MinLength(6) password: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() telegramUsername?: string;
  @ApiPropertyOptional({ description: 'Telegram numeric user id as string' })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+$/)
  telegramId?: string;
  @ApiPropertyOptional({ enum: ['admin', 'editor', 'manager', 'agent', 'client'] })
  @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString() @MinLength(6) password: string;
}
