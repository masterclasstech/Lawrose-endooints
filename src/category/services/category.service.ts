/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryQueryDto } from '../dto/category-query.dto';
import { PaginatedResponseDto } from 'src/common/dto/response.dto';
import { generateSlug } from 'src/common/utils/slug.util';
import { Prisma, Category } from '@prisma/client';

export interface CategoryWithCounts extends Category {
  subcategoryCount?: number;
  productCount?: number;
  subcategories?: any[];
}

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  /**
   * Create a new category with optimized slug generation and image upload
   * Time Complexity: O(log n) for unique checks + O(1) for creation
   */
  async create(
    createCategoryDto: CreateCategoryDto, 
    imageFile?: Express.Multer.File
  ): Promise<Category> {
    const { name, slug: providedSlug, ...rest } = createCategoryDto;

    // Generate or validate slug - O(1) operation
    const slug = providedSlug || generateSlug(name);

    // Batch unique checks in single query - O(log n)
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug: slug }
        ]
      },
      select: { id: true, name: true, slug: true }
    });

    if (existingCategory) {
      if (existingCategory.name.toLowerCase() === name.toLowerCase()) {
        throw new ConflictException('Category with this name already exists');
      }
      if (existingCategory.slug === slug) {
        throw new ConflictException('Category with this slug already exists');
      }
    }

    // Handle image upload if provided
    let imageUrl: string | undefined;
    if (imageFile) {
      try {
        imageUrl = await this.cloudinaryService.uploadCategoryImage(
          imageFile.buffer,
          slug
        );
      } catch (error) {
        throw new BadRequestException(`Image upload failed: ${error.message}`);
      }
    }

    // Single database write - O(1)
    return this.prisma.category.create({
      data: {
        name,
        slug,
        ...(imageUrl && { imageUrl }),
        ...rest
      }
    });
  }

  /**
   * Find all categories with advanced filtering and pagination
   * Time Complexity: O(log n + k) where k is the result set size
   */
  async findAll(query: CategoryQueryDto): Promise<PaginatedResponseDto<CategoryWithCounts>> {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = 'sortOrder',
      sortOrder = 'asc',
      includeSubcategories = false,
      includeProductCount = false
    } = query;

    const skip = (page - 1) * limit;

    // Build optimized where clause
    const where: Prisma.CategoryWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Build optimized select clause based on requirements
    const select: Prisma.CategorySelect = {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      metaTitle: true,
      metaDescription: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      ...(includeSubcategories && {
        subcategories: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            sortOrder: true,
            isActive: true
          },
          orderBy: { sortOrder: 'asc' }
        }
      }),
      ...(includeProductCount && {
        _count: {
          select: {
            products: { where: { isActive: true } },
            subcategories: { where: { isActive: true } }
          }
        }
      })
    };

    // Execute optimized parallel queries - O(log n) each
    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        select,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      this.prisma.category.count({ where })
    ]);

    // Transform results if counts are included - O(k)
    const transformedCategories = categories.map(category => {
      if (includeProductCount && '_count' in category) {
        const { _count, ...rest } = category;
        return {
          ...rest,
          productCount: _count.products,
          subcategoryCount: _count.subcategories
        };
      }
      return category;
    }) as CategoryWithCounts[];

    const totalPages = Math.ceil(total / limit);

    return {
      data: transformedCategories,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  /**
   * Update category with optimized conflict checking and image handling
   * Time Complexity: O(log n) for checks + O(1) for update
   */
  async update(
    id: string, 
    updateCategoryDto: UpdateCategoryDto, 
    imageFile?: Express.Multer.File,
    removeImage?: boolean
  ): Promise<Category> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid category ID');
    }

    const { name, slug: providedSlug, ...rest } = updateCategoryDto;

    // Check if category exists - O(1)
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, imageUrl: true }
    });

    if (!existingCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Handle slug generation if name is updated
    const slug = providedSlug || (name ? generateSlug(name) : undefined);

    // Batch conflict checks if name or slug is being updated - O(log n)
    if (name || slug) {
      const conflicts = await this.prisma.category.findFirst({
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
          throw new ConflictException('Category with this name already exists');
        }
        if (slug && conflicts.slug === slug) {
          throw new ConflictException('Category with this slug already exists');
        }
      }
    }

    // Handle image operations
    let imageUrl: string | undefined | null;
    
    if (removeImage) {
      // Remove existing image from Cloudinary if it exists
      if (existingCategory.imageUrl) {
        try {
          const publicId = this.cloudinaryService.extractPublicId(existingCategory.imageUrl);
          await this.cloudinaryService.deleteImage(publicId);
        } catch (error) {
          // Log error but don't fail the update
          console.warn(`Failed to delete image from Cloudinary: ${error.message}`);
        }
      }
      imageUrl = null;
    } else if (imageFile) {
      // Upload new image
      try {
        const categorySlug = slug || existingCategory.slug;
        imageUrl = await this.cloudinaryService.uploadCategoryImage(
          imageFile.buffer,
          categorySlug
        );

        // Delete old image if it exists and new upload was successful
        if (existingCategory.imageUrl) {
          try {
            const oldPublicId = this.cloudinaryService.extractPublicId(existingCategory.imageUrl);
            await this.cloudinaryService.deleteImage(oldPublicId);
          } catch (error) {
            // Log error but don't fail the update
            console.warn(`Failed to delete old image from Cloudinary: ${error.message}`);
          }
        }
      } catch (error) {
        throw new BadRequestException(`Image upload failed: ${error.message}`);
      }
    }

    // Single database update - O(1)
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...rest
      }
    });
  }

  /**
   * Soft delete category with cascade check and image cleanup
   * Time Complexity: O(log n) for checks + O(1) for update
   */
  async remove(id: string): Promise<{ message: string }> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid category ID');
    }

    // Check existence and get related counts in single query - O(log n)
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        _count: {
          select: {
            subcategories: true,
            products: true
          }
        }
      }
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check for dependencies
    if (category._count.subcategories > 0) {
      throw new ConflictException(
        `Cannot delete category '${category.name}' because it has ${category._count.subcategories} subcategories`
      );
    }

    if (category._count.products > 0) {
      throw new ConflictException(
        `Cannot delete category '${category.name}' because it has ${category._count.products} products`
      );
    }

    // Perform soft delete - O(1)
    await this.prisma.category.update({
      where: { id },
      data: { isActive: false }
    });

    return { message: `Category '${category.name}' has been successfully deactivated` };
  }
       // Add to CategoryService
  async findBySlug(slug: string): Promise<CategoryWithCounts> {
    const category = await this.prisma.category.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        metaTitle: true,
        metaDescription: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        subcategories: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            sortOrder: true,
            isActive: true
          },
          orderBy: { sortOrder: 'asc' }
        },
      _count: {
          select: {
          products: { where: { isActive: true } },
          subcategories: { where: { isActive: true } }
        }
      }
    }
  });

  if (!category) {
    throw new NotFoundException(`Category with slug '${slug}' not found`);
  }

  // Transform _count to productCount and subcategoryCount
  const { _count, ...rest } = category as any;
  return {
    ...rest,
    productCount: _count?.products ?? 0,
    subcategoryCount: _count?.subcategories ?? 0
  };
}

