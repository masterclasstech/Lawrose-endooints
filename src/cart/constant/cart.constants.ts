/* eslint-disable prettier/prettier */
export const CART_CONSTANTS = {
    CACHE_TTL: {
        CART_DATA: 86400, // 24 hours
        CALCULATION_CACHE: 300, // 5 minutes
        GUEST_CART: 604800, // 7 days
    },
    CACHE_KEYS: {
        USER_CART: 'cart:user',
        GUEST_CART: 'cart:guest',
        CART_CALCULATION: 'cart:calc',
        ABANDONED_CART: 'cart:abandoned',
    },
    LIMITS: {
        MAX_ITEMS: 50,
        MAX_QUANTITY_PER_ITEM: 99,
        MIN_QUANTITY: 1,
    },
    ABANDONMENT: {
        TRIGGER_DELAY: 1800, // 30 minutes
        MAX_REMINDERS: 3,
        REMINDER_INTERVALS: [3600, 86400, 259200], // 1h, 1d, 3d
    },
} as const;

export const CART_ERROR_MESSAGES = {
    CART_NOT_FOUND: 'Cart not found',
    ITEM_NOT_FOUND: 'Item not found in cart',
    PRODUCT_NOT_FOUND: 'Product not found',
    VARIANT_NOT_FOUND: 'Product variant not found',
    INSUFFICIENT_STOCK: 'Insufficient stock available',
    INVALID_QUANTITY: 'Invalid quantity specified',
    CART_LIMIT_EXCEEDED: 'Cart item limit exceeded',
    QUANTITY_LIMIT_EXCEEDED: 'Quantity limit exceeded for this item',
    PRODUCT_INACTIVE: 'Product is no longer available',
    VARIANT_INACTIVE: 'Product variant is no longer available',
} as const;