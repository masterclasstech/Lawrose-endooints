/* eslint-disable prettier/prettier */
import { IsString, IsInt, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Size } from '@prisma/client';
import { Transform } from 'class-transformer';

export class AddToCartDto {
    @ApiProperty({
        description: 'Product ID',
        example: '60f1b2b3b3b3b3b3b3b3b3b3',
    })
    @IsString()
    productId: string;

    @ApiPropertyOptional({
        description: 'Product variant ID',
        example: '60f1b2b3b3b3b3b3b3b3b3b4',
    })
    @IsOptional()
    @IsString()
    variantId?: string;

    @ApiProperty({
        description: 'Quantity to add',
        minimum: 1,
        maximum: 99,
        example: 2,
    })
    @IsInt()
    @Min(1)
    @Max(99)
    @Transform(({ value }) => parseInt(value))
    quantity: number;

    @ApiPropertyOptional({
        description: 'Selected color',
        example: 'Red',
    })
    @IsOptional()
    @IsString()
    selectedColor?: string;

    @ApiPropertyOptional({
        description: 'Selected size',
        enum: Size,
        example: Size.M,
    })
    @IsOptional()
    @IsEnum(Size)
    selectedSize?: Size;
}