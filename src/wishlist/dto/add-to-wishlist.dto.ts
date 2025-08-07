/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToWishlistDto {
    @ApiProperty({
        description: 'Product ID to add to wishlist',
        example: '60f7b3b3b3b3b3b3b3b3b3b3'
    })
    @IsString()
    @IsNotEmpty()
    productId: string;
}