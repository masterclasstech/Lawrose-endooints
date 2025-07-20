/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'verification-token-here' })
  @IsString()
  @IsNotEmpty()
  token: string;
}