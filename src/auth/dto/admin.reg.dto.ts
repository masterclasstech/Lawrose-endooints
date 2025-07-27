/* eslint-disable prettier/prettier */
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminRegisterDto {
    @ApiProperty({
        example: 'admin@shoppmooré.com',
        description: 'Admin email address'
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({
        example: 'SecureAdminPassword123!',
        description: 'Admin password (minimum 8 characters)'
    })
    @IsString({ message: 'Password must be a string' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @IsNotEmpty({ message: 'Password is required' })
    password: string;

    @ApiProperty({
        example: 'John Admin',
        description: 'Full name of the admin'
    })
    @IsString({ message: 'Full name must be a string' })
    @IsNotEmpty({ message: 'Full name is required' })
    fullName: string;

    @ApiProperty({
        example: '+1234567890',
        description: 'Phone number (optional)',
        required: false
    })
        @IsString({ message: 'Phone number must be a string' })
        phoneNumber?: string;

    @ApiProperty({
        example: 'shoppmooreapiadminkeys2',
        description: 'Admin creation secret key'
    })
    @IsString({ message: 'Admin secret key must be a string' })
    @IsNotEmpty({ message: 'Admin secret key is required' })
    adminSecretKey: string;
}