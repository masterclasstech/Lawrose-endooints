/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCollectionDto } from '../dto/create-collection.dto';
import { UpdateCollectionDto } from '../dto/update-collection.dto';
import { CollectionQueryDto } from '../dto/collection-query.dto';
import { PaginatedResponseDto } from 'src/common/dto/response.dto';
import { generateSlug } from 'src/common/utils/slug.util';
import { Prisma, Collection, Season } from '@prisma/client';

export interface CollectionWithCounts extends Collection {
  productCount?: number;
}

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new collection with validation
   * Time Complexity: O(log n) for checks + O(1) for creation
   */
  async create(createCollectionDto: CreateCollectionDto): Promise<Collection> {
    const { name, slug: providedSlug, startDate, endDate, ...rest } = createCollectionDto;

    // Validate date range - O(1)
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Generate slug - O(1)
    const slug = providedSlug || generateSlug(name);

    // Check for existing collection with same name or slug - O(log n)
    const existingCollection = await this.prisma.collection.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug: slug }
        ]
      },
      select: { id: true, name: true, slug: true }
    });

    if (existingCollection) {
      if (existingCollection.name.toLowerCase() === name.toLowerCase()) {
        throw new ConflictException('Collection with this name already exists');
      }
      if (existingCollection.slug === slug) {
        throw new ConflictException('Collection with this slug already exists');
      }
    }

    // Single database write with date conversion - O(1)
    return this.prisma.collection.create({
      data: {
        name,
        slug,
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...rest
      }
    });
  }

  /**
   * Find all collections with advanced filtering and optimization
   * Time Complexity: O(log n + k) where k is result set size
   */
  async findAll(query: CollectionQueryDto): Promise<PaginatedResponseDto<CollectionWithCounts>> {
    const {
      page = 1,
      limit = 10,
      search,
      year,
      season,
      isActive,
      isFeatured,
      sortBy = 'sortOrder',
      sortOrder = 'desc',
      includeProductCount = false
    } = query;

    const skip = (page - 1) * limit;

    // Build optimized where clause with date filtering
    const where: Prisma.CollectionWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(year && { year }),
      ...(season && { season }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Build optimized select clause
    const select: Prisma.CollectionSelect = {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      year: true,
      season: true,
      metaTitle: true,
      metaDescription: true,
      sortOrder: true,
      isActive: true,
      isFeatured: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      ...(includeProductCount && {
        _count: {
          select: {
            products: { where: { isActive: true } }
          }
        }
      })
    };

    // Execute parallel queries - O(log n) each
    const [collections, total] = await Promise.all([
      this.prisma.collection.findMany({
        where,
        select,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      this.prisma.collection.count({ where })
    ]);

    // Transform results - O(k)
    const transformedCollections = collections.map(collection => {
      if (includeProductCount && '_count' in collection) {
        const { _count, ...rest } = collection;
        return {
          ...rest,
          productCount: _count.products
        };
      }
      return collection;
    }) as CollectionWithCounts[];

    const totalPages = Math.ceil(total / limit);

    return {
      data: transformedCollections,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  /**
   * Find collection by ID with optimized includes
   * Time Complexity: O(log n)
   */
  async findOne(id: string, includeProducts: boolean = false): Promise<CollectionWithCounts> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid collection ID');
    }

    const select: Prisma.CollectionSelect = {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      year: true,
      season: true,
      metaTitle: true,
      metaDescription: true,
      sortOrder: true,
      isActive: true,
      isFeatured: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          products: { where: { isActive: true } }
        }
      },
      ...(includeProducts && {
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            featuredImage: true,
            stockQuantity: true,
            isActive: true,
            isFeatured: true
          },
          take: 20, // Limit to prevent large payload
          orderBy: { createdAt: 'desc' }
        }
      })
    };

    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    const { _count, ...rest } = collection;
    return {
      ...rest,
      productCount: _count.products
    };
  }

  /**
   * Find collection by slug with caching optimization
   * Time Complexity: O(log n)
   */
  async findBySlug(slug: string): Promise<CollectionWithCounts> {
    if (!slug || typeof slug !== 'string') {
      throw new BadRequestException('Invalid collection slug');
    }

    const collection = await this.prisma.collection.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        year: true,
        season: true,
        metaTitle: true,
        metaDescription: true,
        sortOrder: true,
        isActive: true,
        isFeatured: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: { where: { isActive: true } }
          }
        }
      }
    });

    if (!collection) {
      throw new NotFoundException(`Collection with slug '${slug}' not found`);
    }

    const { _count, ...rest } = collection;
    return {
      ...rest,
      productCount: _count.products
    };
  }

  /**
   * Get featured collections with optimization
   * Time Complexity: O(log n + k)
   */
  async getFeaturedCollections(limit: number = 10): Promise<CollectionWithCounts[]> {
    const collections = await this.prisma.collection.findMany({
      where: {
        isActive: true,
        isFeatured: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        year: true,
        season: true,
        sortOrder: true,
        isActive: true,
        isFeatured: true,
        startDate: true,
        endDate: true,
        metaTitle: true,
        metaDescription: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: { where: { isActive: true } }
          }
        }
      },
      take: limit,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return collections.map(collection => {
      const { _count, ...rest } = collection;
      return {
        ...rest,
        metaTitle: collection.metaTitle,
        metaDescription: collection.metaDescription,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        productCount: _count.products
      };
    });
  }

  /**
   * Get current active collections based on date range
   * Time Complexity: O(log n + k)
   */
  async getCurrentCollections(): Promise<CollectionWithCounts[]> {
    const now = new Date();

    const collections = await this.prisma.collection.findMany({
      where: {
        isActive: true,
        OR: [
          {
            AND: [
              { startDate: { lte: now } },
              { endDate: { gte: now } }
            ]
          },
          {
            AND: [
              { startDate: null },
              { endDate: null }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        year: true,
        season: true,
        sortOrder: true,
        isActive: true,
        isFeatured: true,
        startDate: true,
        endDate: true,
        metaTitle: true,
        metaDescription: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: { where: { isActive: true } }
          }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return collections.map(collection => {
      const { _count, ...rest } = collection;
      return {
        ...rest,
        metaTitle: collection.metaTitle,
        metaDescription: collection.metaDescription,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        productCount: _count.products
      };
    });
  }

  /**
   * Update collection with conflict checking and date validation
   * Time Complexity: O(log n) for checks + O(1) for update
   */
  async update(id: string, updateCollectionDto: UpdateCollectionDto): Promise<Collection> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid collection ID');
    }

    const { name, slug: providedSlug, startDate, endDate, ...rest } = updateCollectionDto;

    // Validate date range if both dates are provided - O(1)
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check if collection exists - O(log n)
    const existingCollection = await this.prisma.collection.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true }
    });

    if (!existingCollection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    // Handle slug generation
    const slug = providedSlug || (name ? generateSlug(name) : undefined);

    // Check for conflicts - O(log n)
    if (name || slug) {
      const conflicts = await this.prisma.collection.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(name ? [{ name: { equals: name, mode: Prisma.QueryMode.insensitive } }] : []),
                ...(slug ? [{ slug }] : [])
              ]
            }
          ]
        },
        select: { name: true, slug: true }
      });

      if (conflicts) {
        if (name && conflicts.name.toLowerCase() === name.toLowerCase()) {
          throw new ConflictException('Collection with this name already exists');
        }
        if (slug && conflicts.slug === slug) {
          throw new ConflictException('Collection with this slug already exists');
        }
      }
    }

    // Single database update with date conversion - O(1)
    return this.prisma.collection.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...rest
      }
    });
  }

  /**
   * Soft delete collection with dependency check
   * Time Complexity: O(log n) for checks + O(1) for update
   */
  async remove(id: string): Promise<{ message: string }> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid collection ID');
    }

    // Check existence and dependencies - O(log n)
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    if (collection._count.products > 0) {
      throw new ConflictException(
        `Cannot delete collection '${collection.name}' because it has ${collection._count.products} products`
      );
    }

    // Soft delete - O(1)
    await this.prisma.collection.update({
      where: { id },
      data: { isActive: false }
    });

    return { message: `Collection '${collection.name}' has been successfully deactivated` };
  }

  /**
   * Hard delete collection (admin only)
   * Time Complexity: O(1)
   */
  async hardDelete(id: string): Promise<{ message: string }> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid collection ID');
    }

    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select: { name: true }
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    await this.prisma.collection.delete({
      where: { id }
    });

    return { message: `Collection '${collection.name}' has been permanently deleted` };
  }

  /**
   * Bulk update sort orders for collections
   * Time Complexity: O(n) where n is the number of collections to update
   */
  async bulkUpdateSortOrder(updates: Array<{ id: string; sortOrder: number }>): Promise<{ updated: number }> {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new BadRequestException('Updates array cannot be empty');
    }

    // Validate all IDs exist before updating - O(log n * k)
    const existingIds = await this.prisma.collection.findMany({
      where: { id: { in: updates.map(u => u.id) } },
      select: { id: true }
    });

    const existingIdSet = new Set(existingIds.map(c => c.id));
    const invalidIds = updates.filter(u => !existingIdSet.has(u.id));

    if (invalidIds.length > 0) {
      throw new NotFoundException(`Collections not found: ${invalidIds.map(u => u.id).join(', ')}`);
    }

    // Perform bulk update using transaction - O(n)
    await this.prisma.$transaction(
      updates.map(({ id, sortOrder }) =>
        this.prisma.collection.update({
          where: { id },
          data: { sortOrder }
        })
      )
    );

    return { updated: updates.length };
  }

  /**
   * Toggle featured status for collections
   * Time Complexity: O(1)
   */
  async toggleFeatured(id: string): Promise<Collection> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid collection ID');
    }

    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select: { id: true, isFeatured: true }
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    return this.prisma.collection.update({
      where: { id },
      data: { isFeatured: !collection.isFeatured }
    });
  }

  /**
   * Get collections by season with optimization
   * Time Complexity: O(log n + k)
   */
  async findBySeason(season: Season, year?: number): Promise<CollectionWithCounts[]> {
    const where: Prisma.CollectionWhereInput = {
      isActive: true,
      season,
      ...(year && { year })
    };

    const collections = await this.prisma.collection.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        year: true,
        season: true,
        sortOrder: true,
        isActive: true,
        isFeatured: true,
        startDate: true,
        endDate: true,
        metaTitle: true,
        metaDescription: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: { where: { isActive: true } }
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { sortOrder: 'asc' }
      ]
    });

    return collections.map(collection => {
      const { _count, ...rest } = collection;
      return {
        ...rest,
        productCount: _count.products
      };
    });
  }

  /**
   * Get collection statistics with aggregation
   * Time Complexity: O(1) - uses database aggregation
   */
  async getStatistics(): Promise<{
    totalCollections: number;
    activeCollections: number;
    featuredCollections: number;
    currentYearCollections: number;
    totalProducts: number;
  }> {
    const currentYear = new Date().getFullYear();

    const [
      totalCollections,
      activeCollections,
      featuredCollections,
      currentYearCollections,
      totalProducts
    ] = await Promise.all([
      this.prisma.collection.count(),
      this.prisma.collection.count({ where: { isActive: true } }),
      this.prisma.collection.count({ where: { isActive: true, isFeatured: true } }),
      this.prisma.collection.count({ where: { isActive: true, year: currentYear } }),
      this.prisma.product.count({ where: { isActive: true, collectionId: { not: null } } })
    ]);

    return {
      totalCollections,
      activeCollections,
      featuredCollections,
      currentYearCollections,
      totalProducts
    };
  }

  /**
   * Archive old collections based on end date
   * Time Complexity: O(k) where k is the number of expired collections
   */
  async archiveExpiredCollections(): Promise<{ archived: number }> {
    const now = new Date();

    const result = await this.prisma.collection.updateMany({
      where: {
        isActive: true,
        endDate: {
          lt: now
        }
      },
      data: {
        isActive: false
      }
    });

    return { archived: result.count };
  }
}