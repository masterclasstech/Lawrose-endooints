/* eslint-disable prettier/prettier */
import {
  IsArray,
    IsNotEmpty,
    IsString,
    IsNumber,
    IsOptional,
    IsBoolean,
    ValidateNested,
    Min,
    IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductStockUpdateDto {
    @ApiProperty({
        description: 'Product ID',
        example: '507f1f77bcf86cd799439011',
    })
    @IsNotEmpty()
    @IsString()
    @IsMongoId()
    productId: string;

    @ApiPropertyOptional({
        description: 'Product variant ID (if updating variant stock)',
        example: '507f1f77bcf86cd799439012',
    })
    @IsOptional()
    @IsString()
    @IsMongoId()
    variantId?: string;

    @ApiProperty({
        description: 'New stock quantity',
        example: 100,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    stockQuantity: number;

    @ApiPropertyOptional({
        description: 'Low stock threshold',
        example: 10,
        minimum: 0,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    lowStockThreshold?: number;

    @ApiPropertyOptional({
        description: 'Whether to track inventory for this item',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    trackInventory?: boolean;

    @ApiPropertyOptional({
        description: 'Whether the product/variant is active',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
    }

    export class BulkUpdateStockDto {
    @ApiProperty({
        description: 'Array of product stock updates',
        type: [ProductStockUpdateDto],
    })
    @IsArray()
    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => ProductStockUpdateDto)
    updates: ProductStockUpdateDto[];

    @ApiPropertyOptional({
        description: 'Operation type - whether to set absolute values or add/subtract from current stock',
        enum: ['SET', 'ADD', 'SUBTRACT'],
        example: 'SET',
        default: 'SET',
    })
    @IsOptional()
    @IsString()
    operation?: 'SET' | 'ADD' | 'SUBTRACT' = 'SET';

    @ApiPropertyOptional({
        description: 'Reason for the stock update (for audit purposes)',
        example: 'Monthly inventory count',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    reason?: string;

    @ApiPropertyOptional({
        description: 'Whether to update low stock thresholds globally',
        example: false,
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    updateThresholds?: boolean = false;

    @ApiPropertyOptional({
        description: 'Whether to automatically activate/deactivate products based on stock',
        example: true,
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    autoToggleActive?: boolean = true;
}