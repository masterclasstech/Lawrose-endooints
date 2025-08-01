/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ProductVariantRepository } from '../repositories/product-variant.repository';
import { ProductRepository } from '../repositories/product.repository';
import { CloudinaryService  } from '.././../common/cloudinary/cloudinary';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ProductVariantService {
    constructor(
        private readonly variantRepository: ProductVariantRepository,
        private readonly productRepository: ProductRepository,
        private readonly cloudinaryService: CloudinaryService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async create(dto: CreateVariantDto) {
        // Validate product exists
        const product = await this.productRepository.findById(dto.productId);
        if (!product) {
        throw new NotFoundException('Product not found');
        }

        // Validate SKU uniqueness
        await this.validateSkuUniqueness(dto.sku);

        // Check for duplicate variant combination
        if (dto.color || dto.size) {
        const existing = await this.variantRepository.findByProductAndOptions(
            dto.productId,
            dto.color,
            dto.size,
        );
        
        if (existing) {
            throw new ConflictException(
            `Variant with color "${dto.color}" and size "${dto.size}" already exists`
            );
        }
        }

        // Process images if provided
        let processedImages = dto.images || [];
        if (dto.imageFiles?.length) {
        const uploadedImages = await this.cloudinaryService.uploadMultiple(
            dto.imageFiles,
            'variants',
        );
        processedImages = [...processedImages, ...uploadedImages.map(img => img.url)];
        }

        const variantData = {
        ...dto,
        images: processedImages,
        stockQuantity: dto.stockQuantity ?? 0,
        isActive: dto.isActive ?? true,
        product: { connect: { id: dto.productId } },
        };

        const variant = await this.variantRepository.create(variantData);

        // Update parent product stock if needed
        await this.updateProductStock(dto.productId);

        // Emit variant created event
        this.eventEmitter.emit('variant.created', { variant, product });

        return variant;
    }

    async findById(id: string) {
        const variant = await this.variantRepository.findById(id);
        if (!variant) {
        throw new NotFoundException('Variant not found');
        }

        return this.enrichVariantData(variant);
    }

    async findBySku(sku: string) {
        const variant = await this.variantRepository.findBySku(sku);
        if (!variant) {
        throw new NotFoundException('Variant not found');
        }

        return this.enrichVariantData(variant);
    }

    async findByProduct(productId: string) {
        // Validate product exists
        const product = await this.productRepository.findById(productId);
        if (!product) {
        throw new NotFoundException('Product not found');
        }

        const variants = await this.variantRepository.findByProduct(productId);
        return variants.map(variant => this.enrichVariantData(variant));
    }

    async findByProductAndOptions(productId: string, color?: string, size?: string) {
        const variant = await this.variantRepository.findByProductAndOptions(
        productId,
        color,
        size,
        );

        if (!variant) {
        throw new NotFoundException('Variant not found for the specified options');
        }

        return this.enrichVariantData(variant);
    }

    async update(id: string, dto: UpdateVariantDto) {
        const existingVariant = await this.variantRepository.findById(id);
        if (!existingVariant) {
        throw new NotFoundException('Variant not found');
        }

        const updateData = { ...dto };

        // Validate SKU uniqueness if changed
        if (dto.sku && dto.sku !== existingVariant.sku) {
        await this.validateSkuUniqueness(dto.sku);
        }

        // Check for duplicate variant combination if color/size changed
        if ((dto.color && dto.color !== existingVariant.color) || 
            (dto.size && dto.size !== existingVariant.size)) {
        const existing = await this.variantRepository.findByProductAndOptions(
            existingVariant.productId,
            dto.color ?? existingVariant.color,
            dto.size ?? existingVariant.size,
        );

        if (existing && existing.id !== id) {
            throw new ConflictException(
            `Variant with the specified color and size combination already exists`
            );
        }
        }

        // Process new images if provided
        if (dto.imageFiles?.length) {
        const uploadedImages = await this.cloudinaryService.uploadMultiple(
            dto.imageFiles,
            'variants',
        );
        const newImages = uploadedImages.map(img => img.url);
        
        updateData.images = dto.replaceImages 
            ? newImages 
            : [...(existingVariant.images || []), ...newImages];
        }

        const variant = await this.variantRepository.update(id, updateData);

        // Update parent product stock if stock quantity changed
        if (dto.stockQuantity !== undefined) {
        await this.updateProductStock(variant.productId);
        }

        // Emit variant updated event
        this.eventEmitter.emit('variant.updated', { 
        variant, 
        previousData: existingVariant 
        });

        return this.enrichVariantData(variant);
    }

    async delete(id: string) {
        const variant = await this.variantRepository.findById(id);
        if (!variant) {
        throw new NotFoundException('Variant not found');
        }

        // Check if variant has active orders
        const hasActiveOrders = await this.checkActiveOrders();
        if (hasActiveOrders) {
        throw new ConflictException(
            'Cannot delete variant with active orders. Consider deactivating instead.',
        );
        }

        await this.variantRepository.delete(id);

        // Clean up associated media files
        if (variant.images?.length) {
        await this.cloudinaryService.deleteMultiple(variant.images);
        }

        // Update parent product stock
        await this.updateProductStock(variant.productId);

        // Emit variant deleted event
        this.eventEmitter.emit('variant.deleted', { variant });

        return { message: 'Variant deleted successfully' };
    }

    async bulkCreate(variants: CreateVariantDto[]) {
        // Validate all products exist
        const productIds = [...new Set(variants.map(v => v.productId))];
        const products = await Promise.all(
        productIds.map(id => this.productRepository.findById(id)),
        );

        const notFoundProducts = products
        .map((product, index) => ({ product, id: productIds[index] }))
        .filter(({ product }) => !product)
        .map(({ id }) => id);

        if (notFoundProducts.length > 0) {
        throw new NotFoundException(`Products not found: ${notFoundProducts.join(', ')}`);
        }

        // Validate SKUs
        await Promise.all(
        variants.map(v => this.validateSkuUniqueness(v.sku)),
        );

        // Process all variants
        const processedVariants = variants.map(variant => ({
        ...variant,
        stockQuantity: variant.stockQuantity ?? 0,
        isActive: variant.isActive ?? true,
        images: variant.images || [],
        }));

        const count = await this.variantRepository.bulkCreate(processedVariants);

        // Update product stocks
        await Promise.all(
        productIds.map(productId => this.updateProductStock(productId)),
        );

        // Emit bulk created event
        this.eventEmitter.emit('variants.bulk.created', { count, productIds });

        return { created: count };
    }

    async bulkUpdateStock(updates: Array<{ id: string; stockQuantity: number }>) {
        // Validate all variants exist
        const variants = await Promise.all(
        updates.map(({ id }) => this.variantRepository.findById(id)),
        );

        const notFound = variants
        .map((variant, index) => ({ variant, index }))
        .filter(({ variant }) => !variant)
        .map(({ index }) => updates[index].id);

        if (notFound.length > 0) {
        throw new NotFoundException(`Variants not found: ${notFound.join(', ')}`);
        }

        const results = await this.variantRepository.bulkUpdateStock(updates);

        // Update product stocks
        const productIds = [...new Set(variants.map(v => v.productId))];
        await Promise.all(
        productIds.map(productId => this.updateProductStock(productId)),
        );

        // Emit stock updated events
        results.forEach((variant, index) => {
        this.eventEmitter.emit('variant.stock.updated', {
            variantId: variant.id,
            productId: variant.productId,
            oldStock: variants[index].stockQuantity,
            newStock: updates[index].stockQuantity,
        });
        });

        return results;
    }

    async getAvailableOptions(productId: string) {
        const product = await this.productRepository.findById(productId);
        if (!product) {
        throw new NotFoundException('Product not found');
        }

        return this.variantRepository.getAvailableOptions(productId);
    }

    async getVariantMatrix(productId: string) {
        const product = await this.productRepository.findById(productId);
        if (!product) {
        throw new NotFoundException('Product not found');
        }

        return this.variantRepository.getVariantMatrix(productId);
    }

    async getLowStockVariants(threshold = 5, limit = 50) {
        return this.variantRepository.getLowStockVariants(threshold, limit);
    }

    async toggleActive(id: string) {
        const variant = await this.variantRepository.findById(id);
        if (!variant) {
        throw new NotFoundException('Variant not found');
        }

        const updated = await this.variantRepository.update(id, {
        isActive: !variant.isActive,
        });

        // Update parent product stock
        await this.updateProductStock(variant.productId);

        return updated;
    }

    private async validateSkuUniqueness(sku: string): Promise<void> {
        const existing = await this.variantRepository.findBySku(sku);
        if (existing) {
        throw new ConflictException('SKU already exists');
        }
    }

    private enrichVariantData(variant: any) {
        const effectivePrice = variant.price ?? variant.product?.price ?? 0;
        const effectiveComparePrice = variant.comparePrice ?? variant.product?.comparePrice;
        
        const hasDiscount = effectiveComparePrice && effectiveComparePrice > effectivePrice;
        const discountPercentage = hasDiscount 
        ? Math.round(((effectiveComparePrice - effectivePrice) / effectiveComparePrice) * 100)
        : 0;

        const stockStatus = this.getStockStatus(variant.stockQuantity);

        return {
        ...variant,
        effectivePrice,
        effectiveComparePrice,
        hasDiscount,
        discountPercentage,
        savings: hasDiscount ? effectiveComparePrice - effectivePrice : 0,
        stockStatus,
        isInStock: variant.stockQuantity > 0,
        // Variant-specific identifier
        variantKey: `${variant.color || 'default'}-${variant.size || 'default'}`,
        };
    }

    private getStockStatus(quantity: number): string {
        if (quantity === 0) return 'OUT_OF_STOCK';
        if (quantity <= 5) return 'LOW_STOCK';
        return 'IN_STOCK';
    }

    private async updateProductStock(productId: string): Promise<void> {
        // Calculate total stock from all active variants
        const variants = await this.variantRepository.findByProduct(productId);
        const totalStock = variants
        .filter(v => v.isActive)
        .reduce((sum, variant) => sum + variant.stockQuantity, 0);

        // Update product stock
        await this.productRepository.update(productId, {
        stockQuantity: totalStock,
        });

        // Emit product stock updated event
        this.eventEmitter.emit('product.stock.calculated', {
        productId,
        totalStock,
        variantCount: variants.length,
        });
    }

    private async checkActiveOrders(): Promise<boolean> {
        // Check if variant has any active orders
        // This would require access to order repository
        return false; // Placeholder
    }
}