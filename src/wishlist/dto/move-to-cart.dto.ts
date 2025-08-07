/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Size } from '@prisma/client';

export class MoveToCartDto {
    @ApiProperty({
        description: 'Product ID to move to cart',
        example: '60f7b3b3b3b3b3b3b3b3b3b3'
    })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({
        description: 'Selected color for the product',
        example: 'Red',
        required: false
    })
    @IsString()
    @IsOptional()
    selectedColor?: string;

    @ApiProperty({
        description: 'Selected size for the product',
        enum: Size,
        example: Size.M,
        required: false
    })
    @IsEnum(Size)
    @IsOptional()
    selectedSize?: Size;

    @ApiProperty({
        description: 'Quantity to add to cart',
        example: 1,
        minimum: 1,
        default: 1
    })
    @IsInt()
    @Min(1)
    @IsOptional()
    quantity?: number = 1;
}