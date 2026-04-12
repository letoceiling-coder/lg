import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@livegrid.ru' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123!' })
  @IsString()
  @MinLength(6)
  password: string;
}
