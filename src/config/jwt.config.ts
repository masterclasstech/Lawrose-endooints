/* eslint-disable prettier/prettier */
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  // Access Token Configuration
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
  expiresIn: process.env.JWT_EXPIRATION || '15m',
  
  // Refresh Token Configuration
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-here',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  
  // Token Configuration Options
  options: {
    issuer: process.env.JWT_ISSUER || 'lawrose-ecommerce-api',
    audience: process.env.JWT_AUDIENCE || 'lawrose-ecommerce-users',
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    ignoreExpiration: process.env.NODE_ENV === 'development' && process.env.JWT_IGNORE_EXPIRATION === 'true',
    clockTolerance: parseInt(process.env.JWT_CLOCK_TOLERANCE, 10) || 60, // seconds
  },
  
  // Password Reset Token Configuration
  passwordReset: {
    secret: process.env.JWT_PASSWORD_RESET_SECRET || process.env.JWT_SECRET,
    expiresIn: process.env.JWT_PASSWORD_RESET_EXPIRATION || '1h',
  },
  
  // Email Verification Token Configuration
  emailVerification: {
    secret: process.env.JWT_EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EMAIL_VERIFICATION_EXPIRATION || '24h',
  },
  
  // Two-Factor Authentication Token Configuration
  twoFactor: {
    secret: process.env.JWT_TWO_FACTOR_SECRET || process.env.JWT_SECRET,
    expiresIn: process.env.JWT_TWO_FACTOR_EXPIRATION || '10m',
  },
  
  // API Key Token Configuration (for external integrations)
  apiKey: {
    secret: process.env.JWT_API_KEY_SECRET || process.env.JWT_SECRET,
    expiresIn: process.env.JWT_API_KEY_EXPIRATION || '30d',
  },
  
  // Session Configuration
  session: {
    maxAge: parseInt(process.env.JWT_SESSION_MAX_AGE, 10) || 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    renewThreshold: parseInt(process.env.JWT_RENEW_THRESHOLD, 10) || 5 * 60 * 1000, // 5 minutes in milliseconds
  },
  
  // Security Configuration
  security: {
    // Enable token blacklisting for logout
    enableBlacklist: process.env.JWT_ENABLE_BLACKLIST === 'true' || true,
    
    // Maximum number of active sessions per user
    maxActiveSessions: parseInt(process.env.JWT_MAX_ACTIVE_SESSIONS, 10) || 5,
    
    // Enable IP address validation
    validateIpAddress: process.env.JWT_VALIDATE_IP === 'true' || false,
    
    // Enable user agent validation
    validateUserAgent: process.env.JWT_VALIDATE_USER_AGENT === 'true' || false,
  },
  
  // Rate limiting for token generation
  rateLimiting: {
    // Max token requests per minute per user
    maxRequestsPerMinute: parseInt(process.env.JWT_MAX_REQUESTS_PER_MINUTE, 10) || 10,
    
    // Max refresh attempts per hour
    maxRefreshAttemptsPerHour: parseInt(process.env.JWT_MAX_REFRESH_ATTEMPTS_PER_HOUR, 10) || 20,
  },
  
  // Validation function
  validate: (config: Record<string, any>) => {
    if (!config.secret || config.secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for security.');
    }
    
    if (!config.refreshSecret || config.refreshSecret.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long for security.');
    }
    
    if (config.secret === config.refreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different for security.');
    }
    
    // Validate expiration times
    const validTimeUnits = /^(\d+)(s|m|h|d)$/;
    if (!validTimeUnits.test(config.expiresIn)) {
      throw new Error('JWT_EXPIRATION must be in format: number + unit (s|m|h|d). Example: 15m, 1h, 7d');
    }
    
    if (!validTimeUnits.test(config.refreshExpiresIn)) {
      throw new Error('JWT_REFRESH_EXPIRATION must be in format: number + unit (s|m|h|d). Example: 15m, 1h, 7d');
    }
    
    return config;
  },
}));