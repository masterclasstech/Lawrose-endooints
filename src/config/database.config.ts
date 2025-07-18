/* eslint-disable prettier/prettier */
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.MONGO_URL || process.env.DATABASE_URL,
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE, 10) || 10,
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE, 10) || 2,
  maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME_MS, 10) || 30000,
  serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT_MS, 10) || 5000,
  socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT_MS, 10) || 45000,
  heartbeatFrequencyMS: parseInt(process.env.DB_HEARTBEAT_FREQUENCY_MS, 10) || 10000,
  retryWrites: process.env.DB_RETRY_WRITES === 'true' || true,
  w: process.env.DB_WRITE_CONCERN || 'majority',
  readPreference: process.env.DB_READ_PREFERENCE || 'primary',
  compressors: process.env.DB_COMPRESSORS || 'snappy,zlib',
  ssl: process.env.DB_SSL === 'true' || true,
  authSource: process.env.DB_AUTH_SOURCE || 'admin',
  appName: process.env.DB_APP_NAME || 'Lawrose-ecommerce-api',
  directConnection: process.env.DB_DIRECT_CONNECTION === 'true' || false,
  
  // Connection options for Prisma
  prisma: {
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
  },
  
  // Database connection validation
  validate: (config: Record<string, any>) => {
    if (!config.url) {
      throw new Error('Database URL is required. Please set MONGO_URL or DATABASE_URL in your environment variables.');
    }
    
    if (!config.url.startsWith('mongodb://') && !config.url.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB URL format. URL must start with mongodb:// or mongodb+srv://');
    }
    
    return config;
  },
}));