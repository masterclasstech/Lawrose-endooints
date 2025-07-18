/* eslint-disable prettier/prettier */

// Environment configuration
export const config = {
  // Application
  app: {
    port: parseInt(process.env.PORT, 10) || 5000,
    environment: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || 'api',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8000'],
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || process.env.MONGO_URL,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    expiresIn: process.env.JWT_EXPIRATION || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    from: process.env.EMAIL_SERVICE,
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // Payment Gateways
  /*
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    mode: process.env.PAYPAL_MODE || 'sandbox',
  },

  flutterwave: {
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
  },

  // Shipping
  dhl: {
    apiKey: process.env.DHL_API_KEY,
    apiSecret: process.env.DHL_API_SECRET,
    accountNumber: process.env.DHL_ACCOUNT_NUMBER,
  },

  fedex: {
    apiKey: process.env.FEDEX_API_KEY,
    secretKey: process.env.FEDEX_SECRET_KEY,
    accountNumber: process.env.FEDEX_ACCOUNT_NUMBER,
  },
  */

  // Social Auth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },


  // Elasticsearch
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    limit: parseInt(process.env.RATE_LIMIT_LIMIT, 10) || 100,
  },

  // File Upload
  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },

  // API Documentation
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH || '/api-docs',
  },

  // Health Check
  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
  },

  
};

// Validation function to check required environment variables
export const validateConfig = () => {
  const requiredEnvVars = [
    'MONGO_URL',
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate specific configurations
  if (config.app.port < 1 || config.app.port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  if (config.redis.port < 1 || config.redis.port > 65535) {
    throw new Error('REDIS_PORT must be between 1 and 65535');
  }

  if (config.fileUpload.maxFileSize < 1) {
    throw new Error('MAX_FILE_SIZE must be greater than 0');
  }

  console.log('Configuration validation passed');
};

// Export individual configurations for specific use cases
export const appConfig = config.app;
export const databaseConfig = config.database;
export const redisConfig = config.redis;
export const jwtConfig = config.jwt;
export const emailConfig = config.email;
export const cloudinaryConfig = config.cloudinary;
/*
export const paymentConfig = {
  stripe: config.stripe,
  paypal: config.paypal,
  flutterwave: config.flutterwave,
};
export const shippingConfig = {
  dhl: config.dhl,
  fedex: config.fedex,
};
*/
export const authConfig = {
  google: config.google,
};
export const loggingConfig = config.logging;