async findOne(id: string, includeRelations = false): Promise<CategoryWithCounts> {
  const select: Prisma.CategorySelect = {
    id: true,
    name: true,
    slug: true,
    description: true,
    imageUrl: true,
    metaTitle: true,
    metaDescription: true,
    sortOrder: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    ...(includeRelations && {
      subcategories: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          sortOrder: true,
          isActive: true
        },
        orderBy: { sortOrder: 'asc' }
      },
      _count: {
        select: {
          products: { where: { isActive: true } },
          subcategories: { where: { isActive: true } }
        }
      }
    })
  };

  const category = await this.prisma.category.findUnique({
    where: { id },
    select
  });

  if (!category) {
    throw new NotFoundException(`Category with ID ${id} not found`);
  }

  if (includeRelations && '_count' in category) {
    const { _count, ...rest } = category as any;
    return {
      ...rest,
      productCount: _count?.products ?? 0,
      subcategoryCount: _count?.subcategories ?? 0
    };
  }

  return category as CategoryWithCounts;
}

  /**
   * Hard delete category with image cleanup
   * Time Complexity: O(1)
   */
  async hardDelete(id: string): Promise<{ message: string }> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { name: true, imageUrl: true }
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Delete image from Cloudinary if it exists
    if (category.imageUrl) {
      try {
        const publicId = this.cloudinaryService.extractPublicId(category.imageUrl);
        await this.cloudinaryService.deleteImage(publicId);
      } catch (error) {
        // Log error but don't fail the deletion
        console.warn(`Failed to delete image from Cloudinary: ${error.message}`);
      }
    }

    await this.prisma.category.delete({
      where: { id }
    });

    return { message: `Category '${category.name}' has been permanently deleted` };
  }

  /**
   * Bulk update sort orders for categories
   * Time Complexity: O(n) where n is the number of categories to update
   */
  async bulkUpdateSortOrder(updates: Array<{ id: string; sortOrder: number }>): Promise<{ updated: number }> {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new BadRequestException('Updates array cannot be empty');
    }

    // Validate all IDs exist before updating - O(log n * k)
    const existingIds = await this.prisma.category.findMany({
      where: { id: { in: updates.map(u => u.id) } },
      select: { id: true }
    });

    const existingIdSet = new Set(existingIds.map(c => c.id));
    const invalidIds = updates.filter(u => !existingIdSet.has(u.id));

    if (invalidIds.length > 0) {
      throw new NotFoundException(`Categories not found: ${invalidIds.map(u => u.id).join(', ')}`);
    }

    // Perform bulk update using transaction - O(n)
    await this.prisma.$transaction(
      updates.map(({ id, sortOrder }) =>
        this.prisma.category.update({
          where: { id },
          data: { sortOrder }
        })
      )
    );

    return { updated: updates.length };
  }

  /**
   * Get category statistics
   * Time Complexity: O(1) - uses database aggregation
   */
  async getStatistics(): Promise<{
    totalCategories: number;
    activeCategories: number;
    totalSubcategories: number;
    totalProducts: number;
  }> {
    const [categoryStats, subcategoryStats, productStats] = await Promise.all([
      this.prisma.category.aggregate({
        _count: {
          id: true
        },
        where: { isActive: true }
      }),
      this.prisma.category.aggregate({
        _count: {
          id: true
        }
      }),
      this.prisma.subcategory.count(),
      this.prisma.product.count({ where: { isActive: true } })
    ]);

    return {
      totalCategories: subcategoryStats._count.id,
      activeCategories: categoryStats._count.id,
      totalSubcategories: productStats,
      totalProducts: await this.prisma.product.count({ where: { isActive: true } })
    };
  }
}
