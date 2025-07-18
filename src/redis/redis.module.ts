/* eslint-disable prettier/prettier */
import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule as NestRedisModule, InjectRedis } from '@nestjs-modules/ioredis';
import { Redis as RedisClient } from 'ioredis';

@Module({
  imports: [
    NestRedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisConnection');
        
        const redisUrl = configService.get<string>('REDIS_URL');
        
        if (!redisUrl) {
          logger.error('REDIS_URL environment variable is not set');
          throw new Error('REDIS_URL environment variable is required');
        }
        
        if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
          logger.error('Invalid Redis URL format');
          throw new Error('Invalid Redis URL format. URL must start with redis:// or rediss://');
        }
        
        logger.log('Attempting to connect to Redis Cloud...');
        
        // Parse the Redis URL to extract components
        const url = new URL(redisUrl);
        
        const redisConfig = {
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          password: url.password || undefined,
          username: url.username && url.username !== 'default' ? url.username : undefined,
          db: parseInt(url.pathname.slice(1)) || 0, // Extract database from URL path
          
          // Connection options optimized for Redis Cloud
          connectTimeout: 10000,
          commandTimeout: 5000,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          family: 4,
          enableAutoPipelining: true,
          
          // TLS support for rediss:// URLs
          ...(redisUrl.startsWith('rediss://') && {
            tls: {
              servername: url.hostname,
            }
          }),
          
          // Retry strategy
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            logger.log(`Redis retry attempt ${times}, delay: ${delay}ms`);
            return delay;
          },
        };
        
        // Log configuration without sensitive data
        logger.log(`Redis configuration: ${JSON.stringify({
          host: redisConfig.host,
          port: redisConfig.port,
          username: redisConfig.username,
          db: redisConfig.db,
          password: redisConfig.password ? '***' : undefined,
          tls: !!redisConfig.tls,
        })}`);
        
        // Return the configuration in the expected format for @nestjs-modules/ioredis
        return {
          type: 'single',
          options: redisConfig,
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [NestRedisModule],
})
export class RedisModule implements OnModuleInit {
  private readonly logger = new Logger(RedisModule.name);
  
  constructor(@InjectRedis() private readonly redis: RedisClient) {}
  
  async onModuleInit() {
    try {
      // Add comprehensive event listeners
      this.redis.on('connect', () => {
        this.logger.log('Redis connected successfully');
      });
      
      this.redis.on('ready', () => {
        this.logger.log('Redis ready to accept commands');
      });
      
      this.redis.on('error', (error: Error) => {
        this.logger.error(`Redis connection error: ${error.message}`);
      });
      
      this.redis.on('close', () => {
        this.logger.warn('Redis connection closed');
      });
      
      this.redis.on('reconnecting', (delay: number) => {
        this.logger.log(`Redis reconnecting in ${delay}ms...`);
      });
      
      this.redis.on('end', () => {
        this.logger.warn('Redis connection ended');
      });
      
      this.redis.on('wait', () => {
        this.logger.log('Redis waiting for connection...');
      });
      
      // Test Redis connection and get server info
      const pong = await this.redis.ping();
      this.logger.log(`Redis health check passed: ${pong}`);
      
      // Get Redis server info
      const info = await this.redis.info('server');
      const serverInfo = info
        .split('\r\n')
        .find(line => line.startsWith('redis_version:'))
        ?.split(':')[1];
      
      if (serverInfo) {
        this.logger.log(`Connected to Redis server version: ${serverInfo}`);
      }
      
      // Test basic operations
      await this.redis.set('connection_test', 'success', 'EX', 60);
      const testValue = await this.redis.get('connection_test');
      
      if (testValue === 'success') {
        this.logger.log('Redis read/write test passed');
        await this.redis.del('connection_test');
      } else {
        this.logger.warn('Redis read/write test failed');
      }
      
    } catch (error) {
      this.logger.error(`Redis initialization failed: ${error.message}`);
      throw error;
    }
  }
  
  // Helper method to get Redis client instance
  getRedisClient(): RedisClient {
    return this.redis;
  }
  
  // Helper method to check Redis health
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      return false;
    }
  }
}