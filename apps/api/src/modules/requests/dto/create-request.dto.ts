import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsEmail } from 'class-validator';

export class CreateRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional({ enum: ['CONSULTATION', 'MORTGAGE', 'CALLBACK', 'SELECTION', 'CONTACT'] })
  @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() blockId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() listingId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}
