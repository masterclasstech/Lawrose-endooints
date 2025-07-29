/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { Product, Prisma } from '@prisma/client';
import { ProductQueryDto } from '../dto/product-query.dto';

@Injectable()
export class ProductRepository {
    private readonly CACHE_TTL = 300; // 5 minutes
    private readonly CACHE_PREFIX = 'product:';

    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
    ) {}

    async create(data: Prisma.ProductCreateInput): Promise<Product> {
        const product = await this.prisma.product.create({
        data,
        include: this.getProductInclude(),
        });

        // Invalidate related caches
        await this.invalidateProductCaches(product.id);
        await this.cache.del(`${this.CACHE_PREFIX}list:*`);

        return product;
    }

    async findById(id: string): Promise<Product | null> {
        const cacheKey = `${this.CACHE_PREFIX}id:${id}`;
        
        // Try cache first
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached as string);

        const product = await this.prisma.product.findUnique({
        where: { id },
        include: this.getProductInclude(),
        });

        if (product) {
        await this.cache.set(cacheKey, JSON.stringify(product), { ttl: this.CACHE_TTL });
        }

        return product;
    }

    async findBySlug(slug: string): Promise<Product | null> {
        const cacheKey = `${this.CACHE_PREFIX}slug:${slug}`;
        
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached as string);

        const product = await this.prisma.product.findUnique({
        where: { slug },
        include: this.getProductInclude(),
        });

        if (product) {
        await this.cache.set(cacheKey, JSON.stringify(product), { ttl: this.CACHE_TTL });
        }

        return product;
    }

    async findMany(query: ProductQueryDto) {
        const {
        page = 1,
        limit = 12,
        search,
        categoryId,
        subcategoryId,
        collectionId,
        gender,
        minPrice,
        maxPrice,
        colors,
        sizes,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        isActive = true,
        isFeatured,
        } = query;

        const skip = (page - 1) * limit;
        const cacheKey = `${this.CACHE_PREFIX}list:${JSON.stringify(query)}`;
        
        // Try cache first for stable queries
        if (!search) {
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached as string);
        }

        // Build where clause
        const where: Prisma.ProductWhereInput = {
        isActive,
        ...(isFeatured !== undefined && { isFeatured }),
        ...(search && {
            OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { tags: { has: search } },
            ],
        }),
        ...(categoryId && { categoryId }),
        ...(subcategoryId && { subcategoryId }),
        ...(collectionId && { collectionId }),
        ...(gender && { gender }),
        ...(minPrice && { price: { gte: minPrice } }),
        ...(maxPrice && { price: { lte: maxPrice } }),
        ...(colors?.length && { colors: { hasSome: colors } }),
        ...(sizes?.length && { sizes: { hasSome: sizes } }),
        };

        // Build orderBy
        const orderBy = this.buildOrderBy(sortBy, sortOrder);

        // Execute queries in parallel
        const [products, total] = await Promise.all([
        this.prisma.product.findMany({
            where,
            include: this.getProductInclude(),
            orderBy,
            skip,
            take: limit,
        }),
        this.prisma.product.count({ where }),
        ]);

        const result = {
        data: products,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPreviousPage: page > 1,
        },
        };

        // Cache stable queries only
        if (!search) {
        await this.cache.set(cacheKey, JSON.stringify(result), { ttl: this.CACHE_TTL });
        }

        return result;
    }

    async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
        const product = await this.prisma.product.update({
        where: { id },
        data,
        include: this.getProductInclude(),
        });

        // Invalidate caches
        await this.invalidateProductCaches(id);
        await this.cache.del(`${this.CACHE_PREFIX}list:*`);

        return product;
    }

    async delete(id: string): Promise<Product> {
        const product = await this.prisma.product.delete({
        where: { id },
        });

        // Invalidate caches
        await this.invalidateProductCaches(id);
        await this.cache.del(`${this.CACHE_PREFIX}list:*`);

        return product;
    }

    async bulkUpdateStock(updates: Array<{ id: string; stockQuantity: number }>) {
        const operations = updates.map(({ id, stockQuantity }) =>
        this.prisma.product.update({
            where: { id },
            data: { stockQuantity },
        }),
        );

        const results = await this.prisma.$transaction(operations);

        // Invalidate relevant caches
        await Promise.all(
        updates.map(({ id }) => this.invalidateProductCaches(id)),
        );

        return results;
    }

    async findFeatured(limit = 8) {
        const cacheKey = `${this.CACHE_PREFIX}featured:${limit}`;
        
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached as string);

        const products = await this.prisma.product.findMany({
        where: {
            isActive: true,
            isFeatured: true,
        },
        include: this.getProductInclude(),
        orderBy: { createdAt: 'desc' },
        take: limit,
        });

        await this.cache.set(cacheKey, JSON.stringify(products), { ttl: this.CACHE_TTL });
        return products;
    }

    async findRelated(productId: string, categoryId: string, limit = 4) {
        const cacheKey = `${this.CACHE_PREFIX}related:${productId}:${limit}`;
        
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached as string);

        const products = await this.prisma.product.findMany({
        where: {
            id: { not: productId },
            categoryId,
            isActive: true,
        },
        include: this.getProductInclude(),
        orderBy: { createdAt: 'desc' },
        take: limit,
        });

        await this.cache.set(cacheKey, JSON.stringify(products), { ttl: this.CACHE_TTL });
        return products;
    }

    async searchSuggestions(query: string, limit = 5) {
        const products = await this.prisma.product.findMany({
        where: {
            OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { tags: { has: query } },
            ],
            isActive: true,
        },
        select: {
            id: true,
            name: true,
            slug: true,
            featuredImage: true,
            price: true,
        },
        take: limit,
        });

        return products;
    }

    async getUniqueFilters() {
        const cacheKey = `${this.CACHE_PREFIX}filters`;
        
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached as string);

        const [colors, sizes, priceRange] = await Promise.all([
        this.prisma.product.findMany({
            where: { isActive: true },
            select: { colors: true },
            distinct: ['colors'],
        }),
        this.prisma.product.findMany({
            where: { isActive: true },
            select: { sizes: true },
            distinct: ['sizes'],
        }),
        this.prisma.product.aggregate({
            where: { isActive: true },
            _min: { price: true },
            _max: { price: true },
        }),
        ]);

        const uniqueColors = [...new Set(colors.flatMap(p => p.colors))];
        const uniqueSizes = [...new Set(sizes.flatMap(p => p.sizes))];

        const filters = {
        colors: uniqueColors,
        sizes: uniqueSizes,
        priceRange: {
            min: priceRange._min.price || 0,
            max: priceRange._max.price || 1000,
        },
        };

        await this.cache.set(cacheKey, JSON.stringify(filters), { ttl: this.CACHE_TTL });
        return filters;
    }

    private getProductInclude(): Prisma.ProductInclude {
        return {
        category: {
            select: {
            id: true,
            name: true,
            slug: true,
            },
        },
        subcategory: {
            select: {
            id: true,
            name: true,
            slug: true,
            },
        },
        collection: {
            select: {
            id: true,
            name: true,
            slug: true,
            },
        },
        variants: {
            where: { isActive: true },
            orderBy: { createdAt: Prisma.SortOrder.asc },
        },
        _count: {
            select: {
            reviews: true,
            ratings: true,
            },
        },
        };
    }

    private buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc'): Prisma.ProductOrderByWithRelationInput {
        const order = sortOrder as Prisma.SortOrder;
        
        const orderMap: Record<string, Prisma.ProductOrderByWithRelationInput> = {
        name: { name: order },
        price: { price: order },
        createdAt: { createdAt: order },
        updatedAt: { updatedAt: order },
        popularity: { orderItems: { _count: order } },
        // Prisma does not support ordering by average rating directly; consider sorting in application code if needed
        // rating: { ratings: { _avg: { rating: order } } },
        };

        return orderMap[sortBy] || { createdAt: Prisma.SortOrder.desc };
    }

    private async invalidateProductCaches(productId: string) {
        const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { slug: true },
        });

        if (product) {
        await Promise.all([
            this.cache.del(`${this.CACHE_PREFIX}id:${productId}`),
            this.cache.del(`${this.CACHE_PREFIX}slug:${product.slug}`),
            this.cache.del(`${this.CACHE_PREFIX}featured:*`),
            this.cache.del(`${this.CACHE_PREFIX}related:*`),
            this.cache.del(`${this.CACHE_PREFIX}filters`),
        ]);
        }
    }
}