/* eslint-disable prettier/prettier */
import { IsString, IsEmail, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { AuthProvider, Gender } from '@prisma/client';

export class GoogleAuthDto {
  @IsString()
  googleId: string;

  @IsEmail()
  email: string;

  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  // This will always be GOOGLE for this DTO
  provider: AuthProvider = AuthProvider.GOOGLE;

  // Optional fields that might come from Google profile
  @IsOptional()
  @IsString()
  givenName?: string;

  @IsOptional()
  @IsString()
  familyName?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  picture?: string; // Google profile picture URL
}