import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiProperty() @IsString() fullName: string;
  @ApiPropertyOptional({ enum: ['admin', 'editor', 'manager', 'agent', 'client'] })
  @IsOptional() @IsString() role?: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional({ enum: ['admin', 'editor', 'manager', 'agent', 'client'] })
  @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional() @IsOptional() isActive?: boolean;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString() @MinLength(6) password: string;
}
