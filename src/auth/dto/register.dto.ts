/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  MinLength, 
  Matches, 
  IsOptional,
  IsPhoneNumber 
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  fullName: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain uppercase, lowercase, number and special character' }
  )
  password: string;

  @ApiProperty({ example: '+2348123456789', required: false })
  @IsOptional()
  @IsPhoneNumber('NG')
  phoneNumber?: string;
}