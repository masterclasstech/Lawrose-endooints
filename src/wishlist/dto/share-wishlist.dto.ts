/* eslint-disable prettier/prettier */
import { IsEmail, IsArray, ArrayMinSize, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShareWishlistDto {
    @ApiProperty({
        description: 'Array of email addresses to share wishlist with',
        example: ['friend@example.com', 'family@example.com']
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsEmail({}, { each: true })
    emails: string[];

    @ApiProperty({
        description: 'Optional message to include with the shared wishlist',
        example: 'Check out my wishlist!',
        required: false
    })
    @IsString()
    @IsOptional()
    message?: string;
}