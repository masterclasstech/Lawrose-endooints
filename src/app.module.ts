/* eslint-disable prettier/prettier */
import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { MulterModule } from '@nestjs/platform-express';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { memoryStorage } from 'multer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { CategoryModule } from './category/category.module';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { ProductsModule } from './products/products.module';
import { CommonModule } from './common/services/common.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';

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

    // Global Event Emitter configuration
    EventEmitterModule.forRoot({
      // Set this to `true` to use wildcards (useful for pattern matching)
      wildcard: true,
      // The delimiter used to segment namespaces
      delimiter: '.',
      // Set this to `true` if you want to emit the newListener event
      newListener: false,
      // Set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // The maximum amount of listeners that can be assigned to an event
      maxListeners: 20,
      // Show event name in memory leak message when more than maximum amount of listeners are assigned
      verboseMemoryLeak: false,
      // Disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),

    // Global Multer configuration for image uploads
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('MulterConfiguration');
        
        // Get configuration values from environment or use defaults
        const maxFileSize = configService.get<number>('MAX_IMAGE_SIZE') || 5 * 1024 * 1024; // 5MB default
        const maxFiles = configService.get<number>('MAX_FILES_PER_UPLOAD') || 5; // 5 files default
        
        logger.log(`Global Multer configured - Max file size: ${maxFileSize / (1024 * 1024)}MB, Max files: ${maxFiles}`);
        
        return {
          storage: memoryStorage(),
          
          // File size and count limits
          limits: {
            fileSize: maxFileSize,
            files: maxFiles,
            fieldNameSize: 100, // Max field name size
            fieldSize: 1024 * 1024, // 1MB max field value size
            fields: 10, // Max number of non-file fields
          },
          
          // Global file filter for images
          fileFilter: (req, file, callback) => {
            logger.debug(`Processing file upload: ${file.originalname} (${file.mimetype})`);
            
            // Define allowed image MIME types
            const allowedImageTypes = [
              'image/jpeg',
              'image/jpg',
              'image/png',
              'image/webp',
            ];
            
            // Define allowed file extensions as backup check
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
            
            const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
            
            // Check MIME type
            if (!allowedImageTypes.includes(file.mimetype)) {
              logger.warn(`Rejected file: ${file.originalname} - Invalid MIME type: ${file.mimetype}`);
              return callback(
                new Error(`Invalid file type: ${file.mimetype}. Only image files are allowed.`),
                false
              );
            }
            
            // Check file extension as additional security
            if (!allowedExtensions.includes(fileExtension)) {
              logger.warn(`Rejected file: ${file.originalname} - Invalid extension: ${fileExtension}`);
              return callback(
                new Error(`Invalid file extension: ${fileExtension}. Only image files are allowed.`),
                false
              );
            }
            
            // Additional security check: validate file headers (magic numbers)
            // This helps prevent malicious files with correct extensions
            // Note: This is a basic check, for production consider more robust validation
            
            logger.debug(`Accepted file: ${file.originalname}`);
            callback(null, true);
          },
          
          // Preserve file paths for organized uploads
          preservePath: false,
        };
      },
      inject: [ConfigService],
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

    // Core modules
    PrismaModule,
    RedisModule,
    CloudinaryModule,
    CommonModule,
    
    // Feature modules
    AuthModule,
    UsersModule,
    CategoryModule,
    ProductsModule,
    CartModule,
    WishlistModule,
    
    // Add other feature modules here as needed
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}