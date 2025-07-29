/* eslint-disable prettier/prettier */
// src/modules/product/repositories/product-variant.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { ProductVariant, Prisma } from '@prisma/client';

@Injectable()
export class ProductVariantRepository {
    private readonly CACHE_TTL = 300; // 5 minutes
    private readonly CACHE_PREFIX = 'variant:';

    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) {}

    async create(data: Prisma.ProductVariantCreateInput): Promise<ProductVariant> {
        const variant = await this.prisma.productVariant.create({
        data,
        include: this.getVariantInclude(),
        });

        // Invalidate related caches
        await this.invalidateVariantCaches(variant.productId);

        return variant;
    }

    async findById(id: string): Promise<ProductVariant | null> {
        const cacheKey = `${this.CACHE_PREFIX}id:${id}`;
        
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached as string);

        const variant = await this.prisma.productVariant.findUnique({
        where: { id },
        include: this.getVariantInclude(),
        });

        if (variant) {
        await this.cache.set(cacheKey, JSON.stringify(variant), { ttl: this.CACHE_TTL });
        }

        return variant;
    }

    async findBySku(sku: string): Promise<ProductVariant | null> {
        const cacheKey = `${this.CACHE_PREFIX}sku:${sku}`;
        
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached as string);

        const variant = await this.prisma.productVariant.findUnique({
        where: { sku },
        include: this.getVariantInclude(),
        });

        if (variant) {
        await this.cache.set(cacheKey, JSON.stringify(variant), { ttl: this.CACHE_TTL });
        }

        return variant;
    }

    async findByProduct(productId: string): Promise<ProductVariant[]> {
        const cacheKey = `${this.CACHE_PREFIX}product:${productId}`;
        
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached as string);

        const variants = await this.prisma.productVariant.findMany({
        where: { 
            productId,
            isActive: true,
        },
        include: this.getVariantInclude(),
        orderBy: [
            { color: 'asc' },
            { size: 'asc' },
        ],
        });

        await this.cache.set(cacheKey, JSON.stringify(variants), { ttl: this.CACHE_TTL });
        return variants;
    }

    async findByProductAndOptions(
        productId: string,
        color?: string,
        size?: string,
    ): Promise<ProductVariant | null> {
        const cacheKey = `${this.CACHE_PREFIX}options:${productId}:${color || 'null'}:${size || 'null'}`;
        
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached as string);

        const variant = await this.prisma.productVariant.findFirst({
        where: {
            productId,
            isActive: true,
            ...(color && { color: { equals: color as any } }),
            ...(size && { size: { equals: size as any } }),
        },
        include: this.getVariantInclude(),
        });

        if (variant) {
        await this.cache.set(cacheKey, JSON.stringify(variant), { ttl: this.CACHE_TTL });
        }

        return variant;
    }

    async update(id: string, data: Prisma.ProductVariantUpdateInput): Promise<ProductVariant> {
        const variant = await this.prisma.productVariant.update({
        where: { id },
        data,
        include: this.getVariantInclude(),
        });

        // Invalidate caches
        await this.invalidateVariantCaches(variant.productId, id);

        return variant;
    }

    async delete(id: string): Promise<ProductVariant> {
        const variant = await this.prisma.productVariant.findUnique({
        where: { id },
        select: { productId: true },
        });

        const deletedVariant = await this.prisma.productVariant.delete({
        where: { id },
        });

        if (variant) {
        await this.invalidateVariantCaches(variant.productId, id);
        }

        return deletedVariant;
    }

    async bulkCreate(variants: Prisma.ProductVariantCreateManyInput[]): Promise<number> {
        const result = await this.prisma.productVariant.createMany({
            data: variants,
            // skipDuplicates: true, // Skip duplicate entries (optionally enable if Prisma version supports it)
        });

        // Invalidate caches for all affected products
        const productIds = [...new Set(variants.map(v => v.productId))];
        await Promise.all(
            productIds.map(productId => this.invalidateVariantCaches(productId)),
        );

        return result.count;
    }

    async bulkUpdateStock(updates: Array<{ id: string; stockQuantity: number }>) {
        const operations = updates.map(({ id, stockQuantity }) =>
        this.prisma.productVariant.update({
            where: { id },
            data: { stockQuantity },
        }),
        );

        const results = await this.prisma.$transaction(operations);

        // Get affected product IDs and invalidate caches
        const variants = await this.prisma.productVariant.findMany({
        where: {
            id: { in: updates.map(u => u.id) },
        },
        select: { id: true, productId: true },
        });

        const productIds = [...new Set(variants.map(v => v.productId))];
        await Promise.all([
        ...productIds.map(productId => this.invalidateVariantCaches(productId)),
        ...variants.map(v => this.cache.del(`${this.CACHE_PREFIX}id:${v.id}`)),
        ]);

        return results;
    }

    async getAvailableOptions(productId: string) {
        const cacheKey = `${this.CACHE_PREFIX}options:${productId}`;
        
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached as string);

        const variants = await this.prisma.productVariant.findMany({
        where: {
            productId,
            isActive: true,
            stockQuantity: { gt: 0 },
        },
        select: {
            color: true,
            size: true,
        },
        });

        const options = {
        colors: [...new Set(variants.map(v => v.color).filter(Boolean))],
        sizes: [...new Set(variants.map(v => v.size).filter(Boolean))],
        };

        await this.cache.set(cacheKey, JSON.stringify(options), { ttl: this.CACHE_TTL });
        return options;
    }

    async getVariantMatrix(productId: string) {
        const variants = await this.findByProduct(productId);
        
        const matrix = variants.reduce((acc, variant) => {
        const key = `${variant.color || 'default'}-${variant.size || 'default'}`;
        acc[key] = {
            id: variant.id,
            sku: variant.sku,
            price: variant.price,
            stockQuantity: variant.stockQuantity,
            images: variant.images,
            isActive: variant.isActive,
        };
        return acc;
        }, {} as Record<string, any>);

        return matrix;
    }

    async getLowStockVariants(threshold = 5, limit = 50) {
        return this.prisma.productVariant.findMany({
        where: {
            stockQuantity: { lte: threshold },
            isActive: true,
        },
        include: {
            product: {
            select: {
                name: true,
                slug: true,
            },
            },
        },
        orderBy: { stockQuantity: 'asc' },
        take: limit,
        });
    }

    private getVariantInclude() {
        return {
        product: {
            select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            },
        },
        };
    }

    private async invalidateVariantCaches(productId: string, variantId?: string) {
        const patterns = [
        `${this.CACHE_PREFIX}product:${productId}`,
        `${this.CACHE_PREFIX}options:${productId}*`,
        ];

        if (variantId) {
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: variantId },
            select: { sku: true },
        });

        if (variant) {
            patterns.push(
            `${this.CACHE_PREFIX}id:${variantId}`,
            `${this.CACHE_PREFIX}sku:${variant.sku}`,
            );
        }
        }

        await Promise.all(patterns.map(pattern => this.cache.del(pattern)));
    }
}