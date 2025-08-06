/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaxCalculationDto {
    @ApiProperty({ example: 0.08 })
    taxRate: number;

    @ApiProperty({ example: 10.80 })
    taxAmount: number;

    @ApiProperty({ example: 135.00 })
    taxableAmount: number;
}

export class ShippingCalculationDto {
    @ApiProperty({ example: 9.99 })
    shippingCost: number;

    @ApiPropertyOptional({ example: 75.00 })
    freeShippingThreshold?: number;

    @ApiPropertyOptional({ example: 5 })
    estimatedDeliveryDays?: number;
}

export class DiscountCalculationDto {
    @ApiProperty({ example: 15.00 })
    discountAmount: number;

    @ApiProperty({ type: [String], example: ['60f1b2b3b3b3b3b3b3b3b3b3'] })
    applicableItems: string[];

    @ApiPropertyOptional({ example: 'SAVE10' })
    couponCode?: string;

    @ApiProperty({ example: 'PERCENTAGE' })
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
}

export class CartCalculationResponseDto {
    @ApiProperty({ example: 149.95 })
    subtotal: number;

    @ApiProperty({ type: DiscountCalculationDto })
    discount: DiscountCalculationDto;

    @ApiProperty({ type: TaxCalculationDto })
    tax: TaxCalculationDto;

    @ApiProperty({ type: ShippingCalculationDto })
    shipping: ShippingCalculationDto;

    @ApiProperty({ example: 155.74 })
    total: number;

    @ApiProperty({ example: 'USD' })
    currency: string;
}