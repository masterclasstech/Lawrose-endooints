/* eslint-disable prettier/prettier */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import {
    CacheOptions,
    CacheSetOptions,
    CachePattern,
    CacheStats,
    CacheKeyType,
    CacheKey,
    BulkCacheItem,
    CacheSearchResult,
} from '../../interfaces/cache.interface';

@Injectable()
export class CacheService implements OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);
    private readonly keyPrefix: string;
    private readonly ttlConfig: Record<CacheKeyType, number>;

    constructor(
        @InjectRedis() private readonly redis: Redis,
        private readonly configService: ConfigService,
    ) {
        // Get cache configuration from config service
        this.keyPrefix = this.configService.get<string>('redis.cache.keyPrefix', 'lawrose:');
        
        // Load TTL configuration for different cache types
        this.ttlConfig = {
        [CacheKeyType.SESSION]: this.configService.get<number>('redis.cache.ttl.session', 86400),
        [CacheKeyType.JWT_BLACKLIST]: this.configService.get<number>('redis.cache.ttl.jwtBlacklist', 86400),
        [CacheKeyType.USER_DATA]: this.configService.get<number>('redis.cache.ttl.userData', 1800),
        [CacheKeyType.PRODUCT_DATA]: this.configService.get<number>('redis.cache.ttl.productData', 3600),
        [CacheKeyType.CART_DATA]: this.configService.get<number>('redis.cache.ttl.cartData', 86400),
        [CacheKeyType.RATE_LIMIT]: this.configService.get<number>('redis.cache.ttl.rateLimit', 60),
        [CacheKeyType.OTP_CODES]: this.configService.get<number>('redis.cache.ttl.otpCodes', 300),
        [CacheKeyType.PASSWORD_RESET]: this.configService.get<number>('redis.cache.ttl.passwordReset', 3600),
        [CacheKeyType.EMAIL_VERIFICATION]: this.configService.get<number>('redis.cache.ttl.emailVerification', 86400),
        };
    }

    /**
     * Generate a standardized cache key
     */
    private generateKey(cacheKey: CacheKey | string): string {
        if (typeof cacheKey === 'string') {
        return `${this.keyPrefix}${cacheKey}`;
        }

        const { type, identifier, subKey } = cacheKey;
        const baseKey = `${this.keyPrefix}${type}:${identifier}`;
        return subKey ? `${baseKey}:${subKey}` : baseKey;
    }

    /**
     * Get TTL for a specific cache type (internal helper)
     */
    private resolveTTL(type?: CacheKeyType, customTTL?: number): number {
        if (customTTL) return customTTL;
        if (type && this.ttlConfig[type]) return this.ttlConfig[type];
        return this.configService.get<number>('redis.cache.defaultTTL', 3600);
    }

    /**
     * Set a value in cache
     */
    async set<T>(
        key: CacheKey | string,
        value: T,
        options?: CacheSetOptions,
    ): Promise<boolean> {
        try {
        const cacheKey = this.generateKey(key);
        const serializedValue = JSON.stringify(value);
        
        const ttl = typeof key === 'object' 
            ? this.resolveTTL(key.type, options?.ttl)
            : this.resolveTTL(undefined, options?.ttl);

        let result: string | null;

        if (options?.nx) {
            // Set only if key doesn't exist
            result = await this.redis.set(cacheKey, serializedValue, 'EX', ttl, 'NX');
        } else if (options?.xx) {
            // Set only if key exists
            result = await this.redis.set(cacheKey, serializedValue, 'EX', ttl, 'XX');
        } else {
            // Normal set
            result = await this.redis.setex(cacheKey, ttl, serializedValue);
        }

        const success = result === 'OK';
        if (success) {
            this.logger.debug(`Cache set: ${cacheKey} (TTL: ${ttl}s)`);
        }
        
        return success;
        } catch (error) {
        this.logger.error(`Failed to set cache key: ${error.message}`, error.stack);
        return false;
        }
    }

    /**
     * Get a value from cache
     */
    async get<T>(key: CacheKey | string): Promise<T | null> {
        try {
        const cacheKey = this.generateKey(key);
        const value = await this.redis.get(cacheKey);
        
        if (value === null) {
            this.logger.debug(`Cache miss: ${cacheKey}`);
            return null;
        }

        this.logger.debug(`Cache hit: ${cacheKey}`);
        return JSON.parse(value) as T;
        } catch (error) {
        this.logger.error(`Failed to get cache key: ${error.message}`, error.stack);
        return null;
        }
    }

    /**
     * Delete a key from cache
     */
    async del(key: CacheKey | string): Promise<boolean> {
        try {
        const cacheKey = this.generateKey(key);
        const result = await this.redis.del(cacheKey);
        
        const success = result > 0;
        if (success) {
            this.logger.debug(`Cache deleted: ${cacheKey}`);
        }
        
        return success;
        } catch (error) {
        this.logger.error(`Failed to delete cache key: ${error.message}`, error.stack);
        return false;
        }
    }

    /**
     * Check if a key exists in cache
     */
    async exists(key: CacheKey | string): Promise<boolean> {
        try {
        const cacheKey = this.generateKey(key);
        const result = await this.redis.exists(cacheKey);
        return result === 1;
        } catch (error) {
        this.logger.error(`Failed to check cache key existence: ${error.message}`, error.stack);
        return false;
        }
    }

    /**
     * Get TTL for a key
     */
    async getTTL(key: CacheKey | string): Promise<number> {
        try {
        const cacheKey = this.generateKey(key);
        return await this.redis.ttl(cacheKey);
        } catch (error) {
        this.logger.error(`Failed to get TTL: ${error.message}`, error.stack);
        return -1;
        }
    }

    /**
     * Extend TTL for a key
     */
    async expire(key: CacheKey | string, ttl: number): Promise<boolean> {
        try {
        const cacheKey = this.generateKey(key);
        const result = await this.redis.expire(cacheKey, ttl);
        return result === 1;
        } catch (error) {
        this.logger.error(`Failed to set expiration: ${error.message}`, error.stack);
        return false;
        }
    }

    /**
     * Increment a numeric value
     */
    async increment(key: CacheKey | string, amount: number = 1): Promise<number | null> {
        try {
        const cacheKey = this.generateKey(key);
        const result = await this.redis.incrby(cacheKey, amount);
        this.logger.debug(`Cache incremented: ${cacheKey} by ${amount} = ${result}`);
        return result;
        } catch (error) {
        this.logger.error(`Failed to increment cache key: ${error.message}`, error.stack);
        return null;
        }
    }

    /**
     * Decrement a numeric value
     */
    async decrement(key: CacheKey | string, amount: number = 1): Promise<number | null> {
        try {
        const cacheKey = this.generateKey(key);
        const result = await this.redis.decrby(cacheKey, amount);
        this.logger.debug(`Cache decremented: ${cacheKey} by ${amount} = ${result}`);
        return result;
        } catch (error) {
        this.logger.error(`Failed to decrement cache key: ${error.message}`, error.stack);
        return null;
        }
    }

    /**
     * Set multiple keys at once
     */
    async mset<T>(items: BulkCacheItem<T>[]): Promise<boolean> {
        try {
        const pipeline = this.redis.pipeline();
        
        for (const item of items) {
            const cacheKey = this.generateKey(item.key);
            const serializedValue = JSON.stringify(item.value);
            const ttl = item.ttl || this.configService.get<number>('redis.cache.defaultTTL', 3600);
            
            pipeline.setex(cacheKey, ttl, serializedValue);
        }
        
        const results = await pipeline.exec();
        const success = results?.every(([error, result]) => error === null && result === 'OK') ?? false;
        
        if (success) {
            this.logger.debug(`Bulk cache set: ${items.length} items`);
        }
        
        return success;
        } catch (error) {
        this.logger.error(`Failed to set multiple cache keys: ${error.message}`, error.stack);
        return false;
        }
    }

    /**
     * Get multiple keys at once
     */
    async mget<T>(keys: (CacheKey | string)[]): Promise<(T | null)[]> {
        try {
        const cacheKeys = keys.map(key => this.generateKey(key));
        const values = await this.redis.mget(...cacheKeys);
        
        return values.map(value => {
            if (value === null) return null;
            try {
            return JSON.parse(value) as T;
            } catch {
            return null;
            }
        });
        } catch (error) {
        this.logger.error(`Failed to get multiple cache keys: ${error.message}`, error.stack);
        return keys.map(() => null);
        }
    }

    /**
     * Delete multiple keys at once
     */
    async mdel(keys: (CacheKey | string)[]): Promise<number> {
        try {
        const cacheKeys = keys.map(key => this.generateKey(key));
        const result = await this.redis.del(...cacheKeys);
        
        if (result > 0) {
            this.logger.debug(`Bulk cache deleted: ${result} keys`);
        }
        
        return result;
        } catch (error) {
        this.logger.error(`Failed to delete multiple cache keys: ${error.message}`, error.stack);
        return 0;
        }
    }

    /**
     * Search for keys by pattern
     */
    async searchKeys(pattern: CachePattern): Promise<string[]> {
        try {
        const searchPattern = `${this.keyPrefix}${pattern.pattern}`;
        const keys: string[] = [];
        const stream = this.redis.scanStream({
            match: searchPattern,
            count: pattern.count || 100,
        });

        for await (const resultKeys of stream) {
            keys.push(...resultKeys);
        }

        return keys.map(key => key.replace(this.keyPrefix, ''));
        } catch (error) {
        this.logger.error(`Failed to search cache keys: ${error.message}`, error.stack);
        return [];
        }
    }

    /**
     * Get keys with their values and TTL
     */
    async searchKeysWithValues<T>(pattern: CachePattern): Promise<CacheSearchResult<T>[]> {
        try {
        const keys = await this.searchKeys(pattern);
        if (keys.length === 0) return [];

        const pipeline = this.redis.pipeline();
        const cacheKeys = keys.map(key => this.generateKey(key));
        
        // Get values and TTLs
        cacheKeys.forEach(cacheKey => {
            pipeline.get(cacheKey);
            pipeline.ttl(cacheKey);
        });

        const results = await pipeline.exec();
        if (!results) return [];

        const searchResults: CacheSearchResult<T>[] = [];
        
        for (let i = 0; i < keys.length; i++) {
            const valueResult = results[i * 2];
            const ttlResult = results[i * 2 + 1];
            
            if (valueResult && valueResult[1] !== null) {
            try {
                const value = JSON.parse(valueResult[1] as string) as T;
                const ttl = ttlResult ? (ttlResult[1] as number) : -1;
                
                searchResults.push({
                key: keys[i],
                value,
                ttl,
                });
            } catch {
                // Skip malformed JSON
            }
            }
        }

        return searchResults;
        } catch (error) {
        this.logger.error(`Failed to search cache keys with values: ${error.message}`, error.stack);
        return [];
        }
    }

    /**
     * Clear all keys matching a pattern
     */
    async clearPattern(pattern: string): Promise<number> {
        try {
        const keys = await this.searchKeys({ pattern });
        if (keys.length === 0) return 0;

        const result = await this.mdel(keys);
        this.logger.log(`Cleared ${result} cache keys matching pattern: ${pattern}`);
        return result;
        } catch (error) {
        this.logger.error(`Failed to clear cache pattern: ${error.message}`, error.stack);
        return 0;
        }
    }

    /**
     * Clear all cache for a specific type
     */
    async clearCacheType(type: CacheKeyType): Promise<number> {
        return this.clearPattern(`${type}:*`);
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<CacheStats> {
        try {
        const info = await this.redis.info('memory');
        const keyCount = await this.redis.dbsize();
        
        const memoryUsageMatch = info.match(/used_memory_human:(.+)/);
        const memoryUsage = memoryUsageMatch ? memoryUsageMatch[1].trim() : 'Unknown';

        return {
            totalKeys: keyCount,
            memoryUsage,
        };
        } catch (error) {
        this.logger.error(`Failed to get cache stats: ${error.message}`, error.stack);
        return {
            totalKeys: 0,
            memoryUsage: 'Unknown',
        };
        }
    }

    /**
     * Flush all cache data (use with caution)
     */
    async flushAll(): Promise<boolean> {
        try {
        await this.redis.flushdb();
        this.logger.warn('All cache data has been flushed');
        return true;
        } catch (error) {
        this.logger.error(`Failed to flush cache: ${error.message}`, error.stack);
        return false;
        }
    }

    /**
     * Health check for cache service
     */
    async healthCheck(): Promise<boolean> {
        try {
        const testKey = 'health_check';
        const testValue = Date.now().toString();
        
        await this.redis.setex(testKey, 5, testValue);
        const retrievedValue = await this.redis.get(testKey);
        await this.redis.del(testKey);
        
        return retrievedValue === testValue;
        } catch (error) {
        this.logger.error(`Cache health check failed: ${error.message}`, error.stack);
        return false;
        }
    }

    /**
     * Get or set pattern (cache-aside pattern)
     */
    async getOrSet<T>(
        key: CacheKey | string,
        factory: () => Promise<T>,
        options?: CacheOptions,
    ): Promise<T | null> {
        try {
        // Try to get from cache first
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // If not in cache, get from factory
        const value = await factory();
        if (value !== null && value !== undefined) {
            await this.set(key, value, options);
        }

        return value;
        } catch (error) {
        this.logger.error(`Failed to get or set cache: ${error.message}`, error.stack);
        return null;
        }
    }

    async onModuleDestroy() {
        this.logger.log('CacheService is being destroyed');
    }
}