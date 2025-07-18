/* eslint-disable prettier/prettier */
import { registerAs } from '@nestjs/config';

export default registerAs('cloudinary', () => ({
  // Cloudinary credentials
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  
  // Upload configuration
  upload: {
    // Default upload options
    defaultOptions: {
      resource_type: 'auto',
      folder: process.env.CLOUDINARY_DEFAULT_FOLDER || 'ecommerce',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      invalidate: true,
      quality: 'auto',
      fetch_format: 'auto',
      secure: true,
    },
    
    // Upload presets for different image types
    presets: {
      // User profile pictures
      userAvatar: {
        folder: 'ecommerce/users/avatars',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        max_file_size: 2 * 1024 * 1024, // 2MB
      },
      
      // Product images
      productImage: {
        folder: 'ecommerce/products',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        max_file_size: 5 * 1024 * 1024, // 5MB
      },
      
      // Product thumbnails
      productThumbnail: {
        folder: 'ecommerce/products/thumbnails',
        transformation: [
          { width: 300, height: 300, crop: 'fill' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        max_file_size: 1 * 1024 * 1024, // 1MB
      },
      
      // Category images
      categoryImage: {
        folder: 'ecommerce/categories',
        transformation: [
          { width: 800, height: 400, crop: 'fill' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        max_file_size: 3 * 1024 * 1024, // 3MB
      },
      
      // Brand logos
      brandLogo: {
        folder: 'ecommerce/brands',
        transformation: [
          { width: 400, height: 200, crop: 'fit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
        max_file_size: 1 * 1024 * 1024, // 1MB
      },
      
      // Banners and promotional images
      banner: {
        folder: 'ecommerce/banners',
        transformation: [
          { width: 1920, height: 600, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        max_file_size: 8 * 1024 * 1024, // 8MB
      },
      
      // Documents (invoices, receipts, etc.)
      document: {
        folder: 'ecommerce/documents',
        resource_type: 'auto',
        allowed_formats: ['pdf', 'doc', 'docx', 'txt'],
        max_file_size: 10 * 1024 * 1024, // 10MB
      },
    },
  },
  
  // Image transformation configurations
  transformations: {
    // Responsive image sizes
    responsive: {
      thumbnail: { width: 150, height: 150, crop: 'fill' },
      small: { width: 300, height: 300, crop: 'limit' },
      medium: { width: 600, height: 600, crop: 'limit' },
      large: { width: 1200, height: 1200, crop: 'limit' },
      xlarge: { width: 1920, height: 1920, crop: 'limit' },
    },
    
    // Quality presets
    quality: {
      low: { quality: 'auto:low' },
      medium: { quality: 'auto:good' },
      high: { quality: 'auto:best' },
    },
    
    // Format optimization
    format: {
      webp: { fetch_format: 'webp' },
      avif: { fetch_format: 'avif' },
      auto: { fetch_format: 'auto' },
    },
  },
  
  // URL generation configuration
  url: {
    // Default URL options
    defaultOptions: {
      secure: true,
      sign_url: process.env.CLOUDINARY_SIGN_URL === 'true' || false,
      type: 'upload',
    },
    
    // CDN configuration
    cdn: {
      // Custom domain (if you have one)
      cname: process.env.CLOUDINARY_CNAME || null,
      
      // Secure distribution
      secureDistribution: process.env.CLOUDINARY_SECURE_DISTRIBUTION || null,
      
      // Private CDN
      privateCdn: process.env.CLOUDINARY_PRIVATE_CDN === 'true' || false,
    },
  },
  
  // Video upload configuration
  video: {
    defaultOptions: {
      resource_type: 'video',
      folder: 'ecommerce/videos',
      quality: 'auto',
      format: 'mp4',
    },
    
    presets: {
      // Product videos
      productVideo: {
        folder: 'ecommerce/products/videos',
        transformation: [
          { width: 1280, height: 720, crop: 'limit' },
          { quality: 'auto:good' },
          { format: 'mp4' },
        ],
        max_file_size: 50 * 1024 * 1024, // 50MB
      },
      
      // Promotional videos
      promotional: {
        folder: 'ecommerce/promotions/videos',
        transformation: [
          { width: 1920, height: 1080, crop: 'limit' },
          { quality: 'auto:good' },
          { format: 'mp4' },
        ],
        max_file_size: 100 * 1024 * 1024, // 100MB
      },
    },
  },
  
  // Security configuration
  security: {
    // Upload signing
    signUploads: process.env.CLOUDINARY_SIGN_UPLOADS === 'true' || true,
    
    // Allowed file types
    allowedFormats: {
      images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'],
      videos: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
      documents: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
    },
    
    // Upload restrictions
    maxFileSize: {
      image: 10 * 1024 * 1024, // 10MB
      video: 100 * 1024 * 1024, // 100MB
      document: 25 * 1024 * 1024, // 25MB
    },
    
    // Rate limiting
    rateLimiting: {
      enabled: process.env.CLOUDINARY_RATE_LIMITING === 'true' || true,
      maxUploadsPerMinute: parseInt(process.env.CLOUDINARY_MAX_UPLOADS_PER_MINUTE, 10) || 60,
      maxUploadsPerHour: parseInt(process.env.CLOUDINARY_MAX_UPLOADS_PER_HOUR, 10) || 1000,
    },
  },
  
  // Backup and archiving
  backup: {
    // Enable automatic backup
    enabled: process.env.CLOUDINARY_BACKUP_ENABLED === 'true' || false,
    
    // Backup storage
    storage: process.env.CLOUDINARY_BACKUP_STORAGE || 's3',
    
    // Backup retention period (in days)
    retentionPeriod: parseInt(process.env.CLOUDINARY_BACKUP_RETENTION, 10) || 365,
  },
  
  // Analytics and monitoring
  analytics: {
    // Enable usage analytics
    enabled: process.env.CLOUDINARY_ANALYTICS_ENABLED === 'true' || true,
    
    // Track transformations
    trackTransformations: process.env.CLOUDINARY_TRACK_TRANSFORMATIONS === 'true' || true,
    
    // Track bandwidth usage
    trackBandwidth: process.env.CLOUDINARY_TRACK_BANDWIDTH === 'true' || true,
  },
  
  // Validation function
  validate: (config: Record<string, any>) => {
    if (!config.cloudName) {
      throw new Error('CLOUDINARY_CLOUD_NAME is required');
    }
    
    if (!config.apiKey) {
      throw new Error('CLOUDINARY_API_KEY is required');
    }
    
    if (!config.apiSecret) {
      throw new Error('CLOUDINARY_API_SECRET is required');
    }
    
    // Validate cloud name format
    if (!/^[a-zA-Z0-9_-]+$/.test(config.cloudName)) {
      throw new Error('Invalid CLOUDINARY_CLOUD_NAME format. Only alphanumeric characters, hyphens, and underscores are allowed.');
    }
    
    return config;
  },
}));