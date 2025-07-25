/* eslint-disable prettier/prettier */
import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

interface CloudinaryUploadOptions {
  folder?: string;
  width?: number;
  height?: number;
  crop?: string;
  quality?: string | number;
  format?: string;
  public_id?: string;
  overwrite?: boolean;
  transformation?: any[];
  gravity?: string;
}

interface CloudinaryDeleteResult {
  result: 'ok' | 'not found';
  public_id?: string;
}

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload single image to Cloudinary
   * @param file Buffer or file path
   * @param options Upload options
   * @returns Promise<string> - Cloudinary URL
   */
  async uploadImage(
    file: Buffer | string,
    options: CloudinaryUploadOptions = {}
  ): Promise<string> {
    try {
      const defaultOptions: CloudinaryUploadOptions = {
        folder: 'lawrose',
        quality: 'auto',
        format: 'auto',
        crop: 'limit',
        ...options,
      };

      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          defaultOptions,
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error('Upload failed'));
          }
        );

        if (Buffer.isBuffer(file)) {
          uploadStream.end(file);
        } else {
          // If file is a path string
          cloudinary.uploader.upload(file, defaultOptions)
            .then(resolve)
            .catch(reject);
        }
      });

      return result.secure_url;
    } catch (error) {
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple images to Cloudinary
   * @param files Array of Buffers or file paths
   * @param options Upload options
   * @returns Promise<string[]> - Array of Cloudinary URLs
   */
  async uploadMultipleImages(
    files: (Buffer | string)[],
    options: CloudinaryUploadOptions = {}
  ): Promise<string[]> {
    try {
      const uploadPromises = files.map((file, index) => 
        this.uploadImage(file, {
          ...options,
          public_id: options.public_id ? `${options.public_id}_${index}` : undefined,
        })
      );

      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new BadRequestException(`Multiple image upload failed: ${error.message}`);
    }
  }

  /**
   * Delete image from Cloudinary
   * @param publicId Public ID of the image to delete
   * @returns Promise<CloudinaryDeleteResult>
   */
  async deleteImage(publicId: string): Promise<CloudinaryDeleteResult> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new BadRequestException(`Image deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple images from Cloudinary
   * @param publicIds Array of public IDs to delete
   * @returns Promise<CloudinaryDeleteResult[]>
   */
  async deleteMultipleImages(publicIds: string[]): Promise<CloudinaryDeleteResult[]> {
    try {
      const deletePromises = publicIds.map(publicId => this.deleteImage(publicId));
      return await Promise.all(deletePromises);
    } catch (error) {
      throw new BadRequestException(`Multiple image deletion failed: ${error.message}`);
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param url Cloudinary URL
   * @returns string - Public ID
   */
  extractPublicId(url: string): string {
    try {
      // Extract public ID from Cloudinary URL
      // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      const publicId = filename.split('.')[0];
      
      // Handle versioned URLs (remove version prefix)
      return publicId.startsWith('v') && publicId.length > 10 
        ? parts[parts.length - 2] + '/' + publicId 
        : publicId;
    } catch (error) {
      throw new BadRequestException(`Invalid Cloudinary URL: ${url}`);
    }
  }

  /**
   * Get optimized image URL with transformations
   * @param publicId Public ID of the image
   * @param transformations Cloudinary transformations
   * @returns string - Optimized image URL
   */
  getOptimizedUrl(publicId: string, transformations: any[] = []): string {
    try {
      return cloudinary.url(publicId, {
        transformation: [
          { quality: 'auto', format: 'auto' },
          ...transformations,
        ],
      });
    } catch (error) {
      throw new BadRequestException(`Failed to generate optimized URL: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail URL
   * @param publicId Public ID of the image
   * @param width Thumbnail width (default: 300)
   * @param height Thumbnail height (default: 300)
   * @returns string - Thumbnail URL
   */
  getThumbnailUrl(publicId: string, width: number = 300, height: number = 300): string {
    return this.getOptimizedUrl(publicId, [
      { width, height, crop: 'fill', gravity: 'center' }
    ]);
  }

  /**
   * Upload category image with specific optimizations
   * @param file Image buffer or path
   * @param categorySlug Category slug for folder organization
   * @returns Promise<string> - Cloudinary URL
   */
  async uploadCategoryImage(file: Buffer | string, categorySlug: string): Promise<string> {
    return this.uploadImage(file, {
      folder: `lawrose/categories/${categorySlug}`,
      width: 800,
      height: 600,
      crop: 'fill',
      gravity: 'center',
      quality: 'auto:good',
      format: 'auto',
    });
  }

  /**
   * Upload subcategory image with specific optimizations
   * @param file Image buffer or path
   * @param categorySlug Parent category slug
   * @param subcategorySlug Subcategory slug
   * @returns Promise<string> - Cloudinary URL
   */
  async uploadSubcategoryImage(
    file: Buffer | string, 
    categorySlug: string, 
    subcategorySlug: string
  ): Promise<string> {
    return this.uploadImage(file, {
      folder: `lawrose/categories/${categorySlug}/subcategories/${subcategorySlug}`,
      width: 600,
      height: 450,
      crop: 'fill',
      gravity: 'center',
      quality: 'auto:good',
      format: 'auto',
    });
  }
}