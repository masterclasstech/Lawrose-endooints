/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveFromWishlistDto {
    @ApiProperty({
        description: 'Product ID to remove from wishlist',
        example: '60f7b3b3b3b3b3b3b3b3b3b3'
    })
    @IsString()
    @IsNotEmpty()
    productId: string;
}