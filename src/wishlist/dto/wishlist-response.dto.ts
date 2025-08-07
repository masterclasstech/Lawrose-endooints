/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';

export class WishlistItemResponseDto {
    @ApiProperty({ example: '60f7b3b3b3b3b3b3b3b3b3b3' })
    id: string;

    @ApiProperty({ example: '60f7b3b3b3b3b3b3b3b3b3b3' })
    userId: string;

    @ApiProperty({ example: '60f7b3b3b3b3b3b3b3b3b3b3' })
    productId: string;

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({
        type: 'object',
        properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        price: { type: 'number' },
        comparePrice: { type: 'number', nullable: true },
        discountPercentage: { type: 'number', nullable: true },
        featuredImage: { type: 'string', nullable: true },
        stockQuantity: { type: 'number' },
        isActive: { type: 'boolean' },
        colors: { type: 'array', items: { type: 'string' } },
        sizes: { type: 'array', items: { type: 'string' } }
        }
    })
    product: {
        id: string;
        name: string;
        slug: string;
        price: number;
        comparePrice?: number;
        discountPercentage?: number;
        featuredImage?: string;
        stockQuantity: number;
        isActive: boolean;
        colors: string[];
        sizes: string[];
    };
}

export class WishlistResponseDto {
    @ApiProperty({
        type: [WishlistItemResponseDto],
        description: 'Array of wishlist items'
    })
    items: WishlistItemResponseDto[];

    @ApiProperty({
        example: 5,
        description: 'Total number of items in wishlist'
    })
    totalItems: number;

    @ApiProperty({
        example: 299.97,
        description: 'Total value of all items in wishlist'
    })
    totalValue: number;
}