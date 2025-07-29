/* eslint-disable prettier/prettier */

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProductRepository } from './repositories/product.repository';
import { ProductVariantRepository } from './repositories/product-variant.repository';
import { CloudinaryService } from '../common/cloudinary/cloudinary';
import { CacheService } from '@/common/services/cache.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { generateUniqueSlug, createSlugChecker } from '@/common/utils/slug.util';
import { CacheKeyType } from '../interfaces/cache.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Gender, Prisma } from '@prisma/client'; // Import Gender enum and Prisma types

interface ProductImage {
  url: string;
  publicId: string;
  isMain?: boolean;
}

// Use Prisma's generated type instead of custom interface
type ProductCreateInput = Prisma.ProductCreateInput;

@Injectable()
export class ProductService {
  private readonly CACHE_TTL = {
    PRODUCT_DETAIL: 3600, // 1 hour
    PRODUCT_LIST: 1800,   // 30 minutes
    FEATURED: 3600,       // 1 hour
    RELATED: 1800,        // 30 minutes
    FILTERS: 7200,        // 2 hours
    INVENTORY_STATS: 300, // 5 minutes
  };

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly variantRepository: ProductVariantRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateProductDto) {
    // Generate unique slug
    const slugChecker = createSlugChecker(slug => this.productRepository.findBySlug(slug));
    const slug = await generateUniqueSlug(dto.name, slugChecker);

    // Validate SKU uniqueness
    await this.validateSkuUniqueness(dto.sku);

    // Process images if provided
    const imageFiles = dto.imageFile || [];
    const processedImages = await this.processProductImages(imageFiles, dto.images || []);

    // Convert date strings to Date objects if provided
    const discountStartDate = dto.discountStartDate ? new Date(dto.discountStartDate) : undefined;
    const discountEndDate = dto.discountEndDate ? new Date(dto.discountEndDate) : undefined;

    const productData: ProductCreateInput = {
      name: dto.name,
      slug,
      description: dto.description,
      shortDescription: dto.shortDescription,
      sku: dto.sku,
      barcode: dto.barcode,
      price: dto.price,
      comparePrice: dto.comparePrice,
      currency: dto.currency ?? 'USD',
      stockQuantity: dto.stockQuantity ?? 0,
      lowStockThreshold: dto.lowStockThreshold ?? 10,
      trackInventory: dto.trackInventory ?? true,
      discountPercentage: dto.discountPercentage,
      discountStartDate,
      discountEndDate,
      images: processedImages.map(img => img.url),
      featuredImage: processedImages[0]?.url || dto.featuredImage,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      colors: dto.colors || [],
      sizes: dto.sizes || [],
      isActive: dto.isActive ?? true,
      isFeatured: dto.isFeatured ?? false,
      isDigital: dto.isDigital ?? false,
      weight: dto.weight,
      dimensions: dto.dimensions ? { ...dto.dimensions } : undefined,
      tags: dto.tags || [],
      materials: dto.materials || [],
      careInstructions: dto.careInstructions || [],
      // Fix: Proper Prisma relation connection
      category: {
        connect: { id: dto.categoryId }
      },
      subcategory: dto.subcategoryId ? {
        connect: { id: dto.subcategoryId }
      } : undefined,
      collection: dto.collectionId ? {
        connect: { id: dto.collectionId }
      } : undefined,
      gender: dto.gender as Gender, // Cast to Gender enum
    };

    const product = await this.productRepository.create(productData);

    // Cache the new product
    await this.cacheProduct(product);

    // Invalidate related caches
    await this.invalidateProductCaches();

    // Emit product created event
    this.eventEmitter.emit('product.created', { product });

    return this.enrichProductData(product);
  }

  async findById(id: string) {
    // Try cache first
    const cacheKey = {
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'detail',
      subKey: id,
    };

    let product = await this.cacheService.get(cacheKey);
    
    if (!product) {
      product = await this.productRepository.findById(id);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Cache the product
      await this.cacheService.set(cacheKey, product, { ttl: this.CACHE_TTL.PRODUCT_DETAIL });
    }

    return this.enrichProductData(product);
  }

  async findBySlug(slug: string) {
    // Try cache first
    const cacheKey = {
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'slug',
      subKey: slug,
    };

    let product = await this.cacheService.get(cacheKey);
    
    if (!product) {
      product = await this.productRepository.findBySlug(slug);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Cache the product
      await this.cacheService.set(cacheKey, product, { ttl: this.CACHE_TTL.PRODUCT_DETAIL });
    }

    // Explicitly type product as any to avoid 'unknown' property access error
    const typedProduct = product as any;

    // Increment view count (async, don't wait)
    this.incrementViewCount(typedProduct.id).catch(() => {});

    return this.enrichProductData(typedProduct);
  }

  async findMany(query: ProductQueryDto) {
    // Generate cache key based on query parameters
    const queryKey = this.generateQueryCacheKey(query);
    const cacheKey = {
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'list',
      subKey: queryKey,
    };

    let result: any = await this.cacheService.get(cacheKey);
    
    if (!result) {
      result = await this.productRepository.findMany(query);
      
      // Cache the result
      await this.cacheService.set(cacheKey, result, { ttl: this.CACHE_TTL.PRODUCT_LIST });
    }

    return typeof result === 'object' && result !== null
      ? {
          ...result,
          data: Array.isArray(result.data)
            ? result.data.map((product: any) => this.enrichProductData(product))
            : [],
        }
      : { data: [] };
  }

  async update(id: string, dto: UpdateProductDto) {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    const updateData: any = { ...dto };

    // Generate new slug if name changed
    if (dto.name && dto.name !== existingProduct.name) {
      const slugChecker = createSlugChecker(async (slug) => {
        const product = await this.productRepository.findBySlug(slug);
        return product && product.id !== id ? product : null;
      });
      updateData.slug = await generateUniqueSlug(dto.name, slugChecker);
    }

    // Validate SKU uniqueness if changed
    if (dto.sku && dto.sku !== existingProduct.sku) {
      await this.validateSkuUniqueness(dto.sku);
    }

    // Convert date strings to Date objects if provided
    if (dto.discountStartDate) {
      updateData.discountStartDate = new Date(dto.discountStartDate);
    }
    if (dto.discountEndDate) {
      updateData.discountEndDate = new Date(dto.discountEndDate);
    }

    // Process new images if provided
    if (dto.imageFile || dto.replaceImages) {
      const imageFiles = dto.imageFile || [];
      const newImages = await this.handleImageUpdate(
        existingProduct, 
        imageFiles, 
        dto.images || [],
        dto.replaceImages || false
      );
      
      updateData.images = newImages.map(img => img.url);
      updateData.imagePublicIds = newImages.map(img => img.publicId);
      
      // Update featured image if not explicitly set
      if (!dto.featuredImage && newImages.length > 0) {
        updateData.featuredImage = newImages[0].url;
        updateData.featuredImagePublicId = newImages[0].publicId;
      }
    }

    // Handle category relationship updates
    if (dto.categoryId) {
      updateData.category = { connect: { id: dto.categoryId } };
      delete updateData.categoryId;
    }
    
    if (dto.subcategoryId) {
      updateData.subcategory = { connect: { id: dto.subcategoryId } };
      delete updateData.subcategoryId;
    }
    
    if (dto.collectionId) {
      updateData.collection = { connect: { id: dto.collectionId } };
      delete updateData.collectionId;
    }

    // Handle gender enum conversion
    if (dto.gender) {
      updateData.gender = dto.gender as Gender;
    }

    const product = await this.productRepository.update(id, updateData);

    // Update cache
    await this.cacheProduct(product);

    // Invalidate related caches
    await this.invalidateProductCaches(id);

    // Emit product updated event
    this.eventEmitter.emit('product.updated', { 
      product, 
      previousData: existingProduct 
    });

    return this.enrichProductData(product);
  }

  async delete(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if product has active orders
    const hasActiveOrders = await this.checkActiveOrders();
    if (hasActiveOrders) {
      throw new ConflictException(
        'Cannot delete product with active orders. Consider deactivating instead.',
      );
    }

    await this.productRepository.delete(id);

    // Clean up images from Cloudinary
    await this.cleanupProductImages(product);

    // Remove from cache
    await this.removeProductFromCache(id, product.slug);

    // Invalidate related caches
    await this.invalidateProductCaches();

    // Emit product deleted event
    this.eventEmitter.emit('product.deleted', { product });

    return { message: 'Product deleted successfully' };
  }

  async getFeatured(limit = 8) {
    const cacheKey = {
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'featured',
      subKey: limit.toString(),
    };

    let products: any[] = await this.cacheService.get(cacheKey);
    
    if (!products) {
      products = await this.productRepository.findFeatured(limit);
      await this.cacheService.set(cacheKey, products, { ttl: this.CACHE_TTL.FEATURED });
    }

    return products.map(product => this.enrichProductData(product));
  }

  async getRelated(productId: string, limit = 4) {
    const cacheKey = {
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'related',
      subKey: `${productId}_${limit}`,
    };

    let related = await this.cacheService.get(cacheKey);
    
    if (!related) {
      const product = await this.productRepository.findById(productId);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      related = await this.productRepository.findRelated(
        productId,
        product.categoryId,
        limit,
      );

      await this.cacheService.set(cacheKey, related, { ttl: this.CACHE_TTL.RELATED });
    }

    return (related as any[]).map(product => this.enrichProductData(product));
  }

  async searchSuggestions(query: string, limit = 5) {
    if (!query || query.length < 2) {
      return [];
    }

    const cacheKey = {
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'suggestions',
      subKey: `${query}_${limit}`,
    };

    let suggestions = await this.cacheService.get(cacheKey);
    
    if (!suggestions) {
      suggestions = await this.productRepository.searchSuggestions(query, limit);
      await this.cacheService.set(cacheKey, suggestions, { ttl: 300 }); // 5 minutes
    }

    return suggestions;
  }

  async getFilters() {
    const cacheKey = {
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'filters',
    };

    let filters = await this.cacheService.get(cacheKey);
    
    if (!filters) {
      filters = await this.productRepository.getUniqueFilters();
      await this.cacheService.set(cacheKey, filters, { ttl: this.CACHE_TTL.FILTERS });
    }

    return filters;
  }

  async bulkUpdateStock(updates: Array<{ id: string; stockQuantity: number }>) {
    // Validate all products exist
    const products = await Promise.all(
      updates.map(({ id }) => this.productRepository.findById(id)),
    );

    const notFound = products
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => !product)
      .map(({ index }) => updates[index].id);

    if (notFound.length > 0) {
      throw new NotFoundException(`Products not found: ${notFound.join(', ')}`);
    }

    const results = await this.productRepository.bulkUpdateStock(updates);

    // Update cache for each product
    for (const product of results) {
      await this.cacheProduct(product);
    }

    // Invalidate inventory stats cache
    await this.cacheService.del({
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'inventory_stats',
    });

    // Emit stock updated events
    results.forEach((product, index) => {
      this.eventEmitter.emit('product.stock.updated', {
        productId: product.id,
        oldStock: products[index].stockQuantity,
        newStock: updates[index].stockQuantity,
      });
    });

    return results;
  }

  async toggleFeatured(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.productRepository.update(id, {
      isFeatured: !product.isFeatured,
    });

    // Update cache
    await this.cacheProduct(updated);

    // Invalidate featured products cache
    await this.cacheService.clearPattern('featured*');

    return updated;
  }

  async toggleActive(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.productRepository.update(id, {
      isActive: !product.isActive,
    });

    // Update cache
    await this.cacheProduct(updated);

    // Invalidate related caches
    await this.invalidateProductCaches(id);

    return updated;
  }

  async getInventoryStats() {
    const cacheKey = {
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'inventory_stats',
    };

    let stats = await this.cacheService.get(cacheKey);
    
    if (!stats) {
      stats = {
        totalProducts: await this.getTotalProducts(),
        lowStockProducts: await this.getLowStockCount(),
        outOfStockProducts: await this.getOutOfStockCount(),
        featuredProducts: await this.getFeaturedCount(),
      };

      await this.cacheService.set(cacheKey, stats, { ttl: this.CACHE_TTL.INVENTORY_STATS });
    }

    return stats;
  }

  // Private helper methods

  private async processProductImages(imageFiles: Express.Multer.File[], existingUrls: string[] = []): Promise<ProductImage[]> {
    const images: ProductImage[] = [];

    // Add existing URLs as images (extract public IDs)
    for (const url of existingUrls) {
      try {
        const publicId = this.cloudinaryService.extractPublicId(url);
        images.push({ url, publicId });
      } catch (error) {
        console.warn(`Failed to extract public ID from URL: ${url}`);
      }
    }

    // Upload new files
    if (imageFiles.length > 0) {
      try {
        const uploadPromises = imageFiles.map(async (file) => {
          const url = await this.cloudinaryService.uploadImage(file.buffer, {
            folder: 'lawrose/products',
            width: 1200,
            height: 1200,
            crop: 'limit',
            quality: 'auto:good',
            fetch_format: 'auto',
          });
          const publicId = this.cloudinaryService.extractPublicId(url);
          return { url, publicId };
        });

        const uploadedImages = await Promise.all(uploadPromises);
        images.push(...uploadedImages);
      } catch (error) {
        throw new BadRequestException(`Failed to upload product images: ${error.message}`);
      }
    }

    return images;
  }

  private async handleImageUpdate(
    existingProduct: any, 
    newImageFiles: Express.Multer.File[], 
    newImageUrls: string[],
    replaceImages: boolean
  ): Promise<ProductImage[]> {
    let images: ProductImage[] = [];

    if (replaceImages) {
      // Delete old images from Cloudinary
      await this.cleanupProductImages(existingProduct);
      
      // Process only new images
      images = await this.processProductImages(newImageFiles, newImageUrls);
    } else {
      // Keep existing images and add new ones
      const existingImages = (existingProduct.images || []).map((url: string, index: number) => ({
        url,
        publicId: existingProduct.imagePublicIds?.[index] || this.cloudinaryService.extractPublicId(url)
      }));

      const newImages = await this.processProductImages(newImageFiles, newImageUrls);
      images = [...existingImages, ...newImages];
    }

    return images;
  }

  private async cleanupProductImages(product: any): Promise<void> {
    const publicIds = product.imagePublicIds || [];
    
    // If no public IDs stored, try to extract from URLs
    if (publicIds.length === 0 && product.images?.length > 0) {
      for (const url of product.images) {
        try {
          const publicId = this.cloudinaryService.extractPublicId(url);
          publicIds.push(publicId);
        } catch (error) {
          console.warn(`Failed to extract public ID from URL: ${url}`);
        }
      }
    }

    if (publicIds.length > 0) {
      try {
        await this.cloudinaryService.deleteMultipleImages(publicIds);
      } catch (error) {
        console.error(`Failed to delete product images: ${error.message}`);
      }
    }

    // Clean up featured image if different from main images
    if (product.featuredImagePublicId && !publicIds.includes(product.featuredImagePublicId)) {
      try {
        await this.cloudinaryService.deleteImage(product.featuredImagePublicId);
      } catch (error) {
        console.error(`Failed to delete featured image: ${error.message}`);
      }
    }
  }

  private async validateSkuUniqueness(sku: string): Promise<void> {
    const existing = await this.productRepository.findMany({
      page: 1,
      limit: 1,
      search: sku,
    });

    if (existing.data.some(product => product.sku === sku)) {
      throw new ConflictException('SKU already exists');
    }
  }

  private generateQueryCacheKey(query: ProductQueryDto): string {
    const keys = Object.keys(query).sort();
    return keys.map(key => `${key}:${query[key]}`).join('|');
  }

  private async cacheProduct(product: any): Promise<void> {
    // Cache by ID
    await this.cacheService.set({
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'detail',
      subKey: product.id,
    }, product, { ttl: this.CACHE_TTL.PRODUCT_DETAIL });

    // Cache by slug
    if (product.slug) {
      await this.cacheService.set({
        type: CacheKeyType.PRODUCT_DATA,
        identifier: 'slug',
        subKey: product.slug,
      }, product, { ttl: this.CACHE_TTL.PRODUCT_DETAIL });
    }
  }

  private async removeProductFromCache(id: string, slug?: string): Promise<void> {
    // Remove by ID
    await this.cacheService.del({
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'detail',
      subKey: id,
    });

    // Remove by slug
    if (slug) {
      await this.cacheService.del({
        type: CacheKeyType.PRODUCT_DATA,
        identifier: 'slug',
        subKey: slug,
      });
    }
  }

  private async invalidateProductCaches(id?: string): Promise<void> {
    // Clear list caches
    await this.cacheService.clearPattern('list*');
    
    // Clear featured cache
    await this.cacheService.clearPattern('featured*');
    
    // Clear related cache
    if (id) {
      await this.cacheService.clearPattern(`related*${id}*`);
    }
    
    // Clear filters cache
    await this.cacheService.del({
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'filters',
    });
    
    // Clear inventory stats
    await this.cacheService.del({
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'inventory_stats',
    });
  }

  private enrichProductData(product: any) {
    const currentDate = new Date();
    
    // Calculate discount information
    const hasActiveDiscount = product.discountPercentage &&
      product.discountStartDate &&
      product.discountEndDate &&
      currentDate >= product.discountStartDate &&
      currentDate <= product.discountEndDate;

    const finalPrice = hasActiveDiscount
      ? product.price * (1 - product.discountPercentage / 100)
      : product.price;

    // Calculate average rating
    const averageRating = product._count?.ratings > 0
      ? product.ratings?.reduce((sum: number, r: any) => sum + r.rating, 0) / product._count.ratings
      : 0;

    // Stock status
    const stockStatus = this.getStockStatus(product.stockQuantity, product.lowStockThreshold);

    // Generate optimized image URLs
    const optimizedImages = this.generateOptimizedImageUrls(product.images || []);

    return {
      ...product,
      finalPrice,
      hasActiveDiscount,
      savings: hasActiveDiscount ? product.price - finalPrice : 0,
      averageRating: parseFloat(averageRating.toFixed(1)),
      reviewCount: product._count?.reviews || 0,
      ratingCount: product._count?.ratings || 0,
      stockStatus,
      isInStock: product.stockQuantity > 0,
      isLowStock: product.stockQuantity <= product.lowStockThreshold,
      // Optimized images
      images: optimizedImages,
      thumbnail: optimizedImages[0]?.thumbnail || product.featuredImage,
      // SEO optimized URL
      url: `/products/${product.slug}`,
      // Structured data for rich snippets
      structuredData: this.generateStructuredData(product, finalPrice, averageRating),
    };
  }

  private generateOptimizedImageUrls(images: string[]) {
    return images.map(url => {
      try {
        const publicId = this.cloudinaryService.extractPublicId(url);
        return {
          original: url,
          large: this.cloudinaryService.getOptimizedUrl(publicId, [
            { width: 1200, height: 1200, crop: 'limit' }
          ]),
          medium: this.cloudinaryService.getOptimizedUrl(publicId, [
            { width: 800, height: 800, crop: 'limit' }
          ]),
          small: this.cloudinaryService.getOptimizedUrl(publicId, [
            { width: 400, height: 400, crop: 'limit' }
          ]),
          thumbnail: this.cloudinaryService.getThumbnailUrl(publicId, 150, 150),
        };
      } catch (error) {
        // Fallback to original URL if extraction fails
        return {
          original: url,
          large: url,
          medium: url,
          small: url,
          thumbnail: url,
        };
      }
    });
  }

  private getStockStatus(quantity: number, threshold: number): string {
    if (quantity === 0) return 'OUT_OF_STOCK';
    if (quantity <= threshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  private generateStructuredData(product: any, price: number, rating: number) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.shortDescription || product.description,
      image: product.featuredImage,
      sku: product.sku,
      brand: {
        '@type': 'Brand',
        name: 'LawRose', // Replace with actual brand
      },
      offers: {
        '@type': 'Offer',
        price: price.toString(),
        priceCurrency: product.currency,
        availability: product.stockQuantity > 0 
          ? 'https://schema.org/InStock' 
          : 'https://schema.org/OutOfStock',
      },
      aggregateRating: rating > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: rating.toString(),
        reviewCount: product._count?.reviews || 0,
      } : undefined,
    };
  }

  private async incrementViewCount(productId: string): Promise<void> {
    // Use cache for view counting with rate limiting
    const viewKey = {
      type: CacheKeyType.PRODUCT_DATA,
      identifier: 'views',
      subKey: productId,
    };

    await this.cacheService.increment(viewKey);
    
    // Optionally sync to database periodically
    // This could be done via a scheduled job or event
  }

  private async checkActiveOrders(): Promise<boolean> {
    // Implement check for active orders
    // This would require access to order repository
    return false; // Placeholder
  }

  private async getTotalProducts(): Promise<number> {
    const result = await this.productRepository.findMany({
      page: 1,
      limit: 1,
      isActive: true,
    });
    return result.meta.total;
  }

  private async getLowStockCount(): Promise<number> {
    // Implement proper low stock query
    return 0; // Placeholder
  }

  private async getOutOfStockCount(): Promise<number> {
    // Implement proper out of stock query
    return 0; // Placeholder
  }

  private async getFeaturedCount(): Promise<number> {
    const result = await this.productRepository.findMany({
      page: 1,
      limit: 1,
      isFeatured: true,
    });
    return result.meta.total;
  }
}