/* eslint-disable prettier/prettier */
export interface CacheOptions {
    ttl?: number;
    keyPrefix?: string;
}

export interface CacheSetOptions extends CacheOptions {
  nx?: boolean; // Set only if key doesn't exist
  xx?: boolean; // Set only if key exists
}

export interface CachePattern {
    pattern: string;
    count?: number;
}

export interface CacheStats {
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
}

export enum CacheKeyType {
    SESSION = 'session',
    JWT_BLACKLIST = 'jwt_blacklist',
    USER_DATA = 'user_data',
    PRODUCT_DATA = 'product_data',
    CART_DATA = 'cart_data',
    RATE_LIMIT = 'rate_limit',
    OTP_CODES = 'otp_codes',
    PASSWORD_RESET = 'password_reset',
    EMAIL_VERIFICATION = 'email_verification',
}

export interface CacheKey {
    type: CacheKeyType;
    identifier: string;
    subKey?: string;
}

export interface BulkCacheItem<T = any> {
    key: string;
    value: T;
    ttl?: number;
}

export interface CacheSearchResult<T = any> {
    key: string;
    value: T;
    ttl: number;
}