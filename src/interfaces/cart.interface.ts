/* eslint-disable prettier/prettier */
import { Size } from '@prisma/client';

export interface CartItemInterface {
    id: string;
    productId: string;
    variantId?: string;
    quantity: number;
    selectedColor?: string;
    selectedSize?: Size;
    unitPrice: number;
    totalPrice: number;
    product: {
        id: string;
        name: string;
        slug: string;
        featuredImage?: string;
        isActive: boolean;
        stockQuantity: number;
        price: number;
        discountPercentage?: number;
    };
    variant?: {
        id: string;
        color?: string;
        size?: Size;
        price?: number;
        stockQuantity: number;
        isActive: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface CartSummaryInterface {
    itemCount: number;
    totalQuantity: number;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    shippingCost: number;
    totalAmount: number;
    currency: string;
}

export interface CartInterface {
    sessionId: string;           // Session identifier for cart
    userId?: string;            // Optional - only populated after user logs in
    items: CartItemInterface[];
    summary: CartSummaryInterface;
    lastModified: Date;
}