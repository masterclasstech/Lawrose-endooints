/* eslint-disable prettier/prettier */
import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [
    // Configuration module - loads environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config: Record<string, unknown>) => {
        const logger = new Logger('ConfigValidation');
        
        // Check required environment variables
        const requiredEnvVars = [
          'MONGO_URL',
          'JWT_SECRET',
          'CLOUDINARY_CLOUD_NAME',
          'CLOUDINARY_API_KEY',
          'CLOUDINARY_API_SECRET',
        ];

        const missingVars = requiredEnvVars.filter(varName => !config[varName]);

        if (missingVars.length > 0) {
          logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
          throw new Error(
            `Missing required environment variables: ${missingVars.join(', ')}`
          );
        }

        // Validate Redis configuration
        const hasRedisUrl = config['REDIS_URL'];
        const hasRedisHost = config['REDIS_HOST'];
        
        if (!hasRedisUrl && !hasRedisHost) {
          logger.warn('No Redis configuration found. Please set REDIS_URL or REDIS_HOST');
          // Uncomment the line below if Redis is required
          // throw new Error('Redis configuration is required. Please set REDIS_URL or REDIS_HOST');
        }

        logger.log('All required environment variables are present');
        return config;
      },
    }),

    // Database connection using ConfigService
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseConnection');
        const mongoUrl = configService.get<string>('MONGO_URL');
        
        if (!mongoUrl) {
          logger.error('MONGO_URL environment variable is not set');
          throw new Error('MONGO_URL environment variable is not set');
        }
        
        logger.log('Attempting to connect to MongoDB...');
        
        return {
          uri: mongoUrl,
          retryAttempts: 5,
          retryDelay: 3000,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              logger.log('MongoDB connected successfully');
              logger.log(`Database: ${connection.db?.databaseName || 'Unknown'}`);
            });
            
            connection.on('error', (err) => {
              logger.error(`MongoDB connection error: ${err.message}`);
            });
            
            connection.on('disconnected', () => {
              logger.warn('MongoDB disconnected');
            });
            
            connection.on('reconnected', () => {
              logger.log('MongoDB reconnected');
            });
            
            connection.on('connecting', () => {
              logger.log('Connecting to MongoDB...');
            });
            
            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RateLimiting');
        const ttl = (configService.get<number>('RATE_LIMIT_TTL') || 60) * 1000;
        const limit = configService.get<number>('RATE_LIMIT_LIMIT') || 100;
        
        logger.log(`Rate limiting configured: ${limit} requests per ${ttl/1000} seconds`);
        
        return {
          ttl,
          limit,
        };
      },
      inject: [ConfigService],
    }),

    // Add other modules here as needed
    PrismaModule,
    RedisModule,

    AuthModule,

    UsersModule,

    CategoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}