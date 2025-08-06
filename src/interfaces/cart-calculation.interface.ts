/* eslint-disable prettier/prettier */
export interface TaxCalculationInterface {
    taxRate: number;
    taxAmount: number;
    taxableAmount: number;
}

export interface ShippingCalculationInterface {
    shippingCost: number;
    freeShippingThreshold?: number;
    estimatedDeliveryDays?: number;
}

export interface DiscountCalculationInterface {
    discountAmount: number;
    applicableItems: string[];
    couponCode?: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
}

export interface CartCalculationInterface {
    subtotal: number;
    discount: DiscountCalculationInterface;
    tax: TaxCalculationInterface;
    shipping: ShippingCalculationInterface;
    total: number;
    currency: string;
}