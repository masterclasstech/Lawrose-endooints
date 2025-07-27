/* eslint-disable prettier/prettier */
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
    @ApiProperty({
        example: 'admin@shoppmooré.com',
        description: 'Admin email address'
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({
        example: 'SecureAdminPassword123!',
        description: 'Admin password'
    })
    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    password: string;

    @ApiProperty({
        example: 'shoppmooreapiadminkeys2',
        description: 'Admin secret key for login validation'
    })
    @IsString({ message: 'Admin secret key must be a string' })
    @IsNotEmpty({ message: 'Admin secret key is required' })
    adminSecretKey: string;
}