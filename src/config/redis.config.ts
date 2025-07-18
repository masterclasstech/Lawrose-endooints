/* eslint-disable prettier/prettier */
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL is required in environment variables');
  }
  
  if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    throw new Error('Invalid Redis URL format. URL must start with redis:// or rediss://');
  }
  
  return {
    // Primary Redis connection (from cloud URL)
    url: redisUrl,
    
    // Connection options optimized for Redis Cloud
    connectionOptions: {
      // Connection timeout in milliseconds
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
      
      // Command timeout in milliseconds
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT, 10) || 5000,
      
      // Retry strategy
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY_ON_FAILOVER, 10) || 100,
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES_PER_REQUEST, 10) || 3,
      
      // Keep alive for cloud connections
      keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE, 10) || 30000,
      
      // Lazy connection for better performance
      lazyConnect: process.env.REDIS_LAZY_CONNECT !== 'false',
      
      // Family (4 for IPv4, 6 for IPv6)
      family: parseInt(process.env.REDIS_FAMILY, 10) || 4,
      
      // Enable automatic reconnection
      enableAutoPipelining: process.env.REDIS_AUTO_PIPELINING !== 'false',
      
      // TLS support for rediss:// URLs
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    },
    
    // Cache configuration
    cache: {
      // Default TTL in seconds
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL, 10) || 3600, // 1 hour
      
      // Cache key prefixes
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'lawrose:',
      
      // Different cache types with their TTLs
      ttl: {
        // User sessions
        session: parseInt(process.env.REDIS_SESSION_TTL, 10) || 86400, // 24 hours
        
        // JWT blacklist
        jwtBlacklist: parseInt(process.env.REDIS_JWT_BLACKLIST_TTL, 10) || 86400, // 24 hours
        
        // User data cache
        userData: parseInt(process.env.REDIS_USER_DATA_TTL, 10) || 1800, // 30 minutes
        
        // Product data cache
        productData: parseInt(process.env.REDIS_PRODUCT_DATA_TTL, 10) || 3600, // 1 hour
        
        // Cart data cache
        cartData: parseInt(process.env.REDIS_CART_DATA_TTL, 10) || 86400, // 24 hours
        
        // Rate limiting
        rateLimit: parseInt(process.env.REDIS_RATE_LIMIT_TTL, 10) || 60, // 1 minute
        
        // OTP codes
        otpCodes: parseInt(process.env.REDIS_OTP_TTL, 10) || 300, // 5 minutes
        
        // Password reset tokens
        passwordReset: parseInt(process.env.REDIS_PASSWORD_RESET_TTL, 10) || 3600, // 1 hour
        
        // Email verification codes
        emailVerification: parseInt(process.env.REDIS_EMAIL_VERIFICATION_TTL, 10) || 86400, // 24 hours
      },
    },
    
    // Queue configuration (for Bull)
    queue: {
      // Default job options
      defaultJobOptions: {
        removeOnComplete: parseInt(process.env.REDIS_QUEUE_REMOVE_ON_COMPLETE, 10) || 10,
        removeOnFail: parseInt(process.env.REDIS_QUEUE_REMOVE_ON_FAIL, 10) || 50,
        attempts: parseInt(process.env.REDIS_QUEUE_ATTEMPTS, 10) || 3,
        backoff: {
          type: process.env.REDIS_QUEUE_BACKOFF_TYPE || 'exponential',
          delay: parseInt(process.env.REDIS_QUEUE_BACKOFF_DELAY, 10) || 2000,
        },
      },
      
      // Queue names
      names: {
        email: process.env.REDIS_EMAIL_QUEUE || 'email-queue',
        notifications: process.env.REDIS_NOTIFICATIONS_QUEUE || 'notifications-queue',
        orderProcessing: process.env.REDIS_ORDER_PROCESSING_QUEUE || 'order-processing-queue',
        payments: process.env.REDIS_PAYMENTS_QUEUE || 'payments-queue',
      },
    },
    
    // Health check configuration
    healthCheck: {
      // Health check interval in milliseconds
      interval: parseInt(process.env.REDIS_HEALTH_CHECK_INTERVAL, 10) || 30000, // 30 seconds
      
      // Health check timeout in milliseconds
      timeout: parseInt(process.env.REDIS_HEALTH_CHECK_TIMEOUT, 10) || 5000, // 5 seconds
      
      // Enable health check
      enabled: process.env.REDIS_HEALTH_CHECK_ENABLED !== 'false',
    },
    
    // Logging configuration
    logging: {
      // Enable Redis operation logging
      enabled: process.env.REDIS_LOGGING_ENABLED === 'true' || process.env.NODE_ENV === 'development',
      
      // Log level
      level: process.env.REDIS_LOG_LEVEL || 'info',
    },
  };
});