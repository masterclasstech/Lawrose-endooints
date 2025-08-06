/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Size } from '@prisma/client';

export class ProductInfoDto {
    @ApiProperty({ example: '60f1b2b3b3b3b3b3b3b3b3b3' })
    id: string;

    @ApiProperty({ example: 'Premium Cotton T-Shirt' })
    name: string;

    @ApiProperty({ example: 'premium-cotton-t-shirt' })
    slug: string;

    @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
    featuredImage?: string;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ example: 100 })
    stockQuantity: number;

    @ApiProperty({ example: 29.99 })
    price: number;

    @ApiPropertyOptional({ example: 10 })
    discountPercentage?: number;
}

export class VariantInfoDto {
    @ApiProperty({ example: '60f1b2b3b3b3b3b3b3b3b3b4' })
    id: string;

    @ApiPropertyOptional({ example: 'Red' })
    color?: string;

    @ApiPropertyOptional({ enum: Size, example: Size.M })
    size?: Size;

    @ApiPropertyOptional({ example: 32.99 })
    price?: number;

    @ApiProperty({ example: 50 })
    stockQuantity: number;

    @ApiProperty({ example: true })
    isActive: boolean;
}

export class CartItemDto {
    @ApiProperty({ example: '60f1b2b3b3b3b3b3b3b3b3b5' })
    id: string;

    @ApiProperty({ example: '60f1b2b3b3b3b3b3b3b3b3b3' })
    productId: string;

    @ApiPropertyOptional({ example: '60f1b2b3b3b3b3b3b3b3b3b4' })
    variantId?: string;

    @ApiProperty({ example: 2 })
    quantity: number;

    @ApiPropertyOptional({ example: 'Red' })
    selectedColor?: string;

    @ApiPropertyOptional({ enum: Size, example: Size.M })
    selectedSize?: Size;

    @ApiProperty({ example: 29.99 })
    unitPrice: number;

    @ApiProperty({ example: 59.98 })
    totalPrice: number;

    @ApiProperty({ type: ProductInfoDto })
    product: ProductInfoDto;

    @ApiPropertyOptional({ type: VariantInfoDto })
    variant?: VariantInfoDto;

    @ApiProperty({ example: '2023-10-01T10:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ example: '2023-10-01T10:30:00.000Z' })
    updatedAt: Date;
}

export class CartSummaryDto {
    @ApiProperty({ example: 3 })
    itemCount: number;

    @ApiProperty({ example: 5 })
    totalQuantity: number;

    @ApiProperty({ example: 149.95 })
    subtotal: number;

    @ApiProperty({ example: 15.00 })
    discountAmount: number;

    @ApiProperty({ example: 10.80 })
    taxAmount: number;

    @ApiProperty({ example: 9.99 })
    shippingCost: number;

    @ApiProperty({ example: 155.74 })
    totalAmount: number;

    @ApiProperty({ example: 'USD' })
    currency: string;
}

export class CartResponseDto {
    @ApiPropertyOptional({ example: '60f1b2b3b3b3b3b3b3b3b3b1' })
    userId?: string;

    @ApiPropertyOptional({ example: 'guest_60f1b2b3b3b3b3b3b3b3b3b2' })
    guestId?: string;

    @ApiProperty({ type: [CartItemDto] })
    items: CartItemDto[];

    @ApiProperty({ type: CartSummaryDto })
    summary: CartSummaryDto;

    @ApiProperty({ example: '2023-10-01T10:30:00.000Z' })
    lastModified: Date;
}