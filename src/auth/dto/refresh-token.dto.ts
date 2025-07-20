/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh-token-here' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}