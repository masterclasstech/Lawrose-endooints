/* eslint-disable prettier/prettier */
import { Gender, Size } from "@prisma/client";


export class ProductResponseDto {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string;
    sku: string;
    barcode?: string;
    price: number;
    comparePrice?: number;
    currency: string;
    stockQuantity: number;
    lowStockThreshold: number;
    trackInventory: boolean;
    discountPercentage?: number;
    discountStartDate?: Date;
    discountEndDate?: Date;
    images: string[];
    featuredImage?: string;
    metaTitle?: string;
    metaDescription?: string;
    categoryId: string;
    subcategoryId?: string;
    collectionId?: string;
    gender: Gender;
    colors: string[];
    sizes: Size[];
    isActive: boolean;
    isFeatured: boolean;
    isDigital: boolean;
    weight?: number;
    dimensions?: object;
    tags: string[];
    materials: string[];
    careInstructions: string[];
    createdAt: Date;
    updatedAt: Date;
    
    // Relations
    category?: any;
    subcategory?: any;
    collection?: any;
    variants?: any[];
    
    // Computed fields
    finalPrice?: number;
    isOnSale?: boolean;
    isLowStock?: boolean;
    totalStock?: number;
}