/* eslint-disable prettier/prettier */
import { Size } from "@prisma/client";


export class VariantResponseDto {
    id: string;
    productId: string;
    color?: string;
    size?: Size;
    sku: string;
    price?: number;
    comparePrice?: number;
    stockQuantity: number;
    images: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    
    // Computed fields
    finalPrice?: number;
    isOnSale?: boolean;
